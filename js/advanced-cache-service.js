const AdvancedCacheService = {
    initialized: false,
    memoryCache: new Map(),
    storageCache: new Map(),
    cacheConfig: {
        memory: {
            maxSize: 100,
            defaultTTL: 5 * 60 * 1000
        },
        storage: {
            maxSize: 50,
            defaultTTL: 30 * 60 * 1000,
            storageKey: 'app_cache'
        }
    },
    stats: {
        hits: 0,
        misses: 0,
        sets: 0,
        deletes: 0
    },
    
    async init(config = {}) {
        if (this.initialized) return;
        
        this.cacheConfig = { ...this.cacheConfig, ...config };
        this.loadFromStorage();
        this.initialized = true;
        
        console.log('[AdvancedCacheService] 缓存服务初始化完成');
        console.log('[AdvancedCacheService] 缓存配置:', this.cacheConfig);
    },
    
    set(key, value, options = {}) {
        const {
            ttl = this.cacheConfig.memory.defaultTTL,
            storage = false
        } = options;
        
        const cacheEntry = {
            value,
            timestamp: Date.now(),
            ttl,
            hits: 0
        };
        
        if (storage) {
            this.setStorage(key, cacheEntry);
        } else {
            this.setMemory(key, cacheEntry);
        }
        
        this.stats.sets++;
        console.log(`[AdvancedCacheService] 设置缓存: ${key}`);
    },
    
    setMemory(key, entry) {
        if (this.memoryCache.size >= this.cacheConfig.memory.maxSize) {
            this.evictMemory();
        }
        
        this.memoryCache.set(key, entry);
    },
    
    setStorage(key, entry) {
        try {
            const storage = this.getStorage();
            
            if (storage.size >= this.cacheConfig.storage.maxSize) {
                this.evictStorage(storage);
            }
            
            storage.set(key, entry);
            this.saveToStorage(storage);
        } catch (error) {
            console.error('[AdvancedCacheService] 存储缓存失败:', error);
        }
    },
    
    get(key, options = {}) {
        const { storage = false, refresh = false } = options;
        
        if (storage) {
            return this.getStorageValue(key, refresh);
        } else {
            return this.getMemoryValue(key, refresh);
        }
    },
    
    getMemoryValue(key, refresh = false) {
        const entry = this.memoryCache.get(key);
        
        if (!entry) {
            this.stats.misses++;
            return null;
        }
        
        if (this.isExpired(entry)) {
            this.memoryCache.delete(key);
            this.stats.misses++;
            return null;
        }
        
        if (refresh) {
            entry.timestamp = Date.now();
            this.memoryCache.set(key, entry);
        } else {
            entry.hits++;
            this.memoryCache.set(key, entry);
        }
        
        this.stats.hits++;
        console.log(`[AdvancedCacheService] 内存缓存命中: ${key}`);
        return entry.value;
    },
    
    getStorageValue(key, refresh = false) {
        try {
            const storage = this.getStorage();
            const entry = storage.get(key);
            
            if (!entry) {
                this.stats.misses++;
                return null;
            }
            
            if (this.isExpired(entry)) {
                storage.delete(key);
                this.saveToStorage(storage);
                this.stats.misses++;
                return null;
            }
            
            if (refresh) {
                entry.timestamp = Date.now();
                storage.set(key, entry);
                this.saveToStorage(storage);
            } else {
                entry.hits++;
                storage.set(key, entry);
                this.saveToStorage(storage);
            }
            
            this.stats.hits++;
            console.log(`[AdvancedCacheService] 存储缓存命中: ${key}`);
            return entry.value;
        } catch (error) {
            console.error('[AdvancedCacheService] 获取存储缓存失败:', error);
            return null;
        }
    },
    
    has(key, options = {}) {
        const { storage = false } = options;
        
        if (storage) {
            try {
                const storage = this.getStorage();
                const entry = storage.get(key);
                return entry && !this.isExpired(entry);
            } catch {
                return false;
            }
        } else {
            const entry = this.memoryCache.get(key);
            return entry && !this.isExpired(entry);
        }
    },
    
    delete(key, options = {}) {
        const { storage = false } = options;
        
        if (storage) {
            try {
                const storage = this.getStorage();
                storage.delete(key);
                this.saveToStorage(storage);
            } catch (error) {
                console.error('[AdvancedCacheService] 删除存储缓存失败:', error);
            }
        } else {
            this.memoryCache.delete(key);
        }
        
        this.stats.deletes++;
        console.log(`[AdvancedCacheService] 删除缓存: ${key}`);
    },
    
    clear(options = {}) {
        const { storage = false, memory = false } = options;
        
        if (memory || (!storage && !memory)) {
            this.memoryCache.clear();
            console.log('[AdvancedCacheService] 清除内存缓存');
        }
        
        if (storage) {
            try {
                localStorage.removeItem(this.cacheConfig.storage.storageKey);
                console.log('[AdvancedCacheService] 清除存储缓存');
            } catch (error) {
                console.error('[AdvancedCacheService] 清除存储缓存失败:', error);
            }
        }
    },
    
    evictMemory() {
        let oldest = null;
        let oldestKey = null;
        
        this.memoryCache.forEach((entry, key) => {
            if (!oldest || entry.timestamp < oldest.timestamp) {
                oldest = entry;
                oldestKey = key;
            }
        });
        
        if (oldestKey) {
            this.memoryCache.delete(oldestKey);
            console.log(`[AdvancedCacheService] 淘汰内存缓存: ${oldestKey}`);
        }
    },
    
    evictStorage(storage) {
        let oldest = null;
        let oldestKey = null;
        
        storage.forEach((entry, key) => {
            if (!oldest || entry.timestamp < oldest.timestamp) {
                oldest = entry;
                oldestKey = key;
            }
        });
        
        if (oldestKey) {
            storage.delete(oldestKey);
            console.log(`[AdvancedCacheService] 淘汰存储缓存: ${oldestKey}`);
        }
    },
    
    isExpired(entry) {
        if (!entry.ttl) return false;
        return Date.now() - entry.timestamp > entry.ttl;
    },
    
    getStorage() {
        try {
            const data = localStorage.getItem(this.cacheConfig.storage.storageKey);
            if (!data) return new Map();
            return new Map(JSON.parse(data));
        } catch {
            return new Map();
        }
    },
    
    saveToStorage(storage) {
        try {
            const data = JSON.stringify(Array.from(storage.entries()));
            localStorage.setItem(this.cacheConfig.storage.storageKey, data);
        } catch (error) {
            console.error('[AdvancedCacheService] 保存存储缓存失败:', error);
            this.handleStorageOverflow(storage);
        }
    },
    
    handleStorageOverflow(storage) {
        while (storage.size > 0) {
            try {
                localStorage.setItem(this.cacheConfig.storage.storageKey, JSON.stringify(Array.from(storage.entries())));
                break;
            } catch {
                this.evictStorage(storage);
            }
        }
    },
    
    loadFromStorage() {
        try {
            const data = localStorage.getItem(this.cacheConfig.storage.storageKey);
            if (!data) return;
            
            const entries = JSON.parse(data);
            entries.forEach(([key, entry]) => {
                if (!this.isExpired(entry)) {
                    this.storageCache.set(key, entry);
                }
            });
            
            console.log(`[AdvancedCacheService] 从存储加载 ${this.storageCache.size} 个缓存项`);
        } catch (error) {
            console.error('[AdvancedCacheService] 从存储加载缓存失败:', error);
        }
    },
    
    getStats() {
        const total = this.stats.hits + this.stats.misses;
        const hitRate = total > 0 ? (this.stats.hits / total * 100).toFixed(2) : 0;
        
        return {
            memorySize: this.memoryCache.size,
            storageSize: this.storageCache.size,
            hits: this.stats.hits,
            misses: this.stats.misses,
            sets: this.stats.sets,
            deletes: this.stats.deletes,
            hitRate: `${hitRate}%`
        };
    },
    
    async getOrSet(key, fetchFn, options = {}) {
        const { storage = false, ttl, refresh = false } = options;
        
        let value = this.get(key, { storage, refresh });
        
        if (value === null) {
            console.log(`[AdvancedCacheService] 缓存未命中，执行fetchFn: ${key}`);
            
            value = await fetchFn();
            
            if (value !== undefined && value !== null) {
                this.set(key, value, { storage, ttl });
            }
        }
        
        return value;
    },
    
    invalidatePattern(pattern) {
        const regex = new RegExp(pattern);
        let count = 0;
        
        this.memoryCache.forEach((_, key) => {
            if (regex.test(key)) {
                this.memoryCache.delete(key);
                count++;
            }
        });
        
        console.log(`[AdvancedCacheService] 失效匹配 ${pattern} 的 ${count} 个缓存项`);
        return count;
    },
    
    preload(keys, fetchFn, options = {}) {
        return Promise.all(
            keys.map(key => this.getOrSet(key, () => fetchFn(key), options))
        );
    },
    
    watch(key, callback, options = {}) {
        const { interval = 1000 } = options;
        
        const watcher = setInterval(() => {
            const value = this.get(key, { refresh: true });
            callback(value);
        }, interval);
        
        return () => clearInterval(watcher);
    },
    
    memoize(fn, options = {}) {
        const { ttl, storage } = options;
        
        return (...args) => {
            const key = this.generateKey(fn.name, args);
            const cached = this.get(key, { storage });
            
            if (cached !== null) {
                return cached;
            }
            
            const result = fn(...args);
            
            if (result instanceof Promise) {
                return result.then(value => {
                    this.set(key, value, { storage, ttl });
                    return value;
                });
            }
            
            this.set(key, result, { storage, ttl });
            return result;
        };
    },
    
    generateKey(fnName, args) {
        return `${fnName}:${JSON.stringify(args)}`;
    },
    
    cleanup() {
        const now = Date.now();
        let cleaned = 0;
        
        this.memoryCache.forEach((entry, key) => {
            if (this.isExpired(entry)) {
                this.memoryCache.delete(key);
                cleaned++;
            }
        });
        
        try {
            const storage = this.getStorage();
            storage.forEach((entry, key) => {
                if (this.isExpired(entry)) {
                    storage.delete(key);
                    cleaned++;
                }
            });
            this.saveToStorage(storage);
        } catch (error) {
            console.error('[AdvancedCacheService] 清理存储缓存失败:', error);
        }
        
        console.log(`[AdvancedCacheService] 清理完成，删除 ${cleaned} 个过期项`);
        return cleaned;
    }
};

window.AdvancedCacheService = AdvancedCacheService;