/**
 * ALTER EGO OS — Browser Capability Tests
 *
 * Tests that verify the browser capability works with real Playwright.
 * Uses example.com and other stable test sites.
 */

import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { BrowserCapability } from '../index.js';
import type { ActionResult } from '../index.js';

describe('BrowserCapability', () => {
  let browser: BrowserCapability;

  beforeAll(async () => {
    browser = new BrowserCapability({
      headless: true,
      defaultTimeout: 15000,
      navigationTimeout: 20000,
      stealth: false, // Disable stealth for tests
    });
    await browser.launch();
  });

  afterAll(async () => {
    await browser.close();
  });

  // ─── Lifecycle ───────────────────────────────────────

  describe('lifecycle', () => {
    it('should be running after launch', () => {
      expect(browser.isRunning()).toBe(true);
    });

    it('should not be running after close', async () => {
      const testBrowser = new BrowserCapability({ headless: true });
      await testBrowser.launch();
      expect(testBrowser.isRunning()).toBe(true);
      await testBrowser.close();
      expect(testBrowser.isRunning()).toBe(false);
    });
  });

  // ─── Navigation ──────────────────────────────────────

  describe('navigation', () => {
    it('should open a URL and return page info', async () => {
      const result = await browser.open('https://example.com');
      expect(result.status).toBe('success');
      expect(result.data?.url).toContain('example.com');
      expect(result.data?.title).toBeTruthy();
      expect(result.data?.statusCode).toBe(200);
    });

    it('should get the current URL', async () => {
      await browser.open('https://example.com');
      const url = await browser.getCurrentUrl();
      expect(url).toContain('example.com');
    });

    it('should get the page title', async () => {
      await browser.open('https://example.com');
      const title = await browser.getTitle();
      expect(title).toBeTruthy();
    });

    it('should reload the page', async () => {
      await browser.open('https://example.com');
      const result = await browser.reload();
      expect(result.status).toBe('success');
      expect(result.data?.url).toContain('example.com');
    });

    it('should handle non-existent URLs gracefully', async () => {
      const result = await browser.open('https://thisdomaindoesnotexist12345.com');
      expect(result.status).toBe('error');
    });
  });

  // ─── Extraction ──────────────────────────────────────

  describe('extraction', () => {
    it('should extract page content', async () => {
      await browser.open('https://example.com');
      const result = await browser.extractPageContent();
      expect(result.status).toBe('success');
      expect(result.data?.url).toContain('example.com');
      expect(result.data?.title).toBeTruthy();
      expect(result.data?.text).toBeTruthy();
      expect(result.data?.links).toBeInstanceOf(Array);
    });

    it('should extract text from a selector', async () => {
      await browser.open('https://example.com');
      const result = await browser.extract('h1');
      expect(result.status).toBe('success');
      expect(result.data?.text).toBeTruthy();
    });

    it('should extract links from the page', async () => {
      await browser.open('https://example.com');
      const result = await browser.extractLinks();
      expect(result.status).toBe('success');
      expect(result.data).toBeInstanceOf(Array);
    });

    it('should extract meta information', async () => {
      await browser.open('https://example.com');
      const result = await browser.extractMeta();
      expect(result.status).toBe('success');
      expect(result.data?.title).toBeTruthy();
    });
  });

  // ─── Scrolling ───────────────────────────────────────

  describe('scrolling', () => {
    it('should scroll down', async () => {
      await browser.open('https://example.com');
      const result = await browser.scroll('down', 100);
      expect(result.status).toBe('success');
      expect(result.data?.direction).toBe('down');
      expect(result.data?.pixels).toBe(100);
    });

    it('should scroll up', async () => {
      await browser.open('https://example.com');
      await browser.scroll('down', 200);
      const result = await browser.scroll('up', 100);
      expect(result.status).toBe('success');
      expect(result.data?.direction).toBe('up');
    });
  });

  // ─── Waiting ─────────────────────────────────────────

  describe('waiting', () => {
    it('should wait for a selector', async () => {
      await browser.open('https://example.com');
      const result = await browser.waitFor('h1', 5000);
      expect(result.status).toBe('success');
      expect(result.data?.found).toBe(true);
    });

    it('should wait for a fixed duration', async () => {
      const result = await browser.wait(100);
      expect(result.status).toBe('success');
    });

    it('should timeout when selector not found', async () => {
      await browser.open('https://example.com');
      const result = await browser.waitFor('.nonexistent-selector-12345', 1000);
      expect(result.status).toBe('timeout');
    });
  });

  // ─── Screenshot ──────────────────────────────────────

  describe('screenshot', () => {
    it('should take a full page screenshot', async () => {
      await browser.open('https://example.com');
      const result = await browser.screenshot();
      expect(result.status).toBe('success');
      expect(result.data?.path).toBeTruthy();
      expect(result.data?.sizeBytes).toBeGreaterThan(0);
    });
  });

  // ─── Tabs ────────────────────────────────────────────

  describe('tabs', () => {
    it('should open a new tab', async () => {
      await browser.open('https://example.com');
      const result = await browser.openTab('https://example.com');
      expect(result.status).toBe('success');
      expect(result.data?.url).toContain('example.com');
      expect(result.data?.id).toBeTruthy();
    });

    it('should list all tabs', async () => {
      const tabs = await browser.getTabs();
      expect(tabs.length).toBeGreaterThanOrEqual(1);
      expect(tabs[0].id).toBeTruthy();
    });

    it('should switch between tabs', async () => {
      const tabs = await browser.getTabs();
      if (tabs.length >= 2) {
        const result = await browser.switchTab(tabs[0].id);
        expect(result.status).toBe('success');
      }
    });
  });

  // ─── Cookies ─────────────────────────────────────────

  describe('cookies', () => {
    it('should get cookies', async () => {
      await browser.open('https://example.com');
      const result = await browser.getCookies();
      expect(result.status).toBe('success');
      expect(result.data).toBeInstanceOf(Array);
    });

    it('should set a cookie', async () => {
      await browser.open('https://example.com');
      const result = await browser.setCookie({
        name: 'test_cookie',
        value: 'test_value',
        domain: 'example.com',
        path: '/',
        expires: Date.now() / 1000 + 3600,
        httpOnly: false,
        secure: false,
        sameSite: 'Lax',
      });
      expect(result.status).toBe('success');
    });

    it('should clear cookies', async () => {
      const result = await browser.clearCookies();
      expect(result.status).toBe('success');
    });
  });

  // ─── Browser Memory ──────────────────────────────────

  describe('browser memory', () => {
    it('should add and retrieve bookmarks', async () => {
      const memory = browser.getMemory();
      await memory.addBookmark('https://example.com', 'Example', ['test']);
      const bookmarks = await memory.getBookmarks(['test']);
      expect(bookmarks.length).toBeGreaterThan(0);
      expect(bookmarks[0].url).toBe('https://example.com');
    });

    it('should track browsing history', async () => {
      const memory = browser.getMemory();
      await memory.addToHistory('https://example.com', 'Example');
      const history = await memory.getHistory(10);
      expect(history.length).toBeGreaterThan(0);
    });

    it('should save and list sessions', async () => {
      const memory = browser.getMemory();
      await memory.saveSession('example.com');
      expect(memory.hasSession('example.com')).toBe(true);
      const sessions = await memory.listSessions();
      expect(sessions.length).toBeGreaterThan(0);
    });

    it('should delete a session', async () => {
      const memory = browser.getMemory();
      await memory.saveSession('test-delete.com');
      expect(memory.hasSession('test-delete.com')).toBe(true);
      await memory.deleteSession('test-delete.com');
      expect(memory.hasSession('test-delete.com')).toBe(false);
    });

    it('should clear history', async () => {
      const memory = browser.getMemory();
      await memory.addToHistory('https://test.com', 'Test');
      await memory.clearHistory();
      const history = await memory.getHistory();
      expect(history.length).toBe(0);
    });
  });

  // ─── Search ──────────────────────────────────────────

  describe('search', () => {
    it('should search DuckDuckGo (no JS required)', async () => {
      const result = await browser.search('playwright testing', 'duckduckgo');
      expect(result.status).toBe('success');
      expect(result.data?.query).toBe('playwright testing');
      expect(result.data?.engine).toBe('duckduckgo');
      // DuckDuckGo may or may not return results depending on their anti-bot measures
      // Just check the structure is correct
      expect(result.data?.results).toBeInstanceOf(Array);
    }, 30000);

    it('should reject unknown search engines', async () => {
      const result = await browser.search('test', 'unknown_engine' as any);
      expect(result.status).toBe('error');
    });
  });
});
