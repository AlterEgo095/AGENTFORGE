/**
 * ALTER EGO OS — Browser Capability Implementation
 *
 * Headless browser automation via Playwright.
 * This is a CAPABILITY — it executes actions, nothing more.
 * It knows nothing about missions, research, or writing.
 */

import { chromium, type Browser, type BrowserContext, type Page, type Cookie as PwCookie } from 'playwright';
import type {
  BrowserCapabilityConfig,
  IBrowserCapability,
  IBrowserMemory,
  ActionResult,
  NavigateResult,
  ClickResult,
  TypeResult,
  ExtractResult,
  PageContentResult,
  SearchResult,
  SearchItem,
  SearchEngine,
  DownloadResult,
  ScreenshotResult,
  ScrollResult,
  WaitResult,
  TabInfo,
  CookieInfo,
  StorageInfo,
  TypeOptions,
  PdfOptions,
  FormField,
  LinkInfo,
  ImageInfo,
  MetaInfo,
} from './types.js';
import { BrowserMemory } from '../memory/browser-memory.js';

// ─── Default Configuration ───────────────────────────────────

const DEFAULT_CONFIG: Required<BrowserCapabilityConfig> = {
  browserType: 'chromium',
  headless: true,
  defaultTimeout: 30000,
  navigationTimeout: 60000,
  viewport: { width: 1920, height: 1080 },
  userAgent: '',
  stealth: true,
  proxy: { server: '' },
  maxTabs: 5,
  screenshotDir: '/tmp/alterego/screenshots',
  downloadDir: '/tmp/alterego/downloads',
};

// ─── User Agent Pool (anti-fingerprinting) ───────────────────

const USER_AGENTS = [
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36',
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36',
  'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36',
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:133.0) Gecko/20100101 Firefox/133.0',
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.2 Safari/605.1.15',
];

function randomUserAgent(): string {
  return USER_AGENTS[Math.floor(Math.random() * USER_AGENTS.length)];
}

// ─── Search Engine URLs ──────────────────────────────────────

const SEARCH_URLS: Record<string, (q: string) => string> = {
  google: (q) => `https://www.google.com/search?q=${encodeURIComponent(q)}&num=20`,
  bing: (q) => `https://www.bing.com/search?q=${encodeURIComponent(q)}&count=20`,
  duckduckgo: (q) => `https://duckduckgo.com/?q=${encodeURIComponent(q)}`,
  github: (q) => `https://github.com/search?q=${encodeURIComponent(q)}&type=repositories&s=stars&o=desc`,
  arxiv: (q) => `https://arxiv.org/search/?query=${encodeURIComponent(q)}&searchtype=all&order=-announced_date_first`,
  scholar: (q) => `https://scholar.google.com/scholar?q=${encodeURIComponent(q)}`,
};

// ─── Helper ──────────────────────────────────────────────────

function timestamp(): string {
  return new Date().toISOString();
}

function actionResult<T>(status: 'success' | 'error' | 'timeout' | 'blocked', data?: T, error?: string, url?: string, startMs?: number): ActionResult<T> {
  return {
    status,
    data,
    error,
    durationMs: startMs ? Date.now() - startMs : 0,
    url,
    timestamp: timestamp(),
  };
}

// ─── Browser Capability Implementation ───────────────────────

export class BrowserCapability implements IBrowserCapability {
  private config: Required<BrowserCapabilityConfig>;
  private browser: Browser | null = null;
  private context: BrowserContext | null = null;
  private pages: Map<string, Page> = new Map();
  private activePageId: string | null = null;
  private memory: BrowserMemory;
  private tabCounter = 0;

  constructor(config?: BrowserCapabilityConfig) {
    this.config = { ...DEFAULT_CONFIG, ...config } as Required<BrowserCapabilityConfig>;
    if (!this.config.userAgent) {
      this.config.userAgent = randomUserAgent();
    }
    this.memory = new BrowserMemory();
  }

  // ─── Lifecycle ───────────────────────────────────────

