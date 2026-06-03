import { createHash } from 'crypto';

interface CacheEntry<T> {
  value: T;
  expires: number;
}

class CacheManager {
  private l1: Map<string, CacheEntry<unknown>> = new Map();
  private l2: Map<string, CacheEntry<unknown>> = new Map();
  private l1MaxSize = 100;
  private l1TTL = 60_000; // 60 seconds
  private l2TTL = 3_600_000; // 1 hour

  private generateKey(prompt: string, config: string): string {
    return createHash('sha256').update(`${prompt}::${config}`).digest('hex');
  }

  get<T>(prompt: string, config: string): T | null {
    const key = this.generateKey(prompt, config);
    const now = Date.now();

    // Check L1
    const l1Entry = this.l1.get(key);
    if (l1Entry && l1Entry.expires > now) {
      return l1Entry.value as T;
    }
    if (l1Entry) this.l1.delete(key);

    // Check L2
    const l2Entry = this.l2.get(key);
    if (l2Entry && l2Entry.expires > now) {
      // Promote to L1
      this.l1.set(key, { value: l2Entry.value, expires: now + this.l1TTL });
      this.evictL1();
      return l2Entry.value as T;
    }
    if (l2Entry) this.l2.delete(key);

    return null;
  }

  set<T>(prompt: string, config: string, value: T): void {
    const key = this.generateKey(prompt, config);
    const now = Date.now();

    this.l1.set(key, { value, expires: now + this.l1TTL });
    this.l2.set(key, { value, expires: now + this.l2TTL });
    this.evictL1();
  }

  invalidate(prompt: string, config: string): void {
    const key = this.generateKey(prompt, config);
    this.l1.delete(key);
    this.l2.delete(key);
  }

  clear(): void {
    this.l1.clear();
    this.l2.clear();
  }

  private evictL1(): void {
    if (this.l1.size <= this.l1MaxSize) return;
    const now = Date.now();
    // Remove expired entries first
    for (const [key, entry] of this.l1) {
      if (entry.expires <= now) this.l1.delete(key);
    }
    // If still over limit, remove oldest
    if (this.l1.size > this.l1MaxSize) {
      const keys = Array.from(this.l1.keys());
      const toRemove = keys.slice(0, keys.length - this.l1MaxSize);
      for (const key of toRemove) {
        this.l1.delete(key);
      }
    }
  }

  stats() {
    const now = Date.now();
    let l1Active = 0;
    let l2Active = 0;
    for (const entry of this.l1.values()) {
      if (entry.expires > now) l1Active++;
    }
    for (const entry of this.l2.values()) {
      if (entry.expires > now) l2Active++;
    }
    return { l1Size: l1Active, l2Size: l2Active, l1MaxSize: this.l1MaxSize };
  }
}

export const cacheManager = new CacheManager();
