/**
 * ALTER EGO OS — Plugin Loader Tests
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { PluginLoader } from '../index.js';
import type {
  PluginManifest,
  PluginInitializer,
  PluginContext,
  Plugin,
} from '../index.js';

// ─── Mock EventBus ───────────────────────────────────────────

function createMockEventBus() {
  const events: { type: string; payload: unknown }[] = [];
  return {
    events,
    async emit<T>(options: { type: string; payload: T; source: string }): Promise<number> {
      events.push({ type: options.type, payload: options.payload });
      return 1;
    },
  };
}

// ─── Test Plugin Manifests ───────────────────────────────────

const AGENT_MANIFEST: PluginManifest = {
  id: 'agent-test',
  name: 'Test Agent',
  version: '1.0.0',
  description: 'A test agent plugin',
  type: 'agent',
  capabilities: ['code-generation', 'analysis'],
};

const SKILL_MANIFEST: PluginManifest = {
  id: 'skill-test',
  name: 'Test Skill',
  version: '1.0.0',
  description: 'A test skill plugin',
  type: 'skill',
  capabilities: ['translation'],
};

const WORKER_MANIFEST: PluginManifest = {
  id: 'worker-test',
  name: 'Test Worker',
  version: '1.0.0',
  description: 'A test worker plugin',
  type: 'worker',
  capabilities: ['background-processing'],
  dependencies: ['agent-test'],
};

const CONNECTOR_MANIFEST: PluginManifest = {
  id: 'connector-test',
  name: 'Test Connector',
  version: '1.0.0',
  description: 'A test connector plugin',
  type: 'connector',
  capabilities: ['api-integration'],
  dependencies: ['agent-test', 'skill-test'],
};

// ─── Test Initializers ───────────────────────────────────────

function createSuccessInitializer(extra?: Record<string, unknown>): PluginInitializer {
  return async (context: PluginContext) => ({
    initialized: true,
    context,
    ...extra,
  });
}

function createFailingInitializer(errorMessage: string): PluginInitializer {
  return async (_context: PluginContext) => {
    throw new Error(errorMessage);
  };
}

function createHealthCheckInitializer(
  healthStatus: 'healthy' | 'degraded' | 'unhealthy',
  message?: string
): PluginInitializer {
  return async (_context: PluginContext) => ({
    healthCheck: async () => ({ status: healthStatus, message }),
  });
}

function createDisposableInitializer(): PluginInitializer {
  return async (_context: PluginContext) => {
    const instance = {
      disposed: false,
      async dispose(): Promise<void> {
        instance.disposed = true;
      },
    };
    return instance;
  };
}

// ─── Tests ───────────────────────────────────────────────────

describe('PluginLoader', () => {
  let loader: PluginLoader;

  beforeEach(() => {
    loader = new PluginLoader();
  });

  // ─── Registration ─────────────────────────────────────

  describe('register', () => {
    it('should register a plugin with registered status', () => {
      loader.register(AGENT_MANIFEST, createSuccessInitializer());

      expect(loader.getStatus('agent-test')).toBe('registered');
    });

    it('should throw if a plugin with the same ID is already registered', () => {
      loader.register(AGENT_MANIFEST, createSuccessInitializer());

      expect(() =>
        loader.register(AGENT_MANIFEST, createSuccessInitializer())
      ).toThrow('Plugin already registered: agent-test');
    });
  });

  describe('unregister', () => {
    it('should unregister a registered plugin', async () => {
      loader.register(AGENT_MANIFEST, createSuccessInitializer());
      await loader.unregister('agent-test');

      expect(loader.getStatus('agent-test')).toBeUndefined();
    });

    it('should unload a loaded plugin before unregistering', async () => {
      loader.register(AGENT_MANIFEST, createDisposableInitializer());
      await loader.load('agent-test');
      await loader.unregister('agent-test');

      expect(loader.getStatus('agent-test')).toBeUndefined();
    });

    it('should throw if plugin not found', async () => {
      await expect(loader.unregister('nonexistent')).rejects.toThrow(
        'Plugin not found: nonexistent'
      );
    });
  });

  // ─── Loading ──────────────────────────────────────────

  describe('load', () => {
    it('should load a registered plugin', async () => {
      loader.register(AGENT_MANIFEST, createSuccessInitializer());
      await loader.load('agent-test');

      expect(loader.getStatus('agent-test')).toBe('loaded');
    });

    it('should provide the plugin context to the initializer', async () => {
      let receivedContext: PluginContext | undefined;

      loader.register(AGENT_MANIFEST, async (context) => {
        receivedContext = context;
        return { initialized: true };
      });

      await loader.load('agent-test');

      expect(receivedContext).toBeDefined();
      expect(receivedContext!.config).toBeDefined();
      expect(receivedContext!.logger).toBeDefined();
    });

    it('should store the plugin instance', async () => {
      loader.register(AGENT_MANIFEST, createSuccessInitializer({ custom: 'data' }));
      await loader.load('agent-test');

      const instance = loader.get('agent-test');
      expect(instance).toBeDefined();
      expect((instance as Record<string, unknown>).custom).toBe('data');
    });

    it('should throw if plugin is not registered', async () => {
      await expect(loader.load('nonexistent')).rejects.toThrow(
        'Plugin not found: nonexistent'
      );
    });

    it('should throw if plugin is already loaded', async () => {
      loader.register(AGENT_MANIFEST, createSuccessInitializer());
      await loader.load('agent-test');

      await expect(loader.load('agent-test')).rejects.toThrow(
        'Plugin already loaded: agent-test'
      );
    });

    it('should set error status if initializer fails', async () => {
      loader.register(AGENT_MANIFEST, createFailingInitializer('Init failed'));

      await expect(loader.load('agent-test')).rejects.toThrow(
        'Failed to load plugin agent-test: Init failed'
      );

      expect(loader.getStatus('agent-test')).toBe('error');
    });

    it('should set loadedAt timestamp', async () => {
      loader.register(AGENT_MANIFEST, createSuccessInitializer());
      await loader.load('agent-test');

      const plugins = loader.list();
      const plugin = plugins.find((p) => p.manifest.id === 'agent-test');
      expect(plugin!.loadedAt).toBeDefined();
      expect(new Date(plugin!.loadedAt!).getTime()).not.toBeNaN();
    });
  });

  // ─── Dependency Validation ────────────────────────────

  describe('dependency validation', () => {
    it('should load a plugin with no dependencies', async () => {
      loader.register(AGENT_MANIFEST, createSuccessInitializer());
      await loader.load('agent-test');

      expect(loader.getStatus('agent-test')).toBe('loaded');
    });

    it('should load a plugin after its dependency is loaded', async () => {
      loader.register(AGENT_MANIFEST, createSuccessInitializer());
      loader.register(WORKER_MANIFEST, createSuccessInitializer());

      await loader.load('agent-test');
      await loader.load('worker-test');

      expect(loader.getStatus('worker-test')).toBe('loaded');
    });

    it('should fail to load a plugin if a dependency is not registered', async () => {
      loader.register(WORKER_MANIFEST, createSuccessInitializer());

      await expect(loader.load('worker-test')).rejects.toThrow(
        'Missing dependencies: agent-test'
      );

      expect(loader.getStatus('worker-test')).toBe('error');
    });

    it('should fail to load a plugin if a dependency is registered but not loaded', async () => {
      loader.register(AGENT_MANIFEST, createSuccessInitializer());
      loader.register(WORKER_MANIFEST, createSuccessInitializer());

      await expect(loader.load('worker-test')).rejects.toThrow(
        'Dependencies not yet loaded: agent-test'
      );
    });

    it('should handle multiple dependencies', async () => {
      loader.register(AGENT_MANIFEST, createSuccessInitializer());
      loader.register(SKILL_MANIFEST, createSuccessInitializer());
      loader.register(CONNECTOR_MANIFEST, createSuccessInitializer());

      await loader.load('agent-test');
      await loader.load('skill-test');
      await loader.load('connector-test');

      expect(loader.getStatus('connector-test')).toBe('loaded');
    });

    it('should fail if one of multiple dependencies is missing', async () => {
      loader.register(AGENT_MANIFEST, createSuccessInitializer());
      loader.register(CONNECTOR_MANIFEST, createSuccessInitializer());

      await loader.load('agent-test');

      await expect(loader.load('connector-test')).rejects.toThrow(
        'Missing dependencies: skill-test'
      );
    });
  });

  // ─── Unloading ────────────────────────────────────────

  describe('unload', () => {
    it('should unload a loaded plugin', async () => {
      loader.register(AGENT_MANIFEST, createSuccessInitializer());
      await loader.load('agent-test');
      await loader.unload('agent-test');

      expect(loader.getStatus('agent-test')).toBe('unloaded');
      expect(loader.get('agent-test')).toBeUndefined();
    });

    it('should call dispose method on the plugin instance', async () => {
      loader.register(AGENT_MANIFEST, createDisposableInitializer());
      await loader.load('agent-test');

      const instance = loader.get<{ disposed: boolean }>('agent-test');
      expect(instance!.disposed).toBe(false);

      await loader.unload('agent-test');

      expect(instance!.disposed).toBe(true);
    });

    it('should call destroy method if dispose is not available', async () => {
      loader.register(AGENT_MANIFEST, async () => {
        const instance = {
          destroyed: false,
          async destroy(): Promise<void> {
            instance.destroyed = true;
          },
        };
        return instance;
      });

      await loader.load('agent-test');
      const instance = loader.get<{ destroyed: boolean }>('agent-test');
      await loader.unload('agent-test');

      expect(instance!.destroyed).toBe(true);
    });

    it('should throw if plugin is not found', async () => {
      await expect(loader.unload('nonexistent')).rejects.toThrow(
        'Plugin not found: nonexistent'
      );
    });

    it('should throw if plugin is not loaded', async () => {
      loader.register(AGENT_MANIFEST, createSuccessInitializer());

      await expect(loader.unload('agent-test')).rejects.toThrow(
        'Cannot unload plugin in status: registered'
      );
    });

    it('should handle errors during dispose gracefully', async () => {
      loader.register(AGENT_MANIFEST, async () => ({
        async dispose(): Promise<void> {
          throw new Error('Dispose failed');
        },
      }));

      await loader.load('agent-test');
      await loader.unload('agent-test');

      // Should still be unloaded even if dispose fails
      expect(loader.getStatus('agent-test')).toBe('unloaded');
    });
  });

  // ─── Reloading ────────────────────────────────────────

  describe('reload', () => {
    it('should reload a loaded plugin', async () => {
      let initCount = 0;
      loader.register(AGENT_MANIFEST, async (context) => {
        initCount++;
        return { initCount, context };
      });

      await loader.load('agent-test');
      expect(initCount).toBe(1);

      await loader.reload('agent-test');
      expect(initCount).toBe(2);
      expect(loader.getStatus('agent-test')).toBe('loaded');
    });

    it('should load a plugin that was previously unloaded', async () => {
      loader.register(AGENT_MANIFEST, createSuccessInitializer());
      await loader.load('agent-test');
      await loader.unload('agent-test');

      expect(loader.getStatus('agent-test')).toBe('unloaded');

      await loader.reload('agent-test');
      expect(loader.getStatus('agent-test')).toBe('loaded');
    });

    it('should throw if plugin not found', async () => {
      await expect(loader.reload('nonexistent')).rejects.toThrow(
        'Plugin not found: nonexistent'
      );
    });
  });

  // ─── Access Methods ───────────────────────────────────

  describe('get', () => {
    it('should return the plugin instance', async () => {
      loader.register(AGENT_MANIFEST, createSuccessInitializer({ value: 42 }));
      await loader.load('agent-test');

      const instance = loader.get<{ value: number }>('agent-test');
      expect(instance).toBeDefined();
      expect(instance!.value).toBe(42);
    });

    it('should return undefined for unloaded plugins', () => {
      loader.register(AGENT_MANIFEST, createSuccessInitializer());

      expect(loader.get('agent-test')).toBeUndefined();
    });

    it('should return undefined for unknown plugins', () => {
      expect(loader.get('nonexistent')).toBeUndefined();
    });
  });

  describe('getStatus', () => {
    it('should return the plugin status', () => {
      loader.register(AGENT_MANIFEST, createSuccessInitializer());
      expect(loader.getStatus('agent-test')).toBe('registered');
    });

    it('should return undefined for unknown plugins', () => {
      expect(loader.getStatus('nonexistent')).toBeUndefined();
    });
  });

  describe('list', () => {
    it('should list all plugins', () => {
      loader.register(AGENT_MANIFEST, createSuccessInitializer());
      loader.register(SKILL_MANIFEST, createSuccessInitializer());

      const plugins = loader.list();
      expect(plugins.length).toBe(2);
    });

    it('should filter by type', () => {
      loader.register(AGENT_MANIFEST, createSuccessInitializer());
      loader.register(SKILL_MANIFEST, createSuccessInitializer());
      loader.register(WORKER_MANIFEST, createSuccessInitializer());

      const agents = loader.list({ type: 'agent' });
      expect(agents.length).toBe(1);
      expect(agents[0].manifest.type).toBe('agent');
    });

    it('should filter by status', async () => {
      loader.register(AGENT_MANIFEST, createSuccessInitializer());
      loader.register(SKILL_MANIFEST, createSuccessInitializer());

      await loader.load('agent-test');

      const loaded = loader.list({ status: 'loaded' });
      expect(loaded.length).toBe(1);
      expect(loaded[0].manifest.id).toBe('agent-test');
    });

    it('should filter by capability', () => {
      loader.register(AGENT_MANIFEST, createSuccessInitializer());
      loader.register(SKILL_MANIFEST, createSuccessInitializer());

      const withTranslation = loader.list({ capability: 'translation' });
      expect(withTranslation.length).toBe(1);
      expect(withTranslation[0].manifest.id).toBe('skill-test');
    });

    it('should return copies of plugin objects', () => {
      loader.register(AGENT_MANIFEST, createSuccessInitializer());

      const plugins1 = loader.list();
      const plugins2 = loader.list();

      // Modifying one should not affect the other
      plugins1[0].status = 'error';
      expect(plugins2[0].status).toBe('registered');
    });
  });

  describe('getPluginsByCapability', () => {
    it('should return plugins with the specified capability', () => {
      loader.register(AGENT_MANIFEST, createSuccessInitializer());
      loader.register(SKILL_MANIFEST, createSuccessInitializer());

      const plugins = loader.getPluginsByCapability('code-generation');
      expect(plugins.length).toBe(1);
      expect(plugins[0].manifest.id).toBe('agent-test');
    });

    it('should return empty array if no plugins have the capability', () => {
      loader.register(AGENT_MANIFEST, createSuccessInitializer());

      const plugins = loader.getPluginsByCapability('nonexistent-capability');
      expect(plugins.length).toBe(0);
    });
  });

  // ─── Context Management ───────────────────────────────

  describe('setContext', () => {
    it('should update the shared context', async () => {
      let receivedConfig: Record<string, unknown> | undefined;

      loader.register(AGENT_MANIFEST, async (context) => {
        receivedConfig = context.config;
        return {};
      });

      loader.setContext({ config: { sharedKey: 'sharedValue' } });
      await loader.load('agent-test');

      expect(receivedConfig!.sharedKey).toBe('sharedValue');
    });

    it('should merge plugin config with shared config', async () => {
      let receivedConfig: Record<string, unknown> | undefined;

      const manifestWithConfig: PluginManifest = {
        ...AGENT_MANIFEST,
        id: 'agent-config-test',
        config: { pluginKey: 'pluginValue' },
      };

      loader.register(manifestWithConfig, async (context) => {
        receivedConfig = context.config;
        return {};
      });

      loader.setContext({ config: { sharedKey: 'sharedValue' } });
      await loader.load('agent-config-test');

      expect(receivedConfig!.sharedKey).toBe('sharedValue');
      expect(receivedConfig!.pluginKey).toBe('pluginValue');
    });
  });

  // ─── Health Check ─────────────────────────────────────

  describe('healthCheck', () => {
    it('should report all loaded plugins as healthy by default', async () => {
      loader.register(AGENT_MANIFEST, createSuccessInitializer());
      await loader.load('agent-test');

      const health = await loader.healthCheck();

      expect(health.totalPlugins).toBe(1);
      expect(health.loadedPlugins).toBe(1);
      expect(health.healthy).toBe(1);
      expect(health.unhealthy).toBe(0);
    });

    it('should call healthCheck on plugins that implement it', async () => {
      loader.register(
        { ...AGENT_MANIFEST, id: 'healthy-plugin' },
        createHealthCheckInitializer('healthy')
      );
      loader.register(
        { ...AGENT_MANIFEST, id: 'degraded-plugin' },
        createHealthCheckInitializer('degraded', 'High latency')
      );
      loader.register(
        { ...AGENT_MANIFEST, id: 'unhealthy-plugin' },
        createHealthCheckInitializer('unhealthy', 'Connection failed')
      );

      await loader.load('healthy-plugin');
      await loader.load('degraded-plugin');
      await loader.load('unhealthy-plugin');

      const health = await loader.healthCheck();

      expect(health.healthy).toBe(1);
      expect(health.degraded).toBe(1);
      expect(health.unhealthy).toBe(1);

      const degraded = health.details.find((d) => d.pluginId === 'degraded-plugin');
      expect(degraded!.message).toBe('High latency');

      const unhealthy = health.details.find((d) => d.pluginId === 'unhealthy-plugin');
      expect(unhealthy!.message).toBe('Connection failed');
    });

    it('should handle healthCheck errors', async () => {
      loader.register(
        { ...AGENT_MANIFEST, id: 'error-plugin' },
        async () => ({
          async healthCheck(): Promise<never> {
            throw new Error('Health check crashed');
          },
        })
      );

      await loader.load('error-plugin');

      const health = await loader.healthCheck();

      expect(health.unhealthy).toBe(1);
      const detail = health.details[0];
      expect(detail.message).toContain('Health check crashed');
    });

    it('should skip non-loaded plugins', async () => {
      loader.register(AGENT_MANIFEST, createSuccessInitializer());
      // Not loaded

      const health = await loader.healthCheck();

      expect(health.totalPlugins).toBe(1);
      expect(health.loadedPlugins).toBe(0);
      expect(health.healthy).toBe(0);
    });

    it('should include checkedAt timestamp', async () => {
      loader.register(AGENT_MANIFEST, createSuccessInitializer());
      await loader.load('agent-test');

      const health = await loader.healthCheck();

      expect(health.details[0].checkedAt).toBeDefined();
      expect(new Date(health.details[0].checkedAt).getTime()).not.toBeNaN();
    });
  });

  // ─── EventBus Integration ─────────────────────────────

  describe('EventBus integration', () => {
    it('should emit plugin.registered event', () => {
      const mockBus = createMockEventBus();
      const pl = new PluginLoader({ eventBus: mockBus });

      pl.register(AGENT_MANIFEST, createSuccessInitializer());

      expect(mockBus.events.some((e) => e.type === 'plugin.registered')).toBe(true);
    });

    it('should emit plugin.loaded event', async () => {
      const mockBus = createMockEventBus();
      const pl = new PluginLoader({ eventBus: mockBus });

      pl.register(AGENT_MANIFEST, createSuccessInitializer());
      await pl.load('agent-test');

      expect(mockBus.events.some((e) => e.type === 'plugin.loaded')).toBe(true);
    });

    it('should emit plugin.unloaded event', async () => {
      const mockBus = createMockEventBus();
      const pl = new PluginLoader({ eventBus: mockBus });

      pl.register(AGENT_MANIFEST, createSuccessInitializer());
      await pl.load('agent-test');
      await pl.unload('agent-test');

      expect(mockBus.events.some((e) => e.type === 'plugin.unloaded')).toBe(true);
    });

    it('should emit plugin.error event on load failure', async () => {
      const mockBus = createMockEventBus();
      const pl = new PluginLoader({ eventBus: mockBus });

      pl.register(AGENT_MANIFEST, createFailingInitializer('Load failed'));

      try {
        await pl.load('agent-test');
      } catch {
        // Expected
      }

      expect(mockBus.events.some((e) => e.type === 'plugin.error')).toBe(true);
    });
  });

  // ─── Complex Scenarios ────────────────────────────────

  describe('complex scenarios', () => {
    it('should handle a full plugin lifecycle', async () => {
      loader.register(AGENT_MANIFEST, createDisposableInitializer());

      // Register → Load → Verify → Unload → Verify
      expect(loader.getStatus('agent-test')).toBe('registered');

      await loader.load('agent-test');
      expect(loader.getStatus('agent-test')).toBe('loaded');
      expect(loader.get('agent-test')).toBeDefined();

      await loader.unload('agent-test');
      expect(loader.getStatus('agent-test')).toBe('unloaded');
      expect(loader.get('agent-test')).toBeUndefined();

      // Reload
      await loader.reload('agent-test');
      expect(loader.getStatus('agent-test')).toBe('loaded');
      expect(loader.get('agent-test')).toBeDefined();
    });

    it('should handle dependency chain loading', async () => {
      // Create a chain: connector depends on agent + skill; worker depends on agent
      loader.register(AGENT_MANIFEST, createSuccessInitializer());
      loader.register(SKILL_MANIFEST, createSuccessInitializer());
      loader.register(WORKER_MANIFEST, createSuccessInitializer());
      loader.register(CONNECTOR_MANIFEST, createSuccessInitializer());

      // Must load in dependency order
      await loader.load('agent-test');
      await loader.load('skill-test');
      await loader.load('worker-test');
      await loader.load('connector-test');

      expect(loader.getStatus('connector-test')).toBe('loaded');
    });

    it('should handle multiple plugins with different types', () => {
      loader.register(AGENT_MANIFEST, createSuccessInitializer());
      loader.register(SKILL_MANIFEST, createSuccessInitializer());
      loader.register(WORKER_MANIFEST, createSuccessInitializer());
      loader.register(CONNECTOR_MANIFEST, createSuccessInitializer());

      const types = loader.list().map((p) => p.manifest.type);
      expect(types).toContain('agent');
      expect(types).toContain('skill');
      expect(types).toContain('worker');
      expect(types).toContain('connector');
    });
  });
});
