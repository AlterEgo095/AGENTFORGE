/**
 * ALTER EGO OS — Browser Capability
 *
 * Public API for the headless browser automation capability.
 *
 * This is a CAPABILITY — it executes browser actions.
 * It knows nothing about missions, research, or writing.
 * Workers use this capability to navigate the web.
 */

export { BrowserCapability } from './actions/browser-actions.js';
export { BrowserMemory } from './memory/browser-memory.js';
export type {
  // Core types
  SessionId,
  ActionStatus,
  BrowserType,
  ViewportPreset,
  BrowserCapabilityConfig,

  // Action results
  ActionResult,
  NavigateResult,
  ClickResult,
  TypeResult,
  ExtractResult,
  PageContentResult,
  SearchResult,
  SearchItem,
  DownloadResult,
  ScreenshotResult,
  ScrollResult,
  WaitResult,
  TabInfo,
  CookieInfo,
  StorageInfo,

  // Options
  TypeOptions,
  SearchEngine,
  PdfOptions,
  FormField,

  // Content types
  LinkInfo,
  ImageInfo,
  MetaInfo,

  // Memory
  IBrowserMemory,
  SessionSummary,
  Bookmark,
  HistoryEntry,
} from './types.js';
