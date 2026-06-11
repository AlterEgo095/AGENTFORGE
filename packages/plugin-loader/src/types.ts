/**
 * ALTER EGO OS — Plugin Loader Types
 *
 * Core type definitions for the dynamic plugin system.
 * The Plugin Loader manages registration, loading, and lifecycle of all
 * agent plugins — making ALTER EGO OS extensible without modifying the kernel.
 */

// ─── Identifiers ─────────────────────────────────────────────

/** Unique identifier for a plugin */
export type PluginId = string;

// ─── Plugin Status ───────────────────────────────────────────

/** Lifecycle status of a plugin */
export type PluginStatus = 'registered' | 'loaded' | 'active' | 'error' | 'unloaded';

// ─── Plugin Manifest ─────────────────────────────────────────

/** Plugin type classification */
export type PluginType = 'agent' | 'skill' | 'worker' | 'connector';

/** Manifest describing a plugin's identity and requirements */
export interface PluginManifest {
  /** Unique plugin identifier */
  id: PluginId;
  /** Human-readable plugin name */
  name: string;
  /** Semantic version (e.g., "1.0.0") */
  version: string;
  /** Plugin description */
  description: string;
  /** Plugin type classification */
  type: PluginType;
  /** Capabilities this plugin provides */
  capabilities: string[];
  /** IDs of plugins that must be loaded before this one */
  dependencies?: PluginId[];
  /** Plugin-specific configuration */
  config?: Record<string, unknown>;
}

// ─── Plugin Instance ─────────────────────────────────────────

/** A registered plugin with its current state */
export interface Plugin {
  /** The plugin manifest */
  manifest: PluginManifest;
  /** Current plugin status */
  status: PluginStatus;
  /** The actual plugin instance (set after loading) */
  instance?: unknown;
  /** When the plugin was loaded */
  loadedAt?: string;
  /** Error message if the plugin is in error state */
  error?: string;
}

// ─── Plugin Context ──────────────────────────────────────────

/**
 * Context provided to a plugin during initialization.
 * This is the dependency injection point — plugins receive shared
 * services through this context rather than importing them directly.
 */
export interface PluginContext {
  /** Event bus for inter-plugin communication */
  eventBus: unknown;
  /** Memory store for short-term memory */
  memory: unknown;
  /** Knowledge store for long-term knowledge */
  knowledge: unknown;
  /** Logger for structured logging */
  logger: unknown;
  /** Plugin-specific configuration */
  config: Record<string, unknown>;
}

// ─── Plugin Initializer ──────────────────────────────────────

/**
 * Function that initializes a plugin.
 * Called during the load phase with the PluginContext.
 * Should return the plugin instance.
 */
export type PluginInitializer = (context: PluginContext) => Promise<unknown>;

// ─── Plugin Registry Entry ───────────────────────────────────

/** Internal registry entry for a plugin */
export interface PluginRegistryEntry {
  manifest: PluginManifest;
  initializer: PluginInitializer;
  plugin: Plugin;
}

// ─── Health Check ────────────────────────────────────────────

/** Health check result for a plugin */
export interface PluginHealthStatus {
  pluginId: PluginId;
  status: 'healthy' | 'degraded' | 'unhealthy';
  message?: string;
  checkedAt: string;
}

/** Overall health check result */
export interface PluginLoaderHealth {
  totalPlugins: number;
  loadedPlugins: number;
  healthy: number;
  degraded: number;
  unhealthy: number;
  details: PluginHealthStatus[];
}

// ─── List Filter ─────────────────────────────────────────────

/** Filter criteria for listing plugins */
export interface PluginFilter {
  type?: PluginType;
  status?: PluginStatus;
  capability?: string;
}

// ─── Events ──────────────────────────────────────────────────

/** Events emitted by the Plugin Loader */
export interface PluginLoaderEvents {
  'plugin.registered': { pluginId: PluginId };
  'plugin.unregistered': { pluginId: PluginId };
  'plugin.loaded': { pluginId: PluginId };
  'plugin.unloaded': { pluginId: PluginId };
  'plugin.error': { pluginId: PluginId; error: string };
}