  async launch(): Promise<void> {
    if (this.browser) return;

    const launchOptions: Record<string, unknown> = {
      headless: this.config.headless,
    };

    if (this.config.proxy?.server) {
      launchOptions.proxy = this.config.proxy;
    }

    this.browser = await chromium.launch(launchOptions);

    const contextOptions: Record<string, unknown> = {
      viewport: this.config.viewport,
      userAgent: this.config.userAgent,
    };

    if (this.config.stealth) {
      // Anti-detection measures
      contextOptions.bypassCSP = true;
      contextOptions.javaScriptEnabled = true;
      contextOptions.ignoreHTTPSErrors = true;
    }

    this.context = await this.browser.newContext(contextOptions);

    // Create initial page
    const page = await this.context.newPage();
    const pageId = `tab_${++this.tabCounter}`;
    this.pages.set(pageId, page);
    this.activePageId = pageId;

    page.setDefaultTimeout(this.config.defaultTimeout);
    page.setDefaultNavigationTimeout(this.config.navigationTimeout);
  }

  async close(): Promise<void> {
    if (this.context) {
      await this.context.close();
      this.context = null;
    }
    if (this.browser) {
      await this.browser.close();
      this.browser = null;
    }
    this.pages.clear();
    this.activePageId = null;
  }

  isRunning(): boolean {
    return this.browser !== null && this.browser.isConnected();
  }

  // ─── Navigation ──────────────────────────────────────

  async open(url: string): Promise<ActionResult<NavigateResult>> {
    const start = Date.now();
    try {
      const page = this.getActivePage();
      const response = await page.goto(url, { waitUntil: 'domcontentloaded', timeout: this.config.navigationTimeout });

      const redirectChain: string[] = [];
      if (response?.request().redirectedFrom()) {
        let req = response!.request().redirectedFrom();
        while (req) {
          redirectChain.push(req.url());
          req = req.redirectedFrom();
        }
      }

      const result: NavigateResult = {
        url: page.url(),
        title: await page.title(),
        statusCode: response?.status() ?? 0,
        redirectChain: redirectChain.reverse(),
      };

      // Save to browsing history
      await this.memory.addToHistory(url, result.title);

      return actionResult('success', result, undefined, url, start);
    } catch (error) {
      return actionResult('error', undefined, (error as Error).message, url, start);
    }
  }

  async goBack(): Promise<ActionResult<NavigateResult>> {
    const start = Date.now();
    try {
      const page = this.getActivePage();
      await page.goBack({ waitUntil: 'domcontentloaded' });
      const result: NavigateResult = {
        url: page.url(),
        title: await page.title(),
        statusCode: 200,
        redirectChain: [],
      };
      return actionResult('success', result, undefined, page.url(), start);
    } catch (error) {
      return actionResult('error', undefined, (error as Error).message, undefined, start);
    }
  }

  async goForward(): Promise<ActionResult<NavigateResult>> {
    const start = Date.now();
    try {
      const page = this.getActivePage();
      await page.goForward({ waitUntil: 'domcontentloaded' });
      const result: NavigateResult = {
        url: page.url(),
        title: await page.title(),
        statusCode: 200,
        redirectChain: [],
      };
      return actionResult('success', result, undefined, page.url(), start);
    } catch (error) {
      return actionResult('error', undefined, (error as Error).message, undefined, start);
    }
  }

  async reload(): Promise<ActionResult<NavigateResult>> {
    const start = Date.now();
    try {
      const page = this.getActivePage();
      await page.reload({ waitUntil: 'domcontentloaded' });
      const result: NavigateResult = {
        url: page.url(),
        title: await page.title(),
        statusCode: 200,
        redirectChain: [],
      };
      return actionResult('success', result, undefined, page.url(), start);
    } catch (error) {
      return actionResult('error', undefined, (error as Error).message, undefined, start);
    }
  }

  async getCurrentUrl(): Promise<string> {
    return this.getActivePage().url();
  }

  async getTitle(): Promise<string> {
    return this.getActivePage().title();
  }

  // ─── Interaction ─────────────────────────────────────

  async click(selector: string): Promise<ActionResult<ClickResult>> {
    const start = Date.now();
    try {
      const page = this.getActivePage();
      const currentUrl = page.url();

      // Add random delay for stealth
      if (this.config.stealth) {
        await this.randomDelay(50, 200);
      }

      await page.click(selector);
      await page.waitForLoadState('domcontentloaded').catch(() => {});

      const newUrl = page.url();
      const result: ClickResult = {
        selector,
        clicked: true,
        navigationOccurred: newUrl !== currentUrl,
        newUrl: newUrl !== currentUrl ? newUrl : undefined,
      };

      return actionResult('success', result, undefined, page.url(), start);
    } catch (error) {
      return actionResult('error', undefined, (error as Error).message, undefined, start);
    }
  }

