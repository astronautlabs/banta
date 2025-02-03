import { deepCopy } from "./deep-copy";

export interface CacheEntry<T> {
    key: string;
    cachedAt: number;
    usedAt: number;
    expiresAt: number;
    lastFetched: number;
    value: T;
}

export interface CacheFetcher<T> {
    (skip: Function): Promise<T>;
}

export interface FetchOptions {
    /**
     * The time to live to set for a fulfilled item
     */
    timeToLive?: number;

    /**
     * What kind of cache miss strategy should be used here.
     * - "fulfill":
     *   If the cache misses for any reason, wait until the new value is fetched and return it
     * - "fallback-refresh":
     *   If the cache misses
     */
    missStrategy?: "fulfill" | "fallback-refresh";
}

var SHARED_CACHES: Map<string, Cache<any>> = new Map<string, Cache<any>>();
var SHARED_CACHES_LAST_CLEARED: number = 0;
var SHARED_CACHES_ENABLED: boolean = true;

export interface CacheSettings {

    /**
     * Default time that a cached item should be considered valid before expiring, in milliseconds
     */
    timeToLive: number;

    /**
     * Amount of items that can be held in the cache maximum.
     */
    maxItems: number;
    evictionStrategy?: 'age' | 'lru';

    /**
     * When true (default), objects returned from cache APIs are deep-copied, and thus distinct from the 
     * actual data stored in the cache.
     */
    deepCopy?: boolean;
}

export class Cache<T> {
    /**
     *
     */
    public constructor(readonly name: string, readonly settings: CacheSettings) {
        settings.evictionStrategy ??= 'age';
        settings.deepCopy ??= true;
    }

    protected entries = new Map<string, CacheEntry<T>>();

    getInternalEntries() {
        return this.entries;
    }

    public clear() {
        this.entries.clear();
    }

    public delete(key: string) {
        this.entries.delete(key);
    }

    public static getSharedCachesEnabled() {
        return SHARED_CACHES_ENABLED;
    }

    public static setSharedCachesEnabled(enabled) {
        SHARED_CACHES_ENABLED = enabled;
        if (!enabled)
            this.clearShared();
    }

    /**
     * Immediately clear the contents of all shared caches
     */
    public static clearShared(timestamp?) {

        // If a timestamp is passed, only clear the cache if we haven't cleared it since
        // the given timestamp
        if (timestamp) {
            if (SHARED_CACHES_LAST_CLEARED >= timestamp)
                return;
        }

        SHARED_CACHES_LAST_CLEARED = Date.now();
        SHARED_CACHES.forEach(cache => cache.clear());
    }

    /**
     * Get a cache shared by all end users when used in SSR (CAUTION). On the client side, it gets a cache
     * shared globally within the browser tab (in memory).
     * @param name
     * @param timeToLive
     * @param maxItems
     * @returns
     */
    public static shared<T>(name: string, settings: CacheSettings): Cache<T> {
        if (!SHARED_CACHES_ENABLED) {
            let cache = new Cache<T>(name, settings);
            return cache;
        }

        if (!SHARED_CACHES.has(name)) {
            let sharedCache = new Cache<T>(name, settings);
            SHARED_CACHES.set(name, sharedCache);
            return sharedCache;
        }

        return SHARED_CACHES.get(name);
    }

    /**
     * Cache cleanup routine run whenever a value is stored in the cache
     */
    private async sliceCleanup() {

        let keys = Array.from(this.entries.keys());
        if (keys.length < this.settings.maxItems)
            return;

        setTimeout(() => {

            // Refresh the current count, and trim the
            // cache to the right size, evicting last-fetched item
            // first.

            keys = Array.from(this.entries.keys());
            let itemCount = keys.length;

            while (itemCount > this.settings.maxItems) {
                let entry = this.getOldestEntry();
                this.entries.delete(entry.key);
                --itemCount;
            }
        }, 100);
    }

    public getItem(key: string): CacheEntry<T> {
        let entry = this.entries.get(key);
        if (entry)
            entry.usedAt = Date.now();
        return entry;
    }

