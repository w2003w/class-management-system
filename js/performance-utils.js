// 性能优化工具库
const PerformanceUtils = {
    // 防抖函数
    debounce(func, wait) {
        let timeout;
        return function executedFunction(...args) {
            const later = () => {
                clearTimeout(timeout);
                func(...args);
            };
            clearTimeout(timeout);
            timeout = setTimeout(later, wait);
        };
    },

    // 节流函数
    throttle(func, limit) {
        let inThrottle;
        return function(...args) {
            if (!inThrottle) {
                func.apply(this, args);
                inThrottle = true;
                setTimeout(() => inThrottle = false, limit);
            }
        };
    },

    // 内存缓存
    memoryCache: new Map(),
    
    // 设置缓存
    setCache(key, value, ttlMinutes = 5) {
        const expires = Date.now() + (ttlMinutes * 60 * 1000);
        this.memoryCache.set(key, { value, expires });
    },

    // 获取缓存
    getCache(key) {
        const item = this.memoryCache.get(key);
        if (!item) return null;
        if (Date.now() > item.expires) {
            this.memoryCache.delete(key);
            return null;
        }
        return item.value;
    },

    // 清除缓存
    clearCache(key) {
        if (key) {
            this.memoryCache.delete(key);
        } else {
            this.memoryCache.clear();
        }
    },

    // 批量操作队列
    batchQueue: [],
    batchTimer: null,
    
    // 添加到批量队列
    addToBatch(operation) {
        this.batchQueue.push(operation);
        if (this.batchTimer) clearTimeout(this.batchTimer);
        this.batchTimer = setTimeout(() => this.processBatch(), 100);
    },

    // 处理批量操作
    async processBatch() {
        if (this.batchQueue.length === 0) return;
        const operations = [...this.batchQueue];
        this.batchQueue = [];
        
        // 批量执行
        await Promise.all(operations.map(op => op()));
    },

    // 虚拟列表渲染
    virtualList(container, items, renderItem, itemHeight, visibleCount) {
        const totalHeight = items.length * itemHeight;
        container.style.height = `${totalHeight}px`;
        container.style.position = 'relative';
        container.style.overflow = 'auto';
        
        const visibleItems = [];
        const buffer = 5; // 上下缓冲数量
        
        const render = () => {
            const scrollTop = container.scrollTop;
            const startIndex = Math.max(0, Math.floor(scrollTop / itemHeight) - buffer);
            const endIndex = Math.min(items.length, startIndex + visibleCount + buffer * 2);
            
            // 清除不在视图内的元素
            visibleItems.forEach((el, index) => {
                const itemIndex = startIndex + index;
                if (itemIndex >= endIndex || itemIndex < startIndex) {
                    if (el && el.parentNode) el.parentNode.removeChild(el);
                }
            });
            
            // 渲染新元素
            for (let i = startIndex; i < endIndex; i++) {
                if (!visibleItems[i - startIndex]) {
                    const el = renderItem(items[i], i);
                    el.style.position = 'absolute';
                    el.style.top = `${i * itemHeight}px`;
                    el.style.height = `${itemHeight}px`;
                    el.style.width = '100%';
                    container.appendChild(el);
                    visibleItems[i - startIndex] = el;
                }
            }
        };
        
        container.addEventListener('scroll', this.throttle(render, 16));
        render();
        
        return { destroy: () => container.removeEventListener('scroll', render) };
    },

    // 图片懒加载
    lazyLoadImages(selector = 'img[data-src]') {
        const images = document.querySelectorAll(selector);
        const imageObserver = new IntersectionObserver((entries, observer) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    const img = entry.target;
                    img.src = img.dataset.src;
                    img.removeAttribute('data-src');
                    observer.unobserve(img);
                }
            });
        }, { rootMargin: '50px' });

        images.forEach(img => imageObserver.observe(img));
    },

    // 性能监控
    monitorPerformance() {
        if ('PerformanceObserver' in window) {
            const observer = new PerformanceObserver((list) => {
                for (const entry of list.getEntries()) {
                    if (entry.entryType === 'largest-contentful-paint') {
                        console.log('LCP:', entry.startTime);
                    }
                    if (entry.entryType === 'first-input') {
                        console.log('FID:', entry.processingStart - entry.startTime);
                    }
                }
            });
            observer.observe({ entryTypes: ['largest-contentful-paint', 'first-input'] });
        }
    },

    // 请求合并（用于减少API调用）
    requestPool: new Map(),
    
    async dedupeRequest(key, requestFn) {
        if (this.requestPool.has(key)) {
            return this.requestPool.get(key);
        }
        
        const promise = requestFn().finally(() => {
            setTimeout(() => this.requestPool.delete(key), 100);
        });
        
        this.requestPool.set(key, promise);
        return promise;
    }
};

// 导出
window.PerformanceUtils = PerformanceUtils;