  async type(selector: string, text: string, options?: TypeOptions): Promise<ActionResult<TypeResult>> {
    const start = Date.now();
    try {
      const page = this.getActivePage();
      const clear = options?.clear ?? true;
      const delay = options?.delay ?? (this.config.stealth ? this.randomBetween(30, 100) : 0);

      if (clear) {
        await page.fill(selector, '');
      }

      await page.type(selector, text, { delay });

      if (options?.pressEnter) {
        await page.press(selector, 'Enter');
      }

      const result: TypeResult = {
        selector,
        text,
        filled: true,
      };

      return actionResult('success', result, undefined, page.url(), start);
    } catch (error) {
      return actionResult('error', undefined, (error as Error).message, undefined, start);
    }
  }

  async press(key: string): Promise<ActionResult<void>> {
    const start = Date.now();
    try {
      const page = this.getActivePage();
      await page.keyboard.press(key);
      return actionResult('success', undefined, undefined, page.url(), start);
    } catch (error) {
      return actionResult('error', undefined, (error as Error).message, undefined, start);
    }
  }

  async select(selector: string, values: string[]): Promise<ActionResult<string[]>> {
    const start = Date.now();
    try {
      const page = this.getActivePage();
      const selected = await page.selectOption(selector, values);
      return actionResult('success', selected, undefined, page.url(), start);
    } catch (error) {
      return actionResult('error', undefined, (error as Error).message, undefined, start);
    }
  }

  async hover(selector: string): Promise<ActionResult<void>> {
    const start = Date.now();
    try {
      const page = this.getActivePage();
      await page.hover(selector);
      return actionResult('success', undefined, undefined, page.url(), start);
    } catch (error) {
      return actionResult('error', undefined, (error as Error).message, undefined, start);
    }
  }

  // ─── Waiting ─────────────────────────────────────────

  async waitFor(selector: string, timeout?: number): Promise<ActionResult<WaitResult>> {
    const start = Date.now();
    try {
      const page = this.getActivePage();
      await page.waitForSelector(selector, { timeout: timeout ?? this.config.defaultTimeout });
      const result: WaitResult = {
        waitedFor: 'selector',
        durationMs: Date.now() - start,
        found: true,
      };
      return actionResult('success', result, undefined, page.url(), start);
    } catch (error) {
      return actionResult('timeout', undefined, (error as Error).message, undefined, start);
    }
  }

  async waitForNavigation(timeout?: number): Promise<ActionResult<WaitResult>> {
    const start = Date.now();
    try {
      const page = this.getActivePage();
      await page.waitForLoadState('domcontentloaded', { timeout: timeout ?? this.config.navigationTimeout });
      const result: WaitResult = {
        waitedFor: 'navigation',
        durationMs: Date.now() - start,
        found: true,
      };
      return actionResult('success', result, undefined, page.url(), start);
    } catch (error) {
      return actionResult('timeout', undefined, (error as Error).message, undefined, start);
    }
  }

  async waitForNetworkIdle(timeout?: number): Promise<ActionResult<WaitResult>> {
    const start = Date.now();
    try {
      const page = this.getActivePage();
      await page.waitForLoadState('networkidle', { timeout: timeout ?? this.config.defaultTimeout });
      const result: WaitResult = {
        waitedFor: 'networkIdle',
        durationMs: Date.now() - start,
        found: true,
      };
      return actionResult('success', result, undefined, page.url(), start);
    } catch (error) {
      return actionResult('timeout', undefined, (error as Error).message, undefined, start);
    }
  }

  async wait(ms: number): Promise<ActionResult<void>> {
    const start = Date.now();
    await new Promise((resolve) => setTimeout(resolve, ms));
    return actionResult('success', undefined, undefined, undefined, start);
  }

  // ─── Extraction ──────────────────────────────────────

