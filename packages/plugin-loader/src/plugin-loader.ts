/**
 * ALTER EGO OS — Plugin Loader Implementation
 *
 * Manages dynamic loading, registration, and lifecycle of all agent plugins.
 * This is what makes ALTER EGO OS extensible without modifying the kernel.
 *
 * Key design decisions:
 * - Dependency validation: plugins with dependencies can only be loaded
 *   after their dependencies are loaded
 * - In-memory storage for Phase 1
 * - EventBus integration for plugin lifecycle events
 * - Graceful load/unload with error handling
 * - Health checking for loaded plugins
 */

import type {
  PluginId,
  PluginStatus,
  PluginManifest,
  Plugin,
  PluginContext,
  PluginInitializer,
  PluginRegistryEntry,
  PluginHealthStatus,
  PluginLoaderHealth,
  PluginFilter,
} from './types.js';

// ─── Default Plugin Context ──────────────────────────────────

const DEFAULT_CONTEXT: PluginContext = {
  eventBus: null,
  memory: null,
  knowledge: null,
  logger: {
    info: (msg: string, ...args: unknown[]) => console.log(`[PluginLoader] INFO: ${msg}`, ...args),
    warn: (msg: string, ...args: unknown[]) => console.warn(`[PluginLoader] WARN: ${msg}`, ...args),
    error: (msg: string, ...args: unknown[]) => console.error(`[PluginLoader] ERROR: ${msg}`, ...args),
    debug: (msg: string, ...args: unknown[]) => {},
  },
  config: {},
};

// ─── EventBus Interface ──────────────────────────────────────

export interface PluginLoaderEventBus {
  emit<T = unknown>(options: {
    type: string;
    payload: T;
    source: string;
  }): Promise<number>;
}

// ─── Plugin Loader Implementation ────────────────────────────

export class PluginLoader {
  private readonly registry: Map<PluginId, PluginRegistryEntry> = new Map();
  private context: PluginContext;
  private eventBus?: PluginLoaderEventBus;

  constructor(options?: {
    context?: Partial<PluginContext>;
    eventBus?: PluginLoaderEventBus;
  }) {
    this.context = {
      ...DEFAULT_CONTEXT,
      ...options?.context,
    };
    this.eventBus = options?.eventBus;
  }

  // ─── Registration ─────────────────────────────────────

  /**
   * Register a plugin with its manifest and initializer function.
   * The plugin starts in the 'registered' status.
   * Throws if a plugin with the same ID is already registered.
   */
  register(manifest: PluginManifest, initializer: PluginInitializer): void {
    if (this.registry.has(manifest.id)) {
      throw new Error(`Plugin already registered: ${manifest.id}`);
    }

    const plugin: Plugin = {
      manifest,
      status: 'registered',
    };

    this.registry.set(manifest.id, {
      manifest,
      initializer,
      plugin,
    });

    void this.emitEvent('plugin.registered', { pluginId: manifest.id });
  }

  /**
   * Unregister a plugin.
   * If the plugin is loaded, it will be unloaded first.
   */
  async unregister(pluginId: PluginId): Promise<void> {
    const entry = this.registry.get(pluginId);
    if (!entry) {
      throw new Error(`Plugin not found: ${pluginId}`);
    }

    // Unload if currently loaded
    if (entry.plugin.status === 'loaded' || entry.plugin.status === 'active') {
      await this.unload(pluginId);
    }

    this.registry.delete(pluginId);

    void this.emitEvent('plugin.unregistered', { pluginId });
  }

  // ─── Loading / Unloading ─────────────────────────────

