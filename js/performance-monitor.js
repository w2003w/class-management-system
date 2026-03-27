// 性能监控工具 - 用于200人并发场景
const PerformanceMonitor = {
    metrics: {
        pageLoad: [],
        apiCalls: [],
        renderTime: [],
        errors: []
    },

    // 初始化监控
    init() {
        this.monitorPageLoad();
        this.monitorApiCalls();
        this.monitorErrors();
        this.monitorWebVitals();
    },

    // 监控页面加载
    monitorPageLoad() {
        window.addEventListener('load', () => {
            setTimeout(() => {
                const timing = performance.timing;
                const metrics = {
                    dns: timing.domainLookupEnd - timing.domainLookupStart,
                    tcp: timing.connectEnd - timing.connectStart,
                    ttfb: timing.responseStart - timing.requestStart,
                    domParse: timing.domInteractive - timing.responseEnd,
                    domReady: timing.domContentLoadedEventEnd - timing.navigationStart,
                    loadComplete: timing.loadEventEnd - timing.navigationStart
                };
                
                this.metrics.pageLoad.push({
                    url: location.href,
                    metrics,
                    timestamp: Date.now()
                });
                
                console.log('[Performance] 页面加载:', metrics);
                
                // 慢加载警告
                if (metrics.loadComplete > 3000) {
                    console.warn('[Performance] 页面加载过慢:', metrics.loadComplete + 'ms');
                }
            }, 0);
        });
    },

    // 监控API调用
    monitorApiCalls() {
        const originalFetch = window.fetch;
        window.fetch = async (...args) => {
            const start = performance.now();
            try {
                const response = await originalFetch(...args);
                const duration = performance.now() - start;
                
                this.metrics.apiCalls.push({
                    url: args[0],
                    method: args[1]?.method || 'GET',
                    status: response.status,
                    duration,
                    timestamp: Date.now()
                });
                
                // 慢API警告
                if (duration > 1000) {
                    console.warn('[Performance] API响应过慢:', args[0], duration + 'ms');
                }
                
                return response;
            } catch (error) {
                this.metrics.errors.push({
                    type: 'api',
                    url: args[0],
                    error: error.message,
                    timestamp: Date.now()
                });
                throw error;
            }
        };
    },

    // 监控错误
    monitorErrors() {
        window.addEventListener('error', (event) => {
            this.metrics.errors.push({
                type: 'javascript',
                message: event.message,
                filename: event.filename,
                lineno: event.lineno,
                timestamp: Date.now()
            });
            console.error('[Performance] JS错误:', event.message);
        });

        window.addEventListener('unhandledrejection', (event) => {
            this.metrics.errors.push({
                type: 'promise',
                message: event.reason?.message || String(event.reason),
                timestamp: Date.now()
            });
            console.error('[Performance] 未处理的Promise:', event.reason);
        });
    },

    // 监控Web Vitals
    monitorWebVitals() {
        // LCP (Largest Contentful Paint)
        if ('PerformanceObserver' in window) {
            const lcpObserver = new PerformanceObserver((list) => {
                const entries = list.getEntries();
                const lastEntry = entries[entries.length - 1];
                console.log('[Performance] LCP:', lastEntry.startTime);
                
                if (lastEntry.startTime > 2500) {
                    console.warn('[Performance] LCP过慢，需要优化');
                }
            });
            lcpObserver.observe({ entryTypes: ['largest-contentful-paint'] });

            // FID (First Input Delay)
            const fidObserver = new PerformanceObserver((list) => {
                for (const entry of list.getEntries()) {
                    const delay = entry.processingStart - entry.startTime;
                    console.log('[Performance] FID:', delay);
                    
                    if (delay > 100) {
                        console.warn('[Performance] FID过慢，需要优化输入响应');
                    }
                }
            });
            fidObserver.observe({ entryTypes: ['first-input'] });

            // CLS (Cumulative Layout Shift)
            let clsValue = 0;
            const clsObserver = new PerformanceObserver((list) => {
                for (const entry of list.getEntries()) {
                    if (!entry.hadRecentInput) {
                        clsValue += entry.value;
                    }
                }
                console.log('[Performance] CLS:', clsValue);
            });
            clsObserver.observe({ entryTypes: ['layout-shift'] });
        }
    },

    // 测量渲染时间
    measureRenderTime(name, fn) {
        const start = performance.now();
        const result = fn();
        const duration = performance.now() - start;
        
        this.metrics.renderTime.push({
            name,
            duration,
            timestamp: Date.now()
        });
        
        if (duration > 100) {
            console.warn(`[Performance] 渲染过慢: ${name} - ${duration.toFixed(2)}ms`);
        }
        
        return result;
    },

    // 获取性能报告
    getReport() {
        const now = Date.now();
        const oneMinuteAgo = now - 60000;
        
        return {
            summary: {
                totalApiCalls: this.metrics.apiCalls.length,
                totalErrors: this.metrics.errors.length,
                avgLoadTime: this.getAverageLoadTime(),
                avgApiTime: this.getAverageApiTime()
            },
            recent: {
                apiCalls: this.metrics.apiCalls.filter(m => m.timestamp > oneMinuteAgo),
                errors: this.metrics.errors.filter(m => m.timestamp > oneMinuteAgo)
            },
            slowApis: this.metrics.apiCalls
                .filter(m => m.duration > 1000)
                .slice(-10),
            timestamp: now
        };
    },

    getAverageLoadTime() {
        if (this.metrics.pageLoad.length === 0) return 0;
        const sum = this.metrics.pageLoad.reduce((acc, m) => 
            acc + m.metrics.loadComplete, 0);
        return sum / this.metrics.pageLoad.length;
    },

    getAverageApiTime() {
        if (this.metrics.apiCalls.length === 0) return 0;
        const sum = this.metrics.apiCalls.reduce((acc, m) => acc + m.duration, 0);
        return sum / this.metrics.apiCalls.length;
    },

    // 导出报告
    exportReport() {
        const report = this.getReport();
        const blob = new Blob([JSON.stringify(report, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `performance-report-${Date.now()}.json`;
        a.click();
        URL.revokeObjectURL(url);
    }
};

// 自动初始化
if (typeof window !== 'undefined') {
    PerformanceMonitor.init();
}

window.PerformanceMonitor = PerformanceMonitor;