  async extract(selector: string): Promise<ActionResult<ExtractResult>> {
    const start = Date.now();
    try {
      const page = this.getActivePage();
      const element = page.locator(selector).first();
      const [text, html, attributes] = await Promise.all([
        element.textContent() ?? '',
        element.innerHTML(),
        element.evaluate((el) => {
          const attrs: Record<string, string> = {};
          for (const attr of Array.from(el.attributes)) {
            attrs[attr.name] = attr.value;
          }
          return attrs;
        }),
      ]);

      const result: ExtractResult = {
        selector,
        text: text.trim(),
        html,
        attributes,
      };

      return actionResult('success', result, undefined, page.url(), start);
    } catch (error) {
      return actionResult('error', undefined, (error as Error).message, undefined, start);
    }
  }

  async extractPageContent(): Promise<ActionResult<PageContentResult>> {
    const start = Date.now();
    try {
      const page = this.getActivePage();
      const [text, links, images, meta] = await Promise.all([
        page.evaluate(() => document.body?.innerText ?? ''),
        page.evaluate(() =>
          Array.from(document.querySelectorAll('a[href]')).map((a) => ({
            text: (a as HTMLAnchorElement).textContent?.trim() ?? '',
            href: (a as HTMLAnchorElement).href,
            target: (a as HTMLAnchorElement).target || undefined,
          }))
        ),
        page.evaluate(() =>
          Array.from(document.querySelectorAll('img[src]')).map((img) => ({
            src: (img as HTMLImageElement).src,
            alt: (img as HTMLImageElement).alt,
            width: (img as HTMLImageElement).width || undefined,
            height: (img as HTMLImageElement).height || undefined,
          }))
        ),
        page.evaluate(() => {
          const getMeta = (name: string) =>
            document.querySelector(`meta[name="${name}"], meta[property="og:${name}"]`)?.getAttribute('content') ?? undefined;
          return {
            title: document.title,
            description: getMeta('description'),
            keywords: getMeta('keywords')?.split(',').map((k) => k.trim()),
            author: getMeta('author'),
            ogImage: getMeta('image'),
            publishedTime: getMeta('article:published_time'),
          };
        }),
      ]);

      const result: PageContentResult = {
        url: page.url(),
        title: await page.title(),
        text,
        html: '', // Not extracting full HTML by default (too large)
        links,
        images,
        meta,
      };

      return actionResult('success', result, undefined, page.url(), start);
    } catch (error) {
      return actionResult('error', undefined, (error as Error).message, undefined, start);
    }
  }

  async extractLinks(): Promise<ActionResult<LinkInfo[]>> {
    const start = Date.now();
    try {
      const page = this.getActivePage();
      const links = await page.evaluate(() =>
        Array.from(document.querySelectorAll('a[href]')).map((a) => ({
          text: (a as HTMLAnchorElement).textContent?.trim() ?? '',
          href: (a as HTMLAnchorElement).href,
          target: (a as HTMLAnchorElement).target || undefined,
        }))
      );
      return actionResult('success', links, undefined, page.url(), start);
    } catch (error) {
      return actionResult('error', undefined, (error as Error).message, undefined, start);
    }
  }

  async extractImages(): Promise<ActionResult<ImageInfo[]>> {
    const start = Date.now();
    try {
      const page = this.getActivePage();
      const images = await page.evaluate(() =>
        Array.from(document.querySelectorAll('img[src]')).map((img) => ({
          src: (img as HTMLImageElement).src,
          alt: (img as HTMLImageElement).alt,
          width: (img as HTMLImageElement).width || undefined,
          height: (img as HTMLImageElement).height || undefined,
        }))
      );
      return actionResult('success', images, undefined, page.url(), start);
    } catch (error) {
      return actionResult('error', undefined, (error as Error).message, undefined, start);
    }
  }

  async extractMeta(): Promise<ActionResult<MetaInfo>> {
    const start = Date.now();
    try {
      const page = this.getActivePage();
      const meta = await page.evaluate(() => {
        const getMeta = (name: string) =>
          document.querySelector(`meta[name="${name}"], meta[property="og:${name}"]`)?.getAttribute('content') ?? undefined;
        return {
          title: document.title,
          description: getMeta('description'),
          keywords: getMeta('keywords')?.split(',').map((k) => k.trim()),
          author: getMeta('author'),
          ogImage: getMeta('image'),
          publishedTime: getMeta('article:published_time'),
        };
      });
      return actionResult('success', meta, undefined, page.url(), start);
    } catch (error) {
      return actionResult('error', undefined, (error as Error).message, undefined, start);
    }
  }

