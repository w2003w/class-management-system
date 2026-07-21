const AdvancedRealtimeService = {
    initialized: false,
    socket: null,
    reconnectAttempts: 0,
    maxReconnectAttempts: 10,
    reconnectDelay: 1000,
    heartbeatInterval: null,
    listeners: new Map(),
    channels: new Map(),
    pendingMessages: [],
    connectionState: 'disconnected',
    
    async init(url = null) {
        if (this.initialized) return;
        
        this.wsUrl = url || this.getWebSocketUrl();
        this.initialized = true;
        
        console.log('[AdvancedRealtimeService] 实时通信服务初始化完成');
        console.log('[AdvancedRealtimeService] WebSocket URL:', this.wsUrl);
    },
    
    getWebSocketUrl() {
        const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
        const host = window.location.host;
        return `${protocol}//${host}/ws`;
    },
    
    connect(userId, token) {
        if (this.socket && this.socket.readyState === WebSocket.OPEN) {
            console.log('[AdvancedRealtimeService] WebSocket已连接');
            return;
        }
        
        console.log('[AdvancedRealtimeService] 正在连接WebSocket...');
        this.connectionState = 'connecting';
        
        try {
            this.socket = new WebSocket(`${this.wsUrl}?userId=${userId}&token=${token}`);
            
            this.socket.onopen = () => {
                console.log('[AdvancedRealtimeService] WebSocket连接成功');
                this.connectionState = 'connected';
                this.reconnectAttempts = 0;
                this.startHeartbeat();
                this.subscribeToChannels();
                this.flushPendingMessages();
            };
            
            this.socket.onmessage = (event) => {
                this.handleMessage(event.data);
            };
            
            this.socket.onclose = (event) => {
                console.log('[AdvancedRealtimeService] WebSocket连接关闭:', event.code, event.reason);
                this.connectionState = 'disconnected';
                this.stopHeartbeat();
                this.attemptReconnect(userId, token);
            };
            
            this.socket.onerror = (error) => {
                console.error('[AdvancedRealtimeService] WebSocket错误:', error);
                this.connectionState = 'error';
            };
            
        } catch (error) {
            console.error('[AdvancedRealtimeService] WebSocket连接失败:', error);
            this.connectionState = 'error';
            this.attemptReconnect(userId, token);
        }
    },
    
    disconnect() {
        if (this.socket) {
            this.stopHeartbeat();
            this.socket.close(1000, '用户主动断开');
            this.socket = null;
            this.connectionState = 'disconnected';
            console.log('[AdvancedRealtimeService] WebSocket已断开');
        }
    },
    
    attemptReconnect(userId, token) {
        if (this.reconnectAttempts >= this.maxReconnectAttempts) {
            console.error('[AdvancedRealtimeService] 达到最大重连次数，停止重连');
            this.connectionState = 'failed';
            return;
        }
        
        this.reconnectAttempts++;
        const delay = this.reconnectDelay * Math.pow(2, this.reconnectAttempts - 1);
        
        console.log(`[AdvancedRealtimeService] ${delay/1000}秒后尝试第${this.reconnectAttempts}次重连...`);
        
        setTimeout(() => {
            this.connect(userId, token);
        }, delay);
    },
    
    startHeartbeat() {
        this.stopHeartbeat();
        
        this.heartbeatInterval = setInterval(() => {
            this.send({
                type: 'heartbeat',
                timestamp: Date.now()
            });
        }, 30000);
    },
    
    stopHeartbeat() {
        if (this.heartbeatInterval) {
            clearInterval(this.heartbeatInterval);
            this.heartbeatInterval = null;
        }
    },
    
    handleMessage(data) {
        try {
            const message = JSON.parse(data);
            
            console.log('[AdvancedRealtimeService] 收到消息:', message.type);
            
            if (message.type === 'heartbeat_ack') {
                return;
            }
            
            if (message.channel) {
                const channelListeners = this.channels.get(message.channel);
                if (channelListeners) {
                    channelListeners.forEach(callback => callback(message.data));
                }
            }
            
            const typeListeners = this.listeners.get(message.type);
            if (typeListeners) {
                typeListeners.forEach(callback => callback(message.data));
            }
            
            if (message.type === 'notification') {
                this.handleNotification(message.data);
            }
            
            if (message.type === 'attendance_update') {
                this.handleAttendanceUpdate(message.data);
            }
            
            if (message.type === 'exam_update') {
                this.handleExamUpdate(message.data);
            }
            
            if (message.type === 'vote_update') {
                this.handleVoteUpdate(message.data);
            }
            
            if (message.type === 'message') {
                this.handleChatMessage(message.data);
            }
            
        } catch (error) {
            console.error('[AdvancedRealtimeService] 消息解析失败:', error);
        }
    },
    
    send(data) {
        const message = {
            ...data,
            timestamp: Date.now()
        };
        
        if (this.socket && this.socket.readyState === WebSocket.OPEN) {
            this.socket.send(JSON.stringify(message));
        } else {
            console.warn('[AdvancedRealtimeService] WebSocket未连接，消息将暂存');
            this.pendingMessages.push(message);
        }
    },
    
    flushPendingMessages() {
        while (this.pendingMessages.length > 0) {
            const message = this.pendingMessages.shift();
            this.send(message);
        }
    },
    
    subscribeToChannels() {
        this.channels.forEach((callbacks, channel) => {
            this.send({
                type: 'subscribe',
                channel: channel
            });
        });
    },
    
    subscribe(channel, callback) {
        if (!this.channels.has(channel)) {
            this.channels.set(channel, new Set());
            this.send({
                type: 'subscribe',
                channel: channel
            });
        }
        
        this.channels.get(channel).add(callback);
        console.log(`[AdvancedRealtimeService] 订阅频道: ${channel}`);
    },
    
    unsubscribe(channel, callback) {
        const listeners = this.channels.get(channel);
        if (listeners) {
            listeners.delete(callback);
            
            if (listeners.size === 0) {
                this.channels.delete(channel);
                this.send({
                    type: 'unsubscribe',
                    channel: channel
                });
            }
        }
    },
    
    on(type, callback) {
        if (!this.listeners.has(type)) {
            this.listeners.set(type, new Set());
        }
        
        this.listeners.get(type).add(callback);
    },
    
    off(type, callback) {
        const listeners = this.listeners.get(type);
        if (listeners) {
            listeners.delete(callback);
        }
    },
    
    handleNotification(data) {
        console.log('[AdvancedRealtimeService] 收到通知:', data);
        
        if (window.AdvancedUI) {
            window.AdvancedUI.showToast(data.message, data.type || 'info');
        }
        
        this.emit('notification', data);
    },
    
    handleAttendanceUpdate(data) {
        console.log('[AdvancedRealtimeService] 签到更新:', data);
        this.emit('attendance_update', data);
    },
    
    handleExamUpdate(data) {
        console.log('[AdvancedRealtimeService] 考试更新:', data);
        this.emit('exam_update', data);
    },
    
    handleVoteUpdate(data) {
        console.log('[AdvancedRealtimeService] 投票更新:', data);
        this.emit('vote_update', data);
    },
    
    handleChatMessage(data) {
        console.log('[AdvancedRealtimeService] 收到消息:', data);
        this.emit('chat_message', data);
    },
    
    emit(event, data) {
        const listeners = this.listeners.get(event);
        if (listeners) {
            listeners.forEach(callback => callback(data));
        }
    },
    
    sendNotification(userId, notification) {
        this.send({
            type: 'notification',
            to: userId,
            data: notification
        });
    },
    
    broadcastNotification(notification) {
        this.send({
            type: 'broadcast',
            data: {
                type: 'notification',
                ...notification
            }
        });
    },
    
    updateAttendanceStatus(attendanceId, status) {
        this.send({
            type: 'attendance_update',
            attendanceId: attendanceId,
            data: { status }
        });
    },
    
    submitExamAnswer(examId, answer) {
        this.send({
            type: 'exam_answer',
            examId: examId,
            data: answer
        });
    },
    
    submitVote(voteId, optionIds) {
        this.send({
            type: 'vote_submit',
            voteId: voteId,
            data: { optionIds }
        });
    },
    
    sendChatMessage(roomId, message) {
        this.send({
            type: 'chat_message',
            roomId: roomId,
            data: { message }
        });
    },
    
    joinRoom(roomId) {
        this.send({
            type: 'join_room',
            roomId: roomId
        });
    },
    
    leaveRoom(roomId) {
        this.send({
            type: 'leave_room',
            roomId: roomId
        });
    },
    
    getConnectionState() {
        return this.connectionState;
    },
    
    isConnected() {
        return this.socket && this.socket.readyState === WebSocket.OPEN;
    },
    
    getChannels() {
        return Array.from(this.channels.keys());
    },
    
    clearAllListeners() {
        this.listeners.clear();
        this.channels.clear();
    }
};

window.AdvancedRealtimeService = AdvancedRealtimeService;