  /**
   * Load and initialize a plugin.
   * Validates that all dependencies are loaded before proceeding.
   * Calls the initializer with the PluginContext.
   */
  async load(pluginId: PluginId): Promise<void> {
    const entry = this.registry.get(pluginId);
    if (!entry) {
      throw new Error(`Plugin not found: ${pluginId}`);
    }

    // Check if already loaded
    if (entry.plugin.status === 'loaded' || entry.plugin.status === 'active') {
      throw new Error(`Plugin already loaded: ${pluginId}`);
    }

    // Validate dependencies
    const depError = this.validateDependencies(entry.manifest);
    if (depError) {
      entry.plugin.status = 'error';
      entry.plugin.error = depError;
      void this.emitEvent('plugin.error', { pluginId, error: depError });
      throw new Error(depError);
    }

    // Initialize the plugin
    try {
      const pluginContext = this.buildPluginContext(entry.manifest);
      const instance = await entry.initializer(pluginContext);

      entry.plugin.status = 'loaded';
      entry.plugin.instance = instance;
      entry.plugin.loadedAt = new Date().toISOString();
      entry.plugin.error = undefined;

      void this.emitEvent('plugin.loaded', { pluginId });
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      entry.plugin.status = 'error';
      entry.plugin.error = message;

      void this.emitEvent('plugin.error', { pluginId, error: message });
      throw new Error(`Failed to load plugin ${pluginId}: ${message}`);
    }
  }

  /**
   * Gracefully shut down a plugin.
   * If the plugin instance has a `dispose` or `destroy` method, it will be called.
   */
  async unload(pluginId: PluginId): Promise<void> {
    const entry = this.registry.get(pluginId);
    if (!entry) {
      throw new Error(`Plugin not found: ${pluginId}`);
    }

    if (entry.plugin.status !== 'loaded' && entry.plugin.status !== 'active' && entry.plugin.status !== 'error') {
      throw new Error(`Cannot unload plugin in status: ${entry.plugin.status}`);
    }

    // Call dispose/destroy if available
    const instance = entry.plugin.instance as Record<string, unknown> | undefined;
    if (instance) {
      try {
        if (typeof instance.dispose === 'function') {
          await (instance.dispose as () => Promise<void>)();
        } else if (typeof instance.destroy === 'function') {
          await (instance.destroy as () => Promise<void>)();
        }
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        entry.plugin.status = 'error';
        entry.plugin.error = `Error during unload: ${message}`;
        void this.emitEvent('plugin.error', { pluginId, error: message });
      }
    }

    entry.plugin.status = 'unloaded';
    entry.plugin.instance = undefined;
    entry.plugin.loadedAt = undefined;

    void this.emitEvent('plugin.unloaded', { pluginId });
  }

  /**
   * Reload a plugin (unload then load again).
   */
  async reload(pluginId: PluginId): Promise<void> {
    const entry = this.registry.get(pluginId);
    if (!entry) {
      throw new Error(`Plugin not found: ${pluginId}`);
    }

    const wasLoaded = entry.plugin.status === 'loaded' || entry.plugin.status === 'active';

    if (wasLoaded) {
      await this.unload(pluginId);
    }

    await this.load(pluginId);
  }

  // ─── Access ───────────────────────────────────────────

  /**
   * Get a plugin instance.
   * Returns undefined if the plugin is not loaded.
   */
  get<T = unknown>(pluginId: PluginId): T | undefined {
    const entry = this.registry.get(pluginId);
    if (!entry || !entry.plugin.instance) {
      return undefined;
    }
    return entry.plugin.instance as T;
  }

  /**
   * Get the status of a plugin.
   */
  getStatus(pluginId: PluginId): PluginStatus | undefined {
    const entry = this.registry.get(pluginId);
    return entry?.plugin.status;
  }

  /**
   * List all plugins, optionally filtered.
   */
  list(filter?: PluginFilter): Plugin[] {
    let entries = Array.from(this.registry.values());

    if (filter) {
      if (filter.type) {
        entries = entries.filter((e) => e.manifest.type === filter.type);
      }
      if (filter.status) {
        entries = entries.filter((e) => e.plugin.status === filter.status);
      }
      if (filter.capability) {
        entries = entries.filter((e) =>
          e.manifest.capabilities.includes(filter.capability!)
        );
      }
    }

    return entries.map((e) => ({ ...e.plugin }));
  }

