const AdvancedNotificationService = {
    initialized: false,
    permission: 'default',
    swRegistration: null,
    pushSubscription: null,
    notificationQueue: [],
    listeners: new Map(),
    channels: new Map(),
    maxQueueSize: 50,
    
    async init(options = {}) {
        if (this.initialized) return;
        
        const {
            serviceWorkerPath = '/sw.js',
            vapidKey = null,
            userId = null
        } = options;
        
        this.serviceWorkerPath = serviceWorkerPath;
        this.vapidKey = vapidKey;
        this.userId = userId;
        
        this.permission = await this.requestPermission();
        
        if (this.permission === 'granted') {
            await this.registerServiceWorker();
        }
        
        this.initialized = true;
        console.log('[AdvancedNotificationService] 通知推送服务初始化完成，权限:', this.permission);
    },
    
    async requestPermission() {
        if (!('Notification' in window)) {
            console.warn('[AdvancedNotificationService] 浏览器不支持通知');
            return 'unsupported';
        }
        
        if (Notification.permission === 'granted') {
            return 'granted';
        }
        
        if (Notification.permission !== 'denied') {
            const permission = await Notification.requestPermission();
            return permission;
        }
        
        return Notification.permission;
    },
    
    async registerServiceWorker() {
        if (!('serviceWorker' in navigator)) {
            console.warn('[AdvancedNotificationService] 浏览器不支持Service Worker');
            return null;
        }
        
        try {
            this.swRegistration = await navigator.serviceWorker.register(this.serviceWorkerPath);
            console.log('[AdvancedNotificationService] Service Worker注册成功');
            return this.swRegistration;
        } catch (error) {
            console.error('[AdvancedNotificationService] Service Worker注册失败:', error);
            return null;
        }
    },
    
    async subscribeToPush() {
        if (!this.swRegistration) {
            console.warn('[AdvancedNotificationService] Service Worker未注册');
            return null;
        }
        
        if (!this.vapidKey) {
            console.warn('[AdvancedNotificationService] 缺少VAPID密钥');
            return null;
        }
        
        try {
            const subscription = await this.swRegistration.pushManager.subscribe({
                userVisibleOnly: true,
                applicationServerKey: this.urlBase64ToUint8Array(this.vapidKey)
            });
            
            this.pushSubscription = subscription;
            console.log('[AdvancedNotificationService] 订阅推送成功');
            
            await this.sendSubscriptionToServer(subscription);
            
            return subscription;
        } catch (error) {
            console.error('[AdvancedNotificationService] 订阅推送失败:', error);
            return null;
        }
    },
    
    async unsubscribeFromPush() {
        if (!this.pushSubscription) {
            return;
        }
        
        try {
            await this.pushSubscription.unsubscribe();
            this.pushSubscription = null;
            console.log('[AdvancedNotificationService] 取消订阅推送成功');
        } catch (error) {
            console.error('[AdvancedNotificationService] 取消订阅推送失败:', error);
        }
    },
    
    urlBase64ToUint8Array(base64String) {
        const padding = '='.repeat((4 - base64String.length % 4) % 4);
        const base64 = (base64String + padding)
            .replace(/-/g, '+')
            .replace(/_/g, '/');
        
        const rawData = window.atob(base64);
        const outputArray = new Uint8Array(rawData.length);
        
        for (let i = 0; i < rawData.length; i++) {
            outputArray[i] = rawData.charCodeAt(i);
        }
        
        return outputArray;
    },
    
    async sendSubscriptionToServer(subscription) {
        const subscriptionData = subscription.toJSON();
        
        console.log('[AdvancedNotificationService] 发送订阅信息到服务器:', subscriptionData);
    },
    
    async show(notification, options = {}) {
        const {
            title,
            body = '',
            icon = '/icons/icon-192x192.png',
            badge = '/icons/badge-72x72.png',
            tag = '',
            data = {},
            requireInteraction = false,
            silent = false
        } = notification;
        
        if (this.permission !== 'granted') {
            console.warn('[AdvancedNotificationService] 通知权限未授权');
            this.queueNotification(notification);
            return null;
        }
        
        try {
            if (this.swRegistration && 'showNotification' in this.swRegistration) {
                const registration = await navigator.serviceWorker.ready;
                
                await registration.showNotification(title, {
                    body,
                    icon,
                    badge,
                    tag,
                    data,
                    requireInteraction,
                    silent,
                    actions: notification.actions || [],
                    vibrate: notification.vibrate || [200, 100, 200],
                    timestamp: Date.now()
                });
                
                console.log('[AdvancedNotificationService] 显示Service Worker通知');
            } else {
                const n = new Notification(title, {
                    body,
                    icon,
                    tag,
                    requireInteraction,
                    silent
                });
                
                console.log('[AdvancedNotificationService] 显示原生通知');
                
                return n;
            }
        } catch (error) {
            console.error('[AdvancedNotificationService] 显示通知失败:', error);
            this.queueNotification(notification);
            return null;
        }
    },
    
    queueNotification(notification) {
        if (this.notificationQueue.length >= this.maxQueueSize) {
            this.notificationQueue.shift();
        }
        
        this.notificationQueue.push({
            ...notification,
            queuedAt: Date.now()
        });
        
        console.log(`[AdvancedNotificationService] 通知已加入队列，当前队列长度: ${this.notificationQueue.length}`);
    },
    
    async processQueue() {
        if (this.notificationQueue.length === 0) {
            return;
        }
        
        console.log(`[AdvancedNotificationService] 处理通知队列，共 ${this.notificationQueue.length} 条`);
        
        while (this.notificationQueue.length > 0) {
            const notification = this.notificationQueue.shift();
            await this.show(notification);
            await new Promise(resolve => setTimeout(resolve, 100));
        }
    },
    
    on(event, callback) {
        if (!this.listeners.has(event)) {
            this.listeners.set(event, new Set());
        }
        
        this.listeners.get(event).add(callback);
        
        return () => this.off(event, callback);
    },
    
    off(event, callback) {
        const callbacks = this.listeners.get(event);
        if (callbacks) {
            callbacks.delete(callback);
        }
    },
    
    emit(event, data) {
        const callbacks = this.listeners.get(event);
        if (callbacks) {
            callbacks.forEach(callback => callback(data));
        }
    },
    
    subscribeToChannel(channel) {
        if (!this.channels.has(channel)) {
            this.channels.set(channel, new Set());
        }
        
        console.log(`[AdvancedNotificationService] 订阅频道: ${channel}`);
    },
    
    unsubscribeFromChannel(channel) {
        this.channels.delete(channel);
        console.log(`[AdvancedNotificationService] 取消订阅频道: ${channel}`);
    },
    
    async broadcastToChannel(channel, notification) {
        const subscribers = this.channels.get(channel);
        if (!subscribers) {
            console.warn(`[AdvancedNotificationService] 频道不存在: ${channel}`);
            return;
        }
        
        console.log(`[AdvancedNotificationService] 广播到频道 ${channel}，订阅者: ${subscribers.size}`);
        
        subscribers.forEach(callback => {
            try {
                callback(notification);
            } catch (error) {
                console.error('[AdvancedNotificationService] 广播通知失败:', error);
            }
        });
    },
    
    async sendToUser(userId, notification) {
        console.log(`[AdvancedNotificationService] 发送通知给用户 ${userId}:`, notification);
        
        try {
            const { data, error } = await window.supabase
                .from('notifications')
                .insert({
                    user_id: userId,
                    title: notification.title,
                    message: notification.body,
                    type: notification.type || 'info',
                    link: notification.link || null,
                    created_at: new Date().toISOString()
                });
            
            if (error) throw error;
            
            console.log('[AdvancedNotificationService] 通知已保存到数据库');
            return { success: true };
        } catch (error) {
            console.error('[AdvancedNotificationService] 发送通知失败:', error);
            return { success: false, error: error.message };
        }
    },
    
    async broadcast(notification) {
        console.log('[AdvancedNotificationService] 广播通知:', notification);
        
        try {
            const { data, error } = await window.supabase
                .from('notifications')
                .insert({
                    title: notification.title,
                    message: notification.body,
                    type: notification.type || 'info',
                    created_at: new Date().toISOString()
                });
            
            if (error) throw error;
            
            await this.show(notification);
            
            return { success: true };
        } catch (error) {
            console.error('[AdvancedNotificationService] 广播通知失败:', error);
            return { success: false, error: error.message };
        }
    },
    
    async getNotifications(userId, options = {}) {
        const { limit = 20, unreadOnly = false } = options;
        
        try {
            let query = window.supabase
                .from('notifications')
                .select('*')
                .eq('user_id', userId)
                .order('created_at', { ascending: false })
                .limit(limit);
            
            if (unreadOnly) {
                query = query.eq('read', false);
            }
            
            const { data, error } = await query;
            
            if (error) throw error;
            
            return data || [];
        } catch (error) {
            console.error('[AdvancedNotificationService] 获取通知列表失败:', error);
            return [];
        }
    },
    
    async markAsRead(notificationId) {
        try {
            const { error } = await window.supabase
                .from('notifications')
                .update({ read: true })
                .eq('id', notificationId);
            
            if (error) throw error;
            
            console.log(`[AdvancedNotificationService] 标记通知已读: ${notificationId}`);
            return { success: true };
        } catch (error) {
            console.error('[AdvancedNotificationService] 标记已读失败:', error);
            return { success: false, error: error.message };
        }
    },
    
    async markAllAsRead(userId) {
        try {
            const { error } = await window.supabase
                .from('notifications')
                .update({ read: true })
                .eq('user_id', userId)
                .eq('read', false);
            
            if (error) throw error;
            
            console.log('[AdvancedNotificationService] 标记所有通知已读');
            return { success: true };
        } catch (error) {
            console.error('[AdvancedNotificationService] 标记所有已读失败:', error);
            return { success: false, error: error.message };
        }
    },
    
    async deleteNotification(notificationId) {
        try {
            const { error } = await window.supabase
                .from('notifications')
                .delete()
                .eq('id', notificationId);
            
            if (error) throw error;
            
            console.log(`[AdvancedNotificationService] 删除通知: ${notificationId}`);
            return { success: true };
        } catch (error) {
            console.error('[AdvancedNotificationService] 删除通知失败:', error);
            return { success: false, error: error.message };
        }
    },
    
    async getUnreadCount(userId) {
        try {
            const { count, error } = await window.supabase
                .from('notifications')
                .select('id', { count: 'exact', head: true })
                .eq('user_id', userId)
                .eq('read', false);
            
            if (error) throw error;
            
            return count || 0;
        } catch (error) {
            console.error('[AdvancedNotificationService] 获取未读数量失败:', error);
            return 0;
        }
    },
    
    showToast(title, options = {}) {
        const toast = document.createElement('div');
        toast.className = `notification-toast notification-toast-${options.type || 'info'}`;
        
        const iconMap = {
            success: 'fa-check-circle',
            error: 'fa-times-circle',
            warning: 'fa-exclamation-circle',
            info: 'fa-info-circle'
        };
        
        toast.innerHTML = `
            <div class="notification-toast-icon">
                <i class="fa ${iconMap[options.type] || iconMap.info}"></i>
            </div>
            <div class="notification-toast-content">
                <div class="notification-toast-title">${title}</div>
                ${options.message ? `<div class="notification-toast-message">${options.message}</div>` : ''}
            </div>
            <button class="notification-toast-close" onclick="this.parentElement.remove()">
                <i class="fa fa-times"></i>
            </button>
        `;
        
        document.body.appendChild(toast);
        
        setTimeout(() => {
            toast.classList.add('show');
        }, 10);
        
        if (options.duration !== 0) {
            setTimeout(() => {
                toast.classList.remove('show');
                setTimeout(() => toast.remove(), 300);
            }, options.duration || 5000);
        }
        
        return toast;
    },
    
    addStyles() {
        if (document.getElementById('notification-styles')) {
            return;
        }
        
        const style = document.createElement('style');
        style.id = 'notification-styles';
        style.textContent = `
            .notification-toast {
                position: fixed;
                top: 20px;
                right: 20px;
                z-index: 99999;
                display: flex;
                align-items: flex-start;
                padding: 16px;
                background: white;
                border-radius: 12px;
                box-shadow: 0 4px 20px rgba(0, 0, 0, 0.15);
                max-width: 400px;
                transform: translateX(120%);
                transition: transform 0.3s ease;
            }
            
            .notification-toast.show {
                transform: translateX(0);
            }
            
            .notification-toast-success {
                border-left: 4px solid #10B981;
            }
            
            .notification-toast-error {
                border-left: 4px solid #EF4444;
            }
            
            .notification-toast-warning {
                border-left: 4px solid #F59E0B;
            }
            
            .notification-toast-info {
                border-left: 4px solid #3B82F6;
            }
            
            .notification-toast-icon {
                flex-shrink: 0;
                width: 24px;
                height: 24px;
                display: flex;
                align-items: center;
                justify-content: center;
                margin-right: 12px;
            }
            
            .notification-toast-success .notification-toast-icon {
                color: #10B981;
            }
            
            .notification-toast-error .notification-toast-icon {
                color: #EF4444;
            }
            
            .notification-toast-warning .notification-toast-icon {
                color: #F59E0B;
            }
            
            .notification-toast-info .notification-toast-icon {
                color: #3B82F6;
            }
            
            .notification-toast-content {
                flex: 1;
            }
            
            .notification-toast-title {
                font-weight: 600;
                color: #1F2937;
                margin-bottom: 4px;
            }
            
            .notification-toast-message {
                font-size: 14px;
                color: #6B7280;
            }
            
            .notification-toast-close {
                flex-shrink: 0;
                background: none;
                border: none;
                padding: 4px;
                cursor: pointer;
                color: #9CA3AF;
                transition: color 0.2s;
            }
            
            .notification-toast-close:hover {
                color: #6B7280;
            }
        `;
        
        document.head.appendChild(style);
    },
    
    getPermissionStatus() {
        return this.permission;
    },
    
    isSupported() {
        return 'Notification' in window && 'serviceWorker' in navigator;
    },
    
    getQueueSize() {
        return this.notificationQueue.length;
    },
    
    clearQueue() {
        this.notificationQueue = [];
        console.log('[AdvancedNotificationService] 通知队列已清空');
    },
    
    destroy() {
        this.listeners.clear();
        this.channels.clear();
        this.clearQueue();
        console.log('[AdvancedNotificationService] 通知推送服务已销毁');
    }
};

window.AdvancedNotificationService = AdvancedNotificationService;