    public getEvictionCandidate(): CacheEntry<T> {
        if (this.settings.evictionStrategy === 'age')
            return this.getOldestEntry();
        else if (this.settings.evictionStrategy === 'lru')
            return this.getLeastRecentlyUsedEntry();
    }

    public getLeastRecentlyUsedEntry(): CacheEntry<T> {
        let selectedEntry: CacheEntry<T> = null;
        for (let entry of this.entries.values()) {
            if (!selectedEntry || selectedEntry.usedAt > entry.usedAt)
                selectedEntry = entry;
        }

        return selectedEntry;
    }

    public getOldestEntry(): CacheEntry<T> {
        let selectedEntry: CacheEntry<T> = null;
        for (let entry of this.entries.values()) {
            if (!selectedEntry || selectedEntry.cachedAt > entry.cachedAt)
                selectedEntry = entry;
        }

        return selectedEntry;
    }

    /**
     * Insert an item into the cache with the given time to live. If not provided, the default is used.
     * @param key
     * @param value
     * @param timeToLive
     */
    public insertItem(key: string, value: T, timeToLive?: number) {
        if (timeToLive === undefined)
            timeToLive = this.settings.timeToLive;

        // Compute the value
        let now = new Date().getTime();
        let entry: CacheEntry<T> = {
            key,
            cachedAt: now,
            expiresAt: now + timeToLive,
            usedAt: now,
            lastFetched: now,
            value: this.settings.deepCopy ? deepCopy(value) : value
        };

        this.entries.set(key, entry);

        this.sliceCleanup();
    }

    private fetchesInProgress = {};

    /**
     * Get the value of the given key, but if it is not present in the cache or is expired, execute the
     * provided fetcher function to fill the cache.
     *
     * @param key
     * @param fetcher
     * @param options
     * @returns
     */
    public async fetch(key: string, fetcher?: CacheFetcher<T>, options: FetchOptions = {}): Promise<T> {
        if (this.fetchesInProgress[key]) {
            let result = await this.fetchesInProgress[key];
            return this.settings.deepCopy ? deepCopy(result) : result;
        }

        let response = await (this.fetchesInProgress[key] = this.fetchImmediate(key, fetcher, options));
        delete this.fetchesInProgress[key];
        return this.settings.deepCopy ? deepCopy(response) : response;
    }

    /**
     * Get the value of an unexpired cache entry for the given key.
     * @param key
     * @returns
     */
    get(key: string): T {
        let item = this.getItem(key);
        if (!item || item.expiresAt < Date.now())
            return undefined;
        return item.value;
    }

    /**
     * Internal implementation of the fetch() routine.
     * @param key
     * @param fetcher
     * @param options
     * @returns
     */
    private async fetchImmediate(key: string, fetcher?: CacheFetcher<T>, options: FetchOptions = {}): Promise<T> {

        let entry: CacheEntry<T>;
        let now = Date.now();
        let availableCachedItem = null;
        let timeToLive = options.timeToLive;

        if (this.entries.has(key)) {
            let hitEntry = this.entries.get(key);
            hitEntry.usedAt = Date.now();
            availableCachedItem = hitEntry.value;
            if (hitEntry.expiresAt > now) {
                entry = hitEntry;
            }
        }

        if (entry)
            return this.settings.deepCopy ? deepCopy(entry.value) : entry.value;

        if (!fetcher)
            return availableCachedItem;

        // Fetch!
        let value: T;
        let fillCache: boolean = true;
        try {
            value = await fetcher(() => fillCache = false);
            if (fillCache)
                this.insertItem(key, value, timeToLive);
        } catch (e) {
            if (availableCachedItem) {
                console.error(`[Cache/${this.name}] Using stale value due to fetch failure for item '${key}': ${e.stack}`);
                return availableCachedItem;
            }

            if (typeof e === 'string' && e.includes('Run pending migrations'))
                throw new Error(`Failed to fetch content with key '${key}': Backend requires migrations to be run.`);

            throw e;
        }



        return value;
    }
}