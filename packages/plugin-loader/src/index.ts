/**
 * ALTER EGO OS — Plugin Loader
 *
 * Public API for the dynamic plugin management system.
 */

export { PluginLoader } from './plugin-loader.js';
export type { PluginLoaderEventBus } from './plugin-loader.js';

export type {
  PluginId,
  PluginStatus,
  PluginType,
  PluginManifest,
  Plugin,
  PluginContext,
  PluginInitializer,
  PluginRegistryEntry,
  PluginHealthStatus,
  PluginLoaderHealth,
  PluginFilter,
  PluginLoaderEvents,
} from './types.js';
