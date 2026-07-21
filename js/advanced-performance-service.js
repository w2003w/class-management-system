const AdvancedPerformanceService = {
    initialized: false,
    metrics: {
        paint: {},
        navigation: {},
        memory: {},
        resources: [],
        custom: new Map()
    },
    observers: [],
    reportInterval: null,
    reportCallback: null,
    
    async init(options = {}) {
        if (this.initialized) return;
        
        const {
            enableNavigationTiming = true,
            enablePaintTiming = true,
            enableResourceTiming = true,
            enableMemoryTracking = true,
            reportInterval = 60000,
            reportCallback = null
        } = options;
        
        this.reportCallback = reportCallback;
        
        if (enableNavigationTiming) {
            this.observeNavigationTiming();
        }
        
        if (enablePaintTiming) {
            this.observePaintTiming();
        }
        
        if (enableResourceTiming) {
            this.observeResourceTiming();
        }
        
        if (enableMemoryTracking) {
            this.startMemoryTracking();
        }
        
        if (reportInterval > 0) {
            this.startReporting(reportInterval);
        }
        
        this.initialized = true;
        console.log('[AdvancedPerformanceService] 性能监控服务初始化完成');
    },
    
    observeNavigationTiming() {
        if (!window.PerformanceObserver) {
            console.warn('[AdvancedPerformanceService] PerformanceObserver不支持');
            return;
        }
        
        try {
            const observer = new PerformanceObserver((list) => {
                for (const entry of list.getEntries()) {
                    this.metrics.navigation[entry.name] = {
                        entryType: entry.entryType,
                        startTime: entry.startTime,
                        duration: entry.duration,
                        ...entry.toJSON()
                    };
                }
            });
            
            observer.observe({ entryTypes: ['navigation'] });
            this.observers.push(observer);
            
            console.log('[AdvancedPerformanceService] 导航性能监控已启动');
        } catch (error) {
            console.error('[AdvancedPerformanceService] 导航性能监控失败:', error);
        }
    },
    
    observePaintTiming() {
        if (!window.PerformanceObserver) return;
        
        try {
            const observer = new PerformanceObserver((list) => {
                for (const entry of list.getEntries()) {
                    this.metrics.paint[entry.name] = {
                        entryType: entry.entryType,
                        startTime: entry.startTime,
                        duration: entry.duration
                    };
                }
            });
            
            observer.observe({ entryTypes: ['paint', 'first-input', 'largest-contentful-paint'] });
            this.observers.push(observer);
            
            console.log('[AdvancedPerformanceService] 绘制性能监控已启动');
        } catch (error) {
            console.error('[AdvancedPerformanceService] 绘制性能监控失败:', error);
        }
    },
    
    observeResourceTiming() {
        if (!window.PerformanceObserver) return;
        
        try {
            const observer = new PerformanceObserver((list) => {
                for (const entry of list.getEntries()) {
                    this.metrics.resources.push({
                        name: entry.name,
                        entryType: entry.entryType,
                        startTime: entry.startTime,
                        duration: entry.duration,
                        transferSize: entry.transferSize,
                        decodedBodySize: entry.decodedBodySize,
                        contentType: entry.contentType,
                        initiatorType: entry.initiatorType
                    });
                }
            });
            
            observer.observe({ entryTypes: ['resource'] });
            this.observers.push(observer);
            
            console.log('[AdvancedPerformanceService] 资源性能监控已启动');
        } catch (error) {
            console.error('[AdvancedPerformanceService] 资源性能监控失败:', error);
        }
    },
    
    startMemoryTracking() {
        const checkMemory = () => {
            if (performance.memory) {
                this.metrics.memory = {
                    usedJSHeapSize: performance.memory.usedJSHeapSize,
                    totalJSHeapSize: performance.memory.totalJSHeapSize,
                    jsHeapSizeLimit: performance.memory.jsHeapSizeLimit,
                    usedPercentage: (performance.memory.usedJSHeapSize / performance.memory.jsHeapSizeLimit * 100).toFixed(2)
                };
            }
        };
        
        checkMemory();
        setInterval(checkMemory, 5000);
    },
    
    startReporting(interval) {
        this.reportInterval = setInterval(() => {
            const report = this.getReport();
            
            if (this.reportCallback) {
                this.reportCallback(report);
            }
            
            console.log('[AdvancedPerformanceService] 性能报告:', report);
        }, interval);
    },
    
    stopReporting() {
        if (this.reportInterval) {
            clearInterval(this.reportInterval);
            this.reportInterval = null;
        }
    },
    
    measure(name, fn) {
        const startTime = performance.now();
        
        try {
            const result = fn();
            
            if (result instanceof Promise) {
                return result.then(value => {
                    const duration = performance.now() - startTime;
                    this.recordCustomMetric(name, duration, 'promise');
                    return value;
                }).catch(error => {
                    const duration = performance.now() - startTime;
                    this.recordCustomMetric(name, duration, 'promise-error');
                    throw error;
                });
            }
            
            const duration = performance.now() - startTime;
            this.recordCustomMetric(name, duration, 'sync');
            
            return result;
        } catch (error) {
            const duration = performance.now() - startTime;
            this.recordCustomMetric(name, duration, 'error');
            throw error;
        }
    },
    
    async measureAsync(name, fn) {
        const startTime = performance.now();
        
        try {
            const result = await fn();
            const duration = performance.now() - startTime;
            this.recordCustomMetric(name, duration, 'async');
            return result;
        } catch (error) {
            const duration = performance.now() - startTime;
            this.recordCustomMetric(name, duration, 'async-error');
            throw error;
        }
    },
    
    recordCustomMetric(name, value, type = 'custom') {
        if (!this.metrics.custom.has(name)) {
            this.metrics.custom.set(name, []);
        }
        
        this.metrics.custom.get(name).push({
            value,
            type,
            timestamp: Date.now()
        });
    },
    
    getCustomMetric(name) {
        const metrics = this.metrics.custom.get(name) || [];
        if (metrics.length === 0) return null;
        
        const values = metrics.map(m => m.value);
        
        return {
            name,
            count: metrics.length,
            total: values.reduce((a, b) => a + b, 0),
            average: values.reduce((a, b) => a + b, 0) / values.length,
            min: Math.min(...values),
            max: Math.max(...values),
            last: values[values.length - 1]
        };
    },
    
    getNavigationMetrics() {
        const nav = this.metrics.navigation;
        
        if (!nav['navigation']) {
            return null;
        }
        
        const entry = nav['navigation'];
        
        return {
            dns: entry.domainLookupEnd - entry.domainLookupStart,
            tcp: entry.connectEnd - entry.connectStart,
            ssl: entry.secureConnectionStart > 0 ? entry.connectEnd - entry.secureConnectionStart : 0,
            ttfb: entry.responseStart - entry.requestStart,
            download: entry.responseEnd - entry.responseStart,
            total: entry.loadEventEnd - entry.navigationStart,
            domContentLoaded: entry.domContentLoadedEventEnd - entry.navigationStart,
            domComplete: entry.domComplete - entry.navigationStart,
            loadComplete: entry.loadEventEnd - entry.navigationStart
        };
    },
    
    getPaintMetrics() {
        return {
            fcp: this.metrics.paint['first-contentful-paint']?.startTime || 0,
            fp: this.metrics.paint['first-paint']?.startTime || 0
        };
    },
    
    getMemoryMetrics() {
        return this.metrics.memory;
    },
    
    getResourceMetrics() {
        const resources = this.metrics.resources;
        
        if (resources.length === 0) {
            return { total: 0, byType: {}, slowResources: [] };
        }
        
        const byType = {};
        const slowResources = [];
        
        resources.forEach(r => {
            const type = r.initiatorType || 'other';
            
            if (!byType[type]) {
                byType[type] = { count: 0, totalDuration: 0, totalSize: 0 };
            }
            
            byType[type].count++;
            byType[type].totalDuration += r.duration;
            byType[type].totalSize += r.transferSize || 0;
            
            if (r.duration > 1000) {
                slowResources.push(r);
            }
        });
        
        return {
            total: resources.length,
            byType,
            slowResources: slowResources.sort((a, b) => b.duration - a.duration).slice(0, 10)
        };
    },
    
    getReport() {
        return {
            timestamp: Date.now(),
            navigation: this.getNavigationMetrics(),
            paint: this.getPaintMetrics(),
            memory: this.getMemoryMetrics(),
            resources: this.getResourceMetrics(),
            custom: this.getAllCustomMetrics()
        };
    },
    
    getAllCustomMetrics() {
        const result = {};
        
        this.metrics.custom.forEach((metrics, name) => {
            result[name] = this.getCustomMetric(name);
        });
        
        return result;
    },
    
    getLCP() {
        return new Promise((resolve) => {
            if (!window.PerformanceObserver) {
                resolve(0);
                return;
            }
            
            try {
                const observer = new PerformanceObserver((list) => {
                    const entries = list.getEntries();
                    const lastEntry = entries[entries.length - 1];
                    observer.disconnect();
                    resolve(lastEntry.startTime);
                });
                
                observer.observe({ entryTypes: ['largest-contentful-paint'] });
            } catch (error) {
                resolve(0);
            }
        });
    },
    
    getFID() {
        return new Promise((resolve) => {
            if (!window.PerformanceObserver) {
                resolve(0);
                return;
            }
            
            try {
                const observer = new PerformanceObserver((list) => {
                    const entries = list.getEntries();
                    const firstEntry = entries[0];
                    observer.disconnect();
                    resolve(firstEntry.processingStart - firstEntry.startTime);
                });
                
                observer.observe({ entryTypes: ['first-input'] });
            } catch (error) {
                resolve(0);
            }
        });
    },
    
    getCLS() {
        return new Promise((resolve) => {
            if (!window.PerformanceObserver) {
                resolve(0);
                return;
            }
            
            let clsValue = 0;
            
            try {
                const observer = new PerformanceObserver((list) => {
                    for (const entry of list.getEntries()) {
                        if (!entry.hadRecentInput) {
                            clsValue += entry.value;
                        }
                    }
                });
                
                observer.observe({ entryTypes: ['layout-shift'] });
                
                setTimeout(() => resolve(clsValue), 1000);
            } catch (error) {
                resolve(0);
            }
        });
    },
    
    getINP() {
        return new Promise((resolve) => {
            if (!window.PerformanceObserver) {
                resolve(0);
                return;
            }
            
            try {
                const observer = new PerformanceObserver((list) => {
                    const entries = list.getEntries();
                    let maxDuration = 0;
                    
                    entries.forEach(entry => {
                        if (entry.duration > maxDuration) {
                            maxDuration = entry.duration;
                        }
                    });
                    
                    observer.disconnect();
                    resolve(maxDuration);
                });
                
                observer.observe({ entryTypes: ['event'] });
            } catch (error) {
                resolve(0);
            }
        });
    },
    
    async getWebVitals() {
        const [lcp, fid, cls, inp] = await Promise.all([
            this.getLCP(),
            this.getFID(),
            this.getCLS(),
            this.getINP()
        ]);
        
        return {
            lcp: lcp.toFixed(2),
            fid: fid.toFixed(2),
            cls: cls.toFixed(4),
            inp: inp.toFixed(2)
        };
    },
    
    getNetworkInfo() {
        if (!navigator.connection) {
            return null;
        }
        
        return {
            type: navigator.connection.type,
            effectiveType: navigator.connection.effectiveType,
            downlink: navigator.connection.downlink,
            rtt: navigator.connection.rtt,
            saveData: navigator.connection.saveData
        };
    },
    
    getDeviceInfo() {
        return {
            platform: navigator.platform,
            vendor: navigator.vendor,
            language: navigator.language,
            cookiesEnabled: navigator.cookieEnabled,
            onLine: navigator.onLine,
            screenWidth: screen.width,
            screenHeight: screen.height,
            windowWidth: window.innerWidth,
            windowHeight: window.innerHeight,
            devicePixelRatio: window.devicePixelRatio
        };
    },
    
    formatBytes(bytes) {
        if (bytes === 0) return '0 B';
        
        const k = 1024;
        const sizes = ['B', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        
        return `${parseFloat((bytes / Math.pow(k, i)).toFixed(2))} ${sizes[i]}`;
    },
    
    formatDuration(ms) {
        if (ms < 1000) return `${ms.toFixed(2)}ms`;
        if (ms < 60000) return `${(ms / 1000).toFixed(2)}s`;
        return `${(ms / 60000).toFixed(2)}m`;
    },
    
    clearMetrics() {
        this.metrics.resources = [];
        this.metrics.custom.clear();
        console.log('[AdvancedPerformanceService] 性能数据已清除');
    },
    
    destroy() {
        this.stopReporting();
        
        this.observers.forEach(observer => {
            observer.disconnect();
        });
        
        this.observers = [];
        this.clearMetrics();
        
        console.log('[AdvancedPerformanceService] 性能监控服务已销毁');
    }
};

window.AdvancedPerformanceService = AdvancedPerformanceService;