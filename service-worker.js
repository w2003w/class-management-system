// 班级管理系统 Service Worker - 高性能缓存策略
const CACHE_VERSION = 'v4';
const CACHE_NAME = `class-management-cache-${CACHE_VERSION}`;
const STATIC_CACHE = `class-management-static-${CACHE_VERSION}`;
const DYNAMIC_CACHE = `class-management-dynamic-${CACHE_VERSION}`;
const API_CACHE = `class-management-api-${CACHE_VERSION}`;

// 需要预缓存的静态资源
const STATIC_URLS = [
  '/',
  '/index.html',
  '/dashboard.html',
  '/attendance.html',
  '/exam.html',
  '/vote.html',
  '/profile.html',
  '/users.html',
  '/settings.html',
  '/grading.html',
  '/participate.html',
  // JS文件
  '/js/supabase-config.js',
  '/js/supabase-service.js',
  '/js/data-service.js',
  '/js/optimized-data-service.js',
  '/js/performance-utils.js',
  '/js/data.js',
  '/js/utils.js',
  // 外部资源
  'https://cdn.tailwindcss.com',
  'https://cdnjs.cloudflare.com/ajax/libs/font-awesome/4.7.0/css/font-awesome.min.css',
  'https://cdn.jsdelivr.net/npm/chart.js@4.4.8/dist/chart.umd.min.js',
  'https://cdnjs.cloudflare.com/ajax/libs/qrcodejs/1.0.0/qrcode.min.js',
  'https://unpkg.com/@supabase/supabase-js@2'
];

// 安装 Service Worker
self.addEventListener('install', (event) => {
  console.log('[SW] 安装中...');
  event.waitUntil(
    caches.open(STATIC_CACHE)
      .then((cache) => {
        console.log('[SW] 预缓存静态资源');
        return cache.addAll(STATIC_URLS);
      })
      .then(() => self.skipWaiting())
  );
});

// 激活 Service Worker
self.addEventListener('activate', (event) => {
  console.log('[SW] 激活中...');
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames
          .filter((name) => name.startsWith('class-management-') && !name.includes(CACHE_VERSION))
          .map((name) => {
            console.log('[SW] 删除旧缓存:', name);
            return caches.delete(name);
          })
      );
    }).then(() => self.clients.claim())
  );
});

// 缓存策略
const CACHE_STRATEGIES = {
  // 静态资源 - 缓存优先
  static: async (request) => {
    const cache = await caches.open(STATIC_CACHE);
    const cached = await cache.match(request);
    
    if (cached) return cached;
    
    try {
      const response = await fetch(request);
      if (response.ok) {
        cache.put(request, response.clone());
      }
      return response;
    } catch (error) {
      return cached || new Response('离线中', { status: 503 });
    }
  },

  // API请求 - 网络优先，缓存备用
  api: async (request) => {
    const cache = await caches.open(API_CACHE);
    
    try {
      const networkResponse = await fetch(request);
      if (networkResponse.ok) {
        // 克隆并缓存
        cache.put(request, networkResponse.clone());
        return networkResponse;
      }
    } catch (error) {
      console.log('[SW] API网络请求失败，使用缓存');
    }
    
    const cached = await cache.match(request);
    if (cached) {
      // 添加标记表示是缓存数据
      const headers = new Headers(cached.headers);
      headers.set('X-From-Cache', 'true');
      return new Response(cached.body, {
        status: cached.status,
        statusText: cached.statusText,
        headers
      });
    }
    
    return new Response(JSON.stringify({ error: '离线中' }), {
      status: 503,
      headers: { 'Content-Type': 'application/json' }
    });
  },

  // 动态资源 - 网络优先
  dynamic: async (request) => {
    const cache = await caches.open(DYNAMIC_CACHE);
    
    try {
      const networkResponse = await fetch(request);
      if (networkResponse.ok) {
        cache.put(request, networkResponse.clone());
      }
      return networkResponse;
    } catch (error) {
      const cached = await cache.match(request);
      return cached || new Response('离线中', { status: 503 });
    }
  }
};

// 拦截网络请求
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);
  
  // 跳过非GET请求
  if (request.method !== 'GET') return;
  
  // 跳过chrome扩展请求
  if (url.protocol === 'chrome-extension:') return;
  
  // 判断请求类型
  let strategy = 'dynamic';
  
  if (url.pathname === '/' || 
      url.pathname === '/index.html' ||
      url.pathname === '/dashboard.html' ||
      url.pathname === '/attendance.html' ||
      url.pathname === '/exam.html' ||
      url.pathname === '/vote.html' ||
      url.pathname === '/profile.html' ||
      url.pathname === '/users.html' ||
      url.pathname === '/settings.html' ||
      url.pathname === '/grading.html' ||
      url.pathname === '/participate.html' ||
      url.pathname.startsWith('/js/') ||
      url.pathname.startsWith('/css/')) {
    strategy = 'static';
  } else if (url.pathname.includes('/rest/v1/') || 
             url.hostname.includes('supabase.co')) {
    strategy = 'api';
  }
  
  event.respondWith(CACHE_STRATEGIES[strategy](request));
});

// 后台同步
self.addEventListener('sync', (event) => {
  if (event.tag === 'sync-data') {
    event.waitUntil(syncData());
  }
});

// 推送通知
self.addEventListener('push', (event) => {
  const data = event.data.json();
  event.waitUntil(
    self.registration.showNotification(data.title, {
      body: data.body,
      icon: '/icon.png',
      badge: '/badge.png',
      data: data.data
    })
  );
});

// 通知点击
self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  event.waitUntil(
    clients.openWindow(event.notification.data.url || '/')
  );
});

// 定期清理旧缓存
setInterval(async () => {
  const apiCache = await caches.open(API_CACHE);
  const requests = await apiCache.keys();
  const now = Date.now();
  const maxAge = 5 * 60 * 1000; // 5分钟
  
  for (const request of requests) {
    const response = await apiCache.match(request);
    const dateHeader = response.headers.get('date');
    if (dateHeader) {
      const age = now - new Date(dateHeader).getTime();
      if (age > maxAge) {
        apiCache.delete(request);
      }
    }
  }
}, 60000); // 每分钟清理一次
