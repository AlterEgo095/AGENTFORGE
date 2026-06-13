/**
 * ALTER EGO OS — Browser Capability Types
 *
 * The Browser is a CAPABILITY, not a mission.
 * It executes actions: open, click, type, extract, download, etc.
 * It knows nothing about missions, research, or writing.
 */

// ─── Core Types ──────────────────────────────────────────────

/** Unique identifier for browser sessions */
export type SessionId = string;

/** Browser action result status */
export type ActionStatus = 'success' | 'error' | 'timeout' | 'blocked';

/** Supported browsers */
export type BrowserType = 'chromium' | 'firefox' | 'webkit';

/** Viewport size preset */
export type ViewportPreset = 'mobile' | 'tablet' | 'desktop' | 'ultrawide';

// ─── Configuration ───────────────────────────────────────────

export interface BrowserCapabilityConfig {
  /** Browser engine (default: chromium) */
  browserType?: BrowserType;
  /** Headless mode (default: true) */
  headless?: boolean;
  /** Default timeout in ms (default: 30000) */
  defaultTimeout?: number;
  /** Default navigation timeout in ms (default: 60000) */
  navigationTimeout?: number;
  /** Viewport size */
  viewport?: { width: number; height: number } | ViewportPreset;
  /** User agent string (randomized if not set) */
  userAgent?: string;
  /** Enable stealth mode (anti-detection) */
  stealth?: boolean;
  /** Proxy configuration */
  proxy?: {
    server: string;
    username?: string;
    password?: string;
  };
  /** Maximum concurrent tabs (default: 5) */
  maxTabs?: number;
  /** Screenshot directory */
  screenshotDir?: string;
  /** Download directory */
  downloadDir?: string;
}

// ─── Action Types ────────────────────────────────────────────

/** Result of any browser action */
export interface ActionResult<T = unknown> {
  status: ActionStatus;
  data?: T;
  error?: string;
  durationMs: number;
  url?: string;
  timestamp: string;
}

/** Navigation result */
export interface NavigateResult {
  url: string;
  title: string;
  statusCode: number;
  redirectChain: string[];
}

/** Click result */
export interface ClickResult {
  selector: string;
  clicked: boolean;
  navigationOccurred: boolean;
  newUrl?: string;
}

/** Type (fill) result */
export interface TypeResult {
  selector: string;
  text: string;
  filled: boolean;
}

/** Extract result */
export interface ExtractResult {
  selector: string;
  text: string;
  html: string;
  attributes: Record<string, string>;
}

/** Extract page content result */
export interface PageContentResult {
  url: string;
  title: string;
  text: string;
  html: string;
  links: LinkInfo[];
  images: ImageInfo[];
  meta: MetaInfo;
}

export interface LinkInfo {
  text: string;
  href: string;
  target?: string;
}

export interface ImageInfo {
  src: string;
  alt: string;
  width?: number;
  height?: number;
}

export interface MetaInfo {
  title: string;
  description?: string;
  keywords?: string[];
  author?: string;
  ogImage?: string;
  publishedTime?: string;
}

/** Search result */
export interface SearchResult {
  query: string;
  engine: string;
  results: SearchItem[];
  totalResults?: number;
}

export interface SearchItem {
  title: string;
  url: string;
  snippet: string;
  position: number;
}

/** Download result */
export interface DownloadResult {
  url: string;
  filename: string;
  path: string;
  sizeBytes: number;
  mimeType: string;
}

/** Screenshot result */
export interface ScreenshotResult {
  path: string;
  width: number;
  height: number;
  sizeBytes: number;
}

/** Scroll result */
export interface ScrollResult {
  direction: 'up' | 'down' | 'left' | 'right';
  pixels: number;
  reachedEnd: boolean;
}

/** Wait result */
export interface WaitResult {
  waitedFor: 'selector' | 'navigation' | 'timeout' | 'networkIdle';
  durationMs: number;
  found: boolean;
}

/** Tab info */
export interface TabInfo {
  id: string;
  url: string;
  title: string;
  active: boolean;
}

/** Cookie info */
export interface CookieInfo {
  name: string;
  value: string;
  domain: string;
  path: string;
  expires: number;
  httpOnly: boolean;
  secure: boolean;
  sameSite: 'Strict' | 'Lax' | 'None';
}

/** Storage info */
export interface StorageInfo {
  localStorage: Record<string, string>;
  sessionStorage: Record<string, string>;
}

// ─── Browser Capability Interface ────────────────────────────

/**
 * The Browser Capability interface.
 * This is what Workers use — they never touch Playwright directly.
 */
export interface IBrowserCapability {
  // ─── Lifecycle ───────────────────────────────────────
  launch(): Promise<void>;
  close(): Promise<void>;
  isRunning(): boolean;

  // ─── Navigation ──────────────────────────────────────
  open(url: string): Promise<ActionResult<NavigateResult>>;
  goBack(): Promise<ActionResult<NavigateResult>>;
  goForward(): Promise<ActionResult<NavigateResult>>;
  reload(): Promise<ActionResult<NavigateResult>>;
  getCurrentUrl(): Promise<string>;
  getTitle(): Promise<string>;

