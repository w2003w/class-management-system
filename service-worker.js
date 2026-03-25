// 班级管理系统 Service Worker
const CACHE_NAME = 'class-management-cache-v1.0.0';

// 需要缓存的资源列表
const urlsToCache = [
  '/',
  '/index.html',
  '/dashboard.html',
  '/attendance.html',
  '/exam.html',
  '/vote.html',
  '/profile.html',
  '/users.html',
  '/settings.html',
  // 外部资源
  'https://cdn.tailwindcss.com',
  'https://cdn.jsdelivr.net/npm/font-awesome@4.7.0/css/font-awesome.min.css',
  'https://cdn.jsdelivr.net/npm/chart.js@4.4.8/dist/chart.umd.min.js',
  // 图标资源
  'https://p26-flow-imagex-sign.byteimg.com/tos-cn-i-a9rns2rl98/rc/pc/super_tool/202e421ad5584be09197200fb64801cb~tplv-a9rns2rl98-image.image?lk3s=8e244e95&rcl=202603251522510C2B92F0154267AB91D9&rrcfp=f06b921b&x-expires=1777015434&x-signature=VqlAlhiqhibrNyMSWgWghmTCFD0%3D'
];

// 安装 Service Worker
self.addEventListener('install', (event) => {
  console.log('[Service Worker] 正在安装...');
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => {
        console.log('[Service Worker] 正在缓存资源');
        return cache.addAll(urlsToCache);
      })
      .then(() => {
        console.log('[Service Worker] 资源缓存完成');
        // 跳过等待，直接激活
        return self.skipWaiting();
      })
  );
});

// 激活 Service Worker
self.addEventListener('activate', (event) => {
  console.log('[Service Worker] 正在激活...');
  const cacheWhitelist = [CACHE_NAME];
  
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheWhitelist.indexOf(cacheName) === -1) {
            console.log('[Service Worker] 删除旧缓存:', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    }).then(() => {
      console.log('[Service Worker] 激活完成');
      // 立即接管所有客户端
      return self.clients.claim();
    })
  );
});

// 拦截网络请求
self.addEventListener('fetch', (event) => {
  console.log('[Service Worker] 拦截请求:', event.request.url);
  
  event.respondWith(
    caches.match(event.request)
      .then((response) => {
        // 如果在缓存中找到响应，则返回缓存的响应
        if (response) {
          console.log('[Service Worker] 从缓存返回:', event.request.url);
          return response;
        }
        
        // 否则发起网络请求
        console.log('[Service Worker] 发起网络请求:', event.request.url);
        return fetch(event.request)
          .then((response) => {
            // 检查响应是否有效
            if (!response || response.status !== 200 || response.type !== 'basic') {
              return response;
            }
            
            // 克隆响应，因为响应是流，只能使用一次
            const responseToCache = response.clone();
            
            // 将新的响应添加到缓存中
            caches.open(CACHE_NAME)
              .then((cache) => {
                console.log('[Service Worker] 缓存新资源:', event.request.url);
                cache.put(event.request, responseToCache);
              })
              .catch((error) => {
                console.error('[Service Worker] 缓存失败:', error);
              });
            
            return response;
          })
          .catch((error) => {
            console.error('[Service Worker] 网络请求失败:', error);
            // 如果网络请求失败，可以返回一个离线页面
            return caches.match('/index.html');
          });
      })
  );
});

// 后台同步
self.addEventListener('sync', (event) => {
  if (event.tag === 'sync-attendance-data') {
    console.log('[Service Worker] 执行后台同步:', event.tag);
    event.waitUntil(syncAttendanceData());
  }
});

// 推送通知
self.addEventListener('push', (event) => {
  console.log('[Service Worker] 收到推送通知:', event.data);
  
  const data = event.data ? event.data.json() : {};
  const options = {
    body: data.body || '有新的消息通知',
    icon: 'https://p26-flow-imagex-sign.byteimg.com/tos-cn-i-a9rns2rl98/rc/pc/super_tool/202e421ad5584be09197200fb64801cb~tplv-a9rns2rl98-image.image?lk3s=8e244e95&rcl=202603251522510C2B92F0154267AB91D9&rrcfp=f06b921b&x-expires=1777015434&x-signature=VqlAlhiqhibrNyMSWgWghmTCFD0%3D',
    badge: 'https://p26-flow-imagex-sign.byteimg.com/tos-cn-i-a9rns2rl98/rc/pc/super_tool/202e421ad5584be09197200fb64801cb~tplv-a9rns2rl98-image.image?lk3s=8e244e95&rcl=202603251522510C2B92F0154267AB91D9&rrcfp=f06b921b&x-expires=1777015434&x-signature=VqlAlhiqhibrNyMSWgWghmTCFD0%3D',
    data: {
      url: data.url || '/dashboard.html'
    }
  };
  
  event.waitUntil(
    self.registration.showNotification(data.title || '班级管理系统', options)
  );
});

// 点击通知
self.addEventListener('notificationclick', (event) => {
  console.log('[Service Worker] 通知被点击:', event.notification.data);
  
  event.notification.close();
  
  event.waitUntil(
    clients.openWindow(event.notification.data.url)
  );
});

// 同步签到数据的函数
function syncAttendanceData() {
  // 从 IndexedDB 获取待同步的数据
  return new Promise((resolve, reject) => {
    console.log('[Service Worker] 同步签到数据...');
    // 这里应该实现与 IndexedDB 的交互逻辑
    // 由于在 Service Worker 中无法直接访问 IndexedDB，
    // 实际实现需要在主线程中完成
    resolve();
  });
}

// 周期性同步
self.addEventListener('periodicsync', (event) => {
  if (event.tag === 'daily-sync') {
    event.waitUntil(dailySync());
  }
});

// 每日同步函数
function dailySync() {
  console.log('[Service Worker] 执行每日同步...');
  // 实现每日同步逻辑
  return Promise.resolve();
}

// 分享目标 API
self.addEventListener('share', (event) => {
  console.log('[Service Worker] 处理分享:', event.data);
  // 实现分享处理逻辑
});

// 消息接收
self.addEventListener('message', (event) => {
  console.log('[Service Worker] 收到消息:', event.data);
  
  // 处理来自主线程的消息
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});

// 错误处理
self.addEventListener('error', (event) => {
  console.error('[Service Worker] 错误:', event.error);
});

// 未捕获的异常
self.addEventListener('unhandledrejection', (event) => {
  console.error('[Service Worker] 未处理的 Promise 拒绝:', event.reason);
});