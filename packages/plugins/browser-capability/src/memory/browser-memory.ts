/**
 * ALTER EGO OS — Browser Memory
 *
 * Persists browser sessions, cookies, auth, bookmarks, and history
 * across Browser Capability invocations.
 * The browser doesn't need to re-login every time.
 */

import type {
  IBrowserMemory,
  SessionSummary,
  Bookmark,
  HistoryEntry,
} from '../types.js';

interface StoredSession {
  domain: string;
  cookies: Record<string, string>[];
  localStorage: Record<string, string>;
  sessionStorage: Record<string, string>;
  savedAt: string;
  userAgent?: string;
}

export class BrowserMemory implements IBrowserMemory {
  private sessions: Map<string, StoredSession> = new Map();
  private bookmarks: Bookmark[] = [];
  private history: HistoryEntry[] = [];
  private readonly maxHistory = 1000;
  private readonly maxBookmarks = 500;

  async saveSession(domain: string, data?: { cookies?: Record<string, string>[]; localStorage?: Record<string, string>; sessionStorage?: Record<string, string> }): Promise<void> {
    const session: StoredSession = {
      domain,
      cookies: data?.cookies ?? [],
      localStorage: data?.localStorage ?? {},
      sessionStorage: data?.sessionStorage ?? {},
      savedAt: new Date().toISOString(),
    };
    this.sessions.set(domain, session);
  }

  async restoreSession(domain: string): Promise<boolean> {
    return this.sessions.has(domain);
  }

  hasSession(domain: string): boolean {
    return this.sessions.has(domain);
  }

  async listSessions(): Promise<SessionSummary[]> {
    const summaries: SessionSummary[] = [];
    for (const [domain, session] of this.sessions) {
      summaries.push({
        domain,
        savedAt: session.savedAt,
        hasCookies: session.cookies.length > 0,
        hasStorage: Object.keys(session.localStorage).length > 0 || Object.keys(session.sessionStorage).length > 0,
      });
    }
    return summaries;
  }

  async deleteSession(domain: string): Promise<void> {
    this.sessions.delete(domain);
  }

  async addBookmark(url: string, title: string, tags: string[] = []): Promise<void> {
    if (this.bookmarks.length >= this.maxBookmarks) {
      this.bookmarks.shift();
    }
    this.bookmarks.push({
      url,
      title,
      tags,
      createdAt: new Date().toISOString(),
    });
  }

  async getBookmarks(tags?: string[]): Promise<Bookmark[]> {
    if (!tags || tags.length === 0) {
      return [...this.bookmarks];
    }
    return this.bookmarks.filter((b) => tags.some((tag) => b.tags.includes(tag)));
  }

  async addToHistory(url: string, title: string): Promise<void> {
    if (this.history.length >= this.maxHistory) {
      this.history.shift();
    }
    this.history.push({
      url,
      title,
      visitedAt: new Date().toISOString(),
    });
  }

  async getHistory(limit = 100): Promise<HistoryEntry[]> {
    return this.history.slice(-limit).reverse();
  }

  async clearHistory(): Promise<void> {
    this.history = [];
  }

  // ─── Internal: Get session data for injection ────────

  getSessionData(domain: string): StoredSession | undefined {
    return this.sessions.get(domain);
  }
}