  // ─── Interaction ─────────────────────────────────────
  click(selector: string): Promise<ActionResult<ClickResult>>;
  type(selector: string, text: string, options?: TypeOptions): Promise<ActionResult<TypeResult>>;
  press(key: string): Promise<ActionResult<void>>;
  select(selector: string, values: string[]): Promise<ActionResult<string[]>>;
  hover(selector: string): Promise<ActionResult<void>>;

  // ─── Waiting ─────────────────────────────────────────
  waitFor(selector: string, timeout?: number): Promise<ActionResult<WaitResult>>;
  waitForNavigation(timeout?: number): Promise<ActionResult<WaitResult>>;
  waitForNetworkIdle(timeout?: number): Promise<ActionResult<WaitResult>>;
  wait(ms: number): Promise<ActionResult<void>>;

  // ─── Extraction ──────────────────────────────────────
  extract(selector: string): Promise<ActionResult<ExtractResult>>;
  extractPageContent(): Promise<ActionResult<PageContentResult>>;
  extractLinks(): Promise<ActionResult<LinkInfo[]>>;
  extractImages(): Promise<ActionResult<ImageInfo[]>>;
  extractMeta(): Promise<ActionResult<MetaInfo>>;

  // ─── Search ──────────────────────────────────────────
  search(query: string, engine?: SearchEngine): Promise<ActionResult<SearchResult>>;

  // ─── Download / Screenshot ───────────────────────────
  download(url: string, filename?: string): Promise<ActionResult<DownloadResult>>;
  screenshot(selector?: string): Promise<ActionResult<ScreenshotResult>>;
  pdf(options?: PdfOptions): Promise<ActionResult<DownloadResult>>;

  // ─── Scrolling ───────────────────────────────────────
  scroll(direction: 'up' | 'down' | 'left' | 'right', pixels?: number): Promise<ActionResult<ScrollResult>>;
  scrollTo(selector: string): Promise<ActionResult<void>>;

  // ─── Tabs ────────────────────────────────────────────
  openTab(url: string): Promise<ActionResult<TabInfo>>;
  switchTab(tabId: string): Promise<ActionResult<TabInfo>>;
  closeTab(tabId: string): Promise<ActionResult<void>>;
  getTabs(): Promise<TabInfo[]>;

  // ─── Cookies / Storage ───────────────────────────────
  getCookies(): Promise<ActionResult<CookieInfo[]>>;
  setCookie(cookie: CookieInfo): Promise<ActionResult<void>>;
  clearCookies(): Promise<ActionResult<void>>;
  getStorage(): Promise<ActionResult<StorageInfo>>;

  // ─── Form ────────────────────────────────────────────
  fillForm(fields: FormField[]): Promise<ActionResult<void>>;
  submitForm(selector: string): Promise<ActionResult<NavigateResult>>;

  // ─── File Upload ─────────────────────────────────────
  upload(selector: string, filePaths: string[]): Promise<ActionResult<void>>;

  // ─── Browser Memory ──────────────────────────────────
  getMemory(): IBrowserMemory;
}

// ─── Supporting Types ────────────────────────────────────────

export interface TypeOptions {
  /** Clear existing text before typing (default: true) */
  clear?: boolean;
  /** Delay between keystrokes in ms (default: 50, randomizable for stealth) */
  delay?: number;
  /** Press Enter after typing (default: false) */
  pressEnter?: boolean;
}

export type SearchEngine = 'google' | 'bing' | 'duckduckgo' | 'github' | 'arxiv' | 'scholar';

export interface PdfOptions {
  format?: 'A4' | 'Letter' | 'Legal';
  landscape?: boolean;
  margin?: { top?: string; right?: string; bottom?: string; left?: string };
  printBackground?: boolean;
}

export interface FormField {
  selector: string;
  value: string;
  type: 'text' | 'email' | 'password' | 'select' | 'checkbox' | 'radio' | 'textarea' | 'file';
}

// ─── Browser Memory Interface ────────────────────────────────

/**
 * Browser Memory persists sessions, cookies, and auth across Browser invocations.
 * The Browser doesn't need to re-login every time.
 */
export interface IBrowserMemory {
  /** Save current session state for a domain */
  saveSession(domain: string): Promise<void>;
  /** Restore session state for a domain */
  restoreSession(domain: string): Promise<boolean>;
  /** Check if we have a saved session for a domain */
  hasSession(domain: string): boolean;
  /** List all saved sessions */
  listSessions(): Promise<SessionSummary[]>;
  /** Delete a saved session */
  deleteSession(domain: string): Promise<void>;
  /** Save a URL as bookmark */
  addBookmark(url: string, title: string, tags?: string[]): Promise<void>;
  /** Get bookmarks */
  getBookmarks(tags?: string[]): Promise<Bookmark[]>;
  /** Add to browsing history */
  addToHistory(url: string, title: string): Promise<void>;
  /** Get browsing history */
  getHistory(limit?: number): Promise<HistoryEntry[]>;
  /** Clear all history */
  clearHistory(): Promise<void>;
}

export interface SessionSummary {
  domain: string;
  savedAt: string;
  hasCookies: boolean;
  hasStorage: boolean;
}

export interface Bookmark {
  url: string;
  title: string;
  tags: string[];
  createdAt: string;
}

export interface HistoryEntry {
  url: string;
  title: string;
  visitedAt: string;
}