  /**
   * Find plugins that have a specific capability.
   */
  getPluginsByCapability(capability: string): Plugin[] {
    return this.list({ capability });
  }

  // ─── Context Management ───────────────────────────────

  /**
   * Set the shared PluginContext.
   * This affects all subsequently loaded plugins.
   */
  setContext(context: Partial<PluginContext>): void {
    this.context = { ...this.context, ...context };
  }

  // ─── Health Check ─────────────────────────────────────

  /**
   * Check the health of all loaded plugins.
   * If a plugin instance has a `healthCheck` method, it will be called.
   */
  async healthCheck(): Promise<PluginLoaderHealth> {
    const details: PluginHealthStatus[] = [];
    let healthy = 0;
    let degraded = 0;
    let unhealthy = 0;
    let loadedCount = 0;

    for (const entry of this.registry.values()) {
      if (entry.plugin.status !== 'loaded' && entry.plugin.status !== 'active') {
        continue;
      }

      loadedCount++;

      const healthStatus: PluginHealthStatus = {
        pluginId: entry.manifest.id,
        status: 'healthy',
        checkedAt: new Date().toISOString(),
      };

      try {
        const instance = entry.plugin.instance as Record<string, unknown> | undefined;
        if (instance && typeof instance.healthCheck === 'function') {
          const result = await (instance.healthCheck as () => Promise<{ status: string; message?: string }>)();
          if (result.status === 'healthy') {
            healthStatus.status = 'healthy';
            healthy++;
          } else if (result.status === 'degraded') {
            healthStatus.status = 'degraded';
            healthStatus.message = result.message;
            degraded++;
          } else {
            healthStatus.status = 'unhealthy';
            healthStatus.message = result.message;
            unhealthy++;
          }
        } else {
          // No healthCheck method — assume healthy
          healthy++;
        }
      } catch (error) {
        healthStatus.status = 'unhealthy';
        healthStatus.message = error instanceof Error ? error.message : String(error);
        unhealthy++;
      }

      details.push(healthStatus);
    }

    return {
      totalPlugins: this.registry.size,
      loadedPlugins: loadedCount,
      healthy,
      degraded,
      unhealthy,
      details,
    };
  }

  // ─── Private Methods ──────────────────────────────────

  /**
   * Validate that all dependencies for a plugin are loaded.
   * Returns an error message if validation fails, or null if it passes.
   */
  private validateDependencies(manifest: PluginManifest): string | null {
    if (!manifest.dependencies || manifest.dependencies.length === 0) {
      return null;
    }

    const missing: string[] = [];
    const notLoaded: string[] = [];

    for (const depId of manifest.dependencies) {
      const depEntry = this.registry.get(depId);

      if (!depEntry) {
        missing.push(depId);
        continue;
      }

      if (depEntry.plugin.status !== 'loaded' && depEntry.plugin.status !== 'active') {
        notLoaded.push(depId);
      }
    }

    if (missing.length > 0) {
      return `Missing dependencies: ${missing.join(', ')}`;
    }

    if (notLoaded.length > 0) {
      return `Dependencies not yet loaded: ${notLoaded.join(', ')}`;
    }

    return null;
  }

  /**
   * Build a PluginContext for a specific plugin,
   * merging the shared context with plugin-specific config.
   */
  private buildPluginContext(manifest: PluginManifest): PluginContext {
    return {
      eventBus: this.context.eventBus,
      memory: this.context.memory,
      knowledge: this.context.knowledge,
      logger: this.context.logger,
      config: {
        ...this.context.config,
        ...manifest.config,
      },
    };
  }

  private async emitEvent<T>(type: string, payload: T): Promise<void> {
    if (this.eventBus) {
      await this.eventBus.emit({
        type,
        payload,
        source: 'plugin-loader',
      });
    }
  }
}