  // ─── Search ──────────────────────────────────────────

  async search(query: string, engine: SearchEngine = 'google'): Promise<ActionResult<SearchResult>> {
    const start = Date.now();
    try {
      const urlBuilder = SEARCH_URLS[engine];
      if (!urlBuilder) {
        return actionResult('error', undefined, `Unknown search engine: ${engine}`, undefined, start);
      }

      const searchUrl = urlBuilder(query);
      const navResult = await this.open(searchUrl);

      if (navResult.status !== 'success') {
        return actionResult('error', undefined, `Failed to navigate to ${engine}: ${navResult.error}`, searchUrl, start);
      }

      const page = this.getActivePage();

      // Wait for results to load
      await page.waitForLoadState('domcontentloaded');

      // Extract search results based on engine
      let results: SearchItem[] = [];

      if (engine === 'google') {
        results = await this.extractGoogleResults(page);
      } else if (engine === 'github') {
        results = await this.extractGitHubResults(page);
      } else if (engine === 'arxiv') {
        results = await this.extractArxivResults(page);
      } else {
        // Generic extraction for other engines
        results = await this.extractGenericResults(page);
      }

      const result: SearchResult = {
        query,
        engine,
        results,
      };

      return actionResult('success', result, undefined, searchUrl, start);
    } catch (error) {
      return actionResult('error', undefined, (error as Error).message, undefined, start);
    }
  }

  // ─── Download / Screenshot ───────────────────────────

  async download(url: string, filename?: string): Promise<ActionResult<DownloadResult>> {
    const start = Date.now();
    try {
      const page = this.getActivePage();

      const downloadPromise = page.waitForEvent('download', { timeout: this.config.defaultTimeout });
      await page.evaluate((downloadUrl) => {
        const a = document.createElement('a');
        a.href = downloadUrl;
        a.download = '';
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
      }, url);

      const download = await downloadPromise;
      const suggestedFilename = download.suggestedFilename();
      const finalFilename = filename ?? suggestedFilename;
      const filePath = `${this.config.downloadDir}/${finalFilename}`;

      await download.saveAs(filePath);

      const result: DownloadResult = {
        url,
        filename: finalFilename,
        path: filePath,
        sizeBytes: 0, // Would need fs.stat to get actual size
        mimeType: '', // Would need to check file type
      };

      return actionResult('success', result, undefined, url, start);
    } catch (error) {
      return actionResult('error', undefined, (error as Error).message, url, start);
    }
  }

  async screenshot(selector?: string): Promise<ActionResult<ScreenshotResult>> {
    const start = Date.now();
    try {
      const page = this.getActivePage();
      const fs = await import('fs');
      await fs.promises.mkdir(this.config.screenshotDir, { recursive: true });

      const filename = `screenshot_${Date.now()}.png`;
      const filePath = `${this.config.screenshotDir}/${filename}`;

      if (selector) {
        await page.locator(selector).screenshot({ path: filePath });
      } else {
        await page.screenshot({ path: filePath, fullPage: true });
      }

      const stat = await fs.promises.stat(filePath);
      const viewport = page.viewportSize();

      const result: ScreenshotResult = {
        path: filePath,
        width: viewport?.width ?? 0,
        height: viewport?.height ?? 0,
        sizeBytes: stat.size,
      };

      return actionResult('success', result, undefined, page.url(), start);
    } catch (error) {
      return actionResult('error', undefined, (error as Error).message, undefined, start);
    }
  }

