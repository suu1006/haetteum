type CacheEntry<V> = { value: V; expiresAt: number };

/// 만료 시간이 지난 항목은 조회 시점에 지워지는 단순 인메모리 TTL 캐시
export class TtlCache<V> {
  private readonly store = new Map<string, CacheEntry<V>>();

  constructor(private readonly ttlMs: number) {}

  get(key: string): V | undefined {
    const entry = this.store.get(key);
    if (entry === undefined) return undefined;
    if (entry.expiresAt <= Date.now()) {
      this.store.delete(key);
      return undefined;
    }
    return entry.value;
  }

  set(key: string, value: V): void {
    this.store.set(key, { value, expiresAt: Date.now() + this.ttlMs });
  }
}