  async pdf(options?: PdfOptions): Promise<ActionResult<DownloadResult>> {
    const start = Date.now();
    try {
      const page = this.getActivePage();
      const fs = await import('fs');
      await fs.promises.mkdir(this.config.downloadDir, { recursive: true });

      const filename = `page_${Date.now()}.pdf`;
      const filePath = `${this.config.downloadDir}/${filename}`;

      const pdfBuffer = await page.pdf({
        format: options?.format ?? 'A4',
        landscape: options?.landscape,
        margin: options?.margin as Record<string, string>,
        printBackground: options?.printBackground ?? true,
      });

      await fs.promises.writeFile(filePath, pdfBuffer);

      const result: DownloadResult = {
        url: page.url(),
        filename,
        path: filePath,
        sizeBytes: pdfBuffer.length,
        mimeType: 'application/pdf',
      };

      return actionResult('success', result, undefined, page.url(), start);
    } catch (error) {
      return actionResult('error', undefined, (error as Error).message, undefined, start);
    }
  }

  // ─── Scrolling ───────────────────────────────────────

  async scroll(direction: 'up' | 'down' | 'left' | 'right', pixels = 500): Promise<ActionResult<ScrollResult>> {
    const start = Date.now();
    try {
      const page = this.getActivePage();
      const scrollMap: Record<string, [number, number]> = {
        up: [0, -pixels],
        down: [0, pixels],
        left: [-pixels, 0],
        right: [pixels, 0],
      };

      const [dx, dy] = scrollMap[direction];
      const reachedEnd = await page.evaluate(([dx, dy]) => {
        window.scrollBy(dx, dy);
        const doc = document.documentElement;
        return (
          (dy > 0 && window.innerHeight + window.scrollY >= doc.scrollHeight - 10) ||
          (dy < 0 && window.scrollY <= 10)
        );
      }, [dx, dy] as [number, number]);

      const result: ScrollResult = {
        direction,
        pixels,
        reachedEnd: reachedEnd as boolean,
      };

      return actionResult('success', result, undefined, page.url(), start);
    } catch (error) {
      return actionResult('error', undefined, (error as Error).message, undefined, start);
    }
  }

  async scrollTo(selector: string): Promise<ActionResult<void>> {
    const start = Date.now();
    try {
      const page = this.getActivePage();
      await page.locator(selector).scrollIntoViewIfNeeded();
      return actionResult('success', undefined, undefined, page.url(), start);
    } catch (error) {
      return actionResult('error', undefined, (error as Error).message, undefined, start);
    }
  }

  // ─── Tabs ────────────────────────────────────────────

  async openTab(url: string): Promise<ActionResult<TabInfo>> {
    const start = Date.now();
    try {
      if (this.pages.size >= this.config.maxTabs) {
        return actionResult('error', undefined, `Maximum tabs (${this.config.maxTabs}) reached`, undefined, start);
      }

      const page = await this.context!.newPage();
      const pageId = `tab_${++this.tabCounter}`;
      this.pages.set(pageId, page);

      page.setDefaultTimeout(this.config.defaultTimeout);
      page.setDefaultNavigationTimeout(this.config.navigationTimeout);

      await page.goto(url, { waitUntil: 'domcontentloaded' });

      const tabInfo: TabInfo = {
        id: pageId,
        url: page.url(),
        title: await page.title(),
        active: true,
      };

      // Deactivate other tabs
      for (const [id] of this.pages) {
        if (id !== pageId) {
          // Tab tracking is internal, no need to mark them
        }
      }
      this.activePageId = pageId;

      return actionResult('success', tabInfo, undefined, url, start);
    } catch (error) {
      return actionResult('error', undefined, (error as Error).message, undefined, start);
    }
  }

  async switchTab(tabId: string): Promise<ActionResult<TabInfo>> {
    const start = Date.now();
    const page = this.pages.get(tabId);
    if (!page) {
      return actionResult('error', undefined, `Tab not found: ${tabId}`, undefined, start);
    }

    this.activePageId = tabId;
    await page.bringToFront();

    const tabInfo: TabInfo = {
      id: tabId,
      url: page.url(),
      title: await page.title(),
      active: true,
    };

    return actionResult('success', tabInfo, undefined, page.url(), start);
  }

  async closeTab(tabId: string): Promise<ActionResult<void>> {
    const start = Date.now();
    const page = this.pages.get(tabId);
    if (!page) {
      return actionResult('error', undefined, `Tab not found: ${tabId}`, undefined, start);
    }

    await page.close();
    this.pages.delete(tabId);

    if (this.activePageId === tabId) {
      // Switch to another tab
      const remaining = Array.from(this.pages.keys());
      this.activePageId = remaining.length > 0 ? remaining[0] : null;
    }

    return actionResult('success', undefined, undefined, undefined, start);
  }

  async getTabs(): Promise<TabInfo[]> {
    const tabs: TabInfo[] = [];
    for (const [id, page] of this.pages) {
      tabs.push({
        id,
        url: page.url(),
        title: await page.title().catch(() => ''),
        active: id === this.activePageId,
      });
    }
    return tabs;
  }

  // ─── Cookies / Storage ───────────────────────────────

  async getCookies(): Promise<ActionResult<CookieInfo[]>> {
    const start = Date.now();
    try {
      const context = this.context!;
      const cookies = await context.cookies();
      const mapped: CookieInfo[] = cookies.map((c: PwCookie) => ({
        name: c.name,
        value: c.value,
        domain: c.domain,
        path: c.path,
        expires: c.expires,
        httpOnly: c.httpOnly,
        secure: c.secure,
        sameSite: (c.sameSite as 'Strict' | 'Lax' | 'None') ?? 'Lax',
      }));
      return actionResult('success', mapped, undefined, undefined, start);
    } catch (error) {
      return actionResult('error', undefined, (error as Error).message, undefined, start);
    }
  }

  async setCookie(cookie: CookieInfo): Promise<ActionResult<void>> {
    const start = Date.now();
    try {
      await this.context!.addCookies([{
        name: cookie.name,
        value: cookie.value,
        domain: cookie.domain,
        path: cookie.path,
        expires: cookie.expires,
        httpOnly: cookie.httpOnly,
        secure: cookie.secure,
        sameSite: cookie.sameSite,
      }]);
      return actionResult('success', undefined, undefined, undefined, start);
    } catch (error) {
      return actionResult('error', undefined, (error as Error).message, undefined, start);
    }
  }

  async clearCookies(): Promise<ActionResult<void>> {
    const start = Date.now();
    try {
      await this.context!.clearCookies();
      return actionResult('success', undefined, undefined, undefined, start);
    } catch (error) {
      return actionResult('error', undefined, (error as Error).message, undefined, start);
    }
  }

  async getStorage(): Promise<ActionResult<StorageInfo>> {
    const start = Date.now();
    try {
      const page = this.getActivePage();
      const [localStorage, sessionStorage] = await page.evaluate(() => [
        Object.fromEntries(Object.entries(window.localStorage)),
        Object.fromEntries(Object.entries(window.sessionStorage)),
      ]);
      const result: StorageInfo = { localStorage, sessionStorage };
      return actionResult('success', result, undefined, page.url(), start);
    } catch (error) {
      return actionResult('error', undefined, (error as Error).message, undefined, start);
    }
  }

  // ─── Form ────────────────────────────────────────────

  async fillForm(fields: FormField[]): Promise<ActionResult<void>> {
    const start = Date.now();
    try {
      const page = this.getActivePage();
      for (const field of fields) {
        switch (field.type) {
          case 'text':
          case 'email':
          case 'password':
          case 'textarea':
            await page.fill(field.selector, field.value);
            break;
          case 'select':
            await page.selectOption(field.selector, field.value);
            break;
          case 'checkbox':
            if (field.value === 'true' || field.value === 'checked') {
              await page.check(field.selector);
            } else {
              await page.uncheck(field.selector);
            }
            break;
          case 'radio':
            await page.click(field.selector);
            break;
          case 'file':
            await page.setInputFiles(field.selector, field.value);
            break;
        }
        if (this.config.stealth) {
          await this.randomDelay(100, 300);
        }
      }
      return actionResult('success', undefined, undefined, page.url(), start);
    } catch (error) {
      return actionResult('error', undefined, (error as Error).message, undefined, start);
    }
  }

  async submitForm(selector: string): Promise<ActionResult<NavigateResult>> {
    const start = Date.now();
    try {
      const page = this.getActivePage();
      await page.click(selector);
      await page.waitForLoadState('domcontentloaded').catch(() => {});
      const result: NavigateResult = {
        url: page.url(),
        title: await page.title(),
        statusCode: 200,
        redirectChain: [],
      };
      return actionResult('success', result, undefined, page.url(), start);
    } catch (error) {
      return actionResult('error', undefined, (error as Error).message, undefined, start);
    }
  }

  // ─── File Upload ─────────────────────────────────────

  async upload(selector: string, filePaths: string[]): Promise<ActionResult<void>> {
    const start = Date.now();
    try {
      const page = this.getActivePage();
      await page.setInputFiles(selector, filePaths);
      return actionResult('success', undefined, undefined, page.url(), start);
    } catch (error) {
      return actionResult('error', undefined, (error as Error).message, undefined, start);
    }
  }

  // ─── Browser Memory ──────────────────────────────────

  getMemory(): IBrowserMemory {
    return this.memory;
  }

  // ─── Private Helpers ─────────────────────────────────

  private getActivePage(): Page {
    if (!this.activePageId || !this.pages.has(this.activePageId)) {
      throw new Error('No active page. Call launch() first.');
    }
    return this.pages.get(this.activePageId)!;
  }

  private randomDelay(minMs: number, maxMs: number): Promise<void> {
    const delay = this.randomBetween(minMs, maxMs);
    return new Promise((resolve) => setTimeout(resolve, delay));
  }

  private randomBetween(min: number, max: number): number {
    return Math.floor(Math.random() * (max - min + 1)) + min;
  }

  // ─── Search Result Extractors ────────────────────────

  private async extractGoogleResults(page: Page): Promise<SearchItem[]> {
    return page.evaluate(() => {
      const items: SearchItem[] = [];
      const results = document.querySelectorAll('#search .g');
      results.forEach((result, index) => {
        const titleEl = result.querySelector('h3');
        const linkEl = result.querySelector('a[href]');
        const snippetEl = result.querySelector('[data-sncf], .VwiC3b, [style*="-webkit-line-clamp"]');
        if (titleEl && linkEl) {
          items.push({
            title: titleEl.textContent?.trim() ?? '',
            url: (linkEl as HTMLAnchorElement).href,
            snippet: snippetEl?.textContent?.trim() ?? '',
            position: index + 1,
          });
        }
      });
      return items;
    });
  }

  private async extractGitHubResults(page: Page): Promise<SearchItem[]> {
    return page.evaluate(() => {
      const items: SearchItem[] = [];
      const results = document.querySelectorAll('[data-testid="results-list"] > div, .search-title');
      results.forEach((result, index) => {
        const linkEl = result.querySelector('a[href]');
        const descEl = result.querySelector('p');
        if (linkEl) {
          items.push({
            title: linkEl.textContent?.trim() ?? '',
            url: (linkEl as HTMLAnchorElement).href,
            snippet: descEl?.textContent?.trim() ?? '',
            position: index + 1,
          });
        }
      });
      return items;
    });
  }

  private async extractArxivResults(page: Page): Promise<SearchItem[]> {
    return page.evaluate(() => {
      const items: SearchItem[] = [];
      const results = document.querySelectorAll('.arxiv-result, li.arxiv-result');
      results.forEach((result, index) => {
        const titleEl = result.querySelector('p.title, .title a');
        const linkEl = result.querySelector('a[href*="abs"]');
        const snippetEl = result.querySelector('.abstract-short, span.abstract-short');
        if (titleEl) {
          items.push({
            title: titleEl.textContent?.trim() ?? '',
            url: (linkEl as HTMLAnchorElement)?.href ?? '',
            snippet: snippetEl?.textContent?.trim() ?? '',
            position: index + 1,
          });
        }
      });
      return items;
    });
  }

  private async extractGenericResults(page: Page): Promise<SearchItem[]> {
    return page.evaluate(() => {
      const items: SearchItem[] = [];
      const links = document.querySelectorAll('a[href]');
      const seen = new Set<string>();
      let position = 0;
      links.forEach((a) => {
        const href = (a as HTMLAnchorElement).href;
        const text = a.textContent?.trim() ?? '';
        // Filter out navigation links and duplicates
        if (text.length > 10 && !seen.has(href) && !href.includes('#') &&
            (href.startsWith('http://') || href.startsWith('https://'))) {
          seen.add(href);
          items.push({
            title: text.substring(0, 200),
            url: href,
            snippet: '',
            position: ++position,
          });
        }
      });
      return items.slice(0, 20);
    });
  }
}

// Re-export SearchItem for internal use
import type { SearchItem as SearchItemType } from './types.js';
