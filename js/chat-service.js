const ChatService = {
    initialized: false,
    conversations: new Map(),
    messages: new Map(),
    onlineUsers: new Set(),
    unreadCount: new Map(),
    typingUsers: new Map(),
    messageListeners: [],
    statusListeners: [],
    typingListeners: [],
    onlineListeners: [],

    async init() {
        if (this.initialized) return;

        console.log('[ChatService] 初始化聊天服务...');

        this.startHeartbeat();
        this.initialized = true;

        console.log('[ChatService] 聊天服务初始化完成');
    },

    async sendMessage(conversationId, content, type = 'text', metadata = {}) {
        if (!content || !content.trim()) {
            throw new Error('消息内容不能为空');
        }

        const message = {
            id: this.generateId(),
            conversationId,
            senderId: this.getCurrentUserId(),
            content: content.trim(),
            type,
            metadata,
            status: 'sending',
            createdAt: new Date().toISOString()
        };

        try {
            const savedMessage = await this.saveMessage(message);
            this.notifyMessageListeners(savedMessage);
            return savedMessage;
        } catch (error) {
            console.error('[ChatService] 发送消息失败:', error);
            message.status = 'failed';
            throw error;
        }
    },

    async saveMessage(message) {
        try {
            const { supabase } = await this.getSupabase();
            if (!supabase) {
                return this.saveMessageToLocal(message);
            }

            const { data, error } = await supabase
                .from('chat_messages')
                .insert([{
                    id: message.id,
                    conversation_id: message.conversationId,
                    sender_id: message.senderId,
                    content: message.content,
                    type: message.type,
                    metadata: message.metadata,
                    status: 'sent',
                    created_at: message.createdAt
                }])
                .select()
                .single();

            if (error) throw error;

            return this.convertToCamelCase(data);
        } catch (error) {
            console.error('[ChatService] 保存消息到数据库失败:', error);
            return this.saveMessageToLocal(message);
        }
    },

    saveMessageToLocal(message) {
        const messages = this.getLocalMessages(message.conversationId);
        messages.push(message);
        localStorage.setItem(`chat_messages_${message.conversationId}`, JSON.stringify(messages));
        return message;
    },

    getLocalMessages(conversationId) {
        const data = localStorage.getItem(`chat_messages_${conversationId}`);
        return data ? JSON.parse(data) : [];
    },

    async getMessages(conversationId, options = {}) {
        const { limit = 50, before = null, after = null } = options;

        try {
            const { supabase } = await this.getSupabase();
            if (!supabase) {
                return this.getLocalMessages(conversationId).slice(-limit);
            }

            let query = supabase
                .from('chat_messages')
                .select('*')
                .eq('conversation_id', conversationId)
                .order('created_at', { ascending: false })
                .limit(limit);

            if (before) {
                query = query.lt('created_at', before);
            }

            if (after) {
                query = query.gt('created_at', after);
            }

            const { data, error } = await query;

            if (error) throw error;

            const messages = (data || []).map(this.convertToCamelCase).reverse();
            return messages;
        } catch (error) {
            console.error('[ChatService] 获取消息失败:', error);
            return this.getLocalMessages(conversationId);
        }
    },

    async createConversation(participantIds, name = null, type = 'private') {
        const currentUserId = this.getCurrentUserId();
        const allParticipants = [...new Set([currentUserId, ...participantIds])];

        const conversation = {
            id: this.generateId(),
            name: name,
            type,
            participants: allParticipants,
            createdBy: currentUserId,
            createdAt: new Date().toISOString(),
            lastMessageAt: new Date().toISOString(),
            unreadCount: {}
        };

        try {
            const { supabase } = await this.getSupabase();
            if (supabase) {
                const { error } = await supabase
                    .from('chat_conversations')
                    .insert([{
                        id: conversation.id,
                        name: conversation.name,
                        type: conversation.type,
                        participants: conversation.participants,
                        created_by: conversation.createdBy,
                        created_at: conversation.createdAt,
                        last_message_at: conversation.lastMessageAt,
                        unread_count: conversation.unreadCount
                    }]);

                if (error) throw error;
            } else {
                this.saveConversationToLocal(conversation);
            }

            this.conversations.set(conversation.id, conversation);
            return conversation;
        } catch (error) {
            console.error('[ChatService] 创建会话失败:', error);
            return this.saveConversationToLocal(conversation);
        }
    },

    saveConversationToLocal(conversation) {
        const conversations = this.getLocalConversations();
        const index = conversations.findIndex(c => c.id === conversation.id);
        if (index >= 0) {
            conversations[index] = conversation;
        } else {
            conversations.push(conversation);
        }
        localStorage.setItem('chat_conversations', JSON.stringify(conversations));
    },

    getLocalConversations() {
        const data = localStorage.getItem('chat_conversations');
        return data ? JSON.parse(data) : [];
    },

    async getConversations() {
        const currentUserId = this.getCurrentUserId();

        try {
            const { supabase } = await this.getSupabase();
            if (!supabase) {
                return this.getLocalConversations().filter(c =>
                    c.participants.includes(currentUserId)
                );
            }

            const { data, error } = await supabase
                .from('chat_conversations')
                .select('*')
                .contains('participants', [currentUserId])
                .order('last_message_at', { ascending: false });

            if (error) throw error;

            const conversations = (data || []).map(this.convertToCamelCase);
            conversations.forEach(c => this.conversations.set(c.id, c));
            return conversations;
        } catch (error) {
            console.error('[ChatService] 获取会话列表失败:', error);
            return this.getLocalConversations().filter(c =>
                c.participants.includes(currentUserId)
            );
        }
    },

    async getConversation(conversationId) {
        if (this.conversations.has(conversationId)) {
            return this.conversations.get(conversationId);
        }

        try {
            const { supabase } = await this.getSupabase();
            if (!supabase) {
                return this.getLocalConversations().find(c => c.id === conversationId);
            }

            const { data, error } = await supabase
                .from('chat_conversations')
                .select('*')
                .eq('id', conversationId)
                .single();

            if (error) throw error;

            const conversation = this.convertToCamelCase(data);
            this.conversations.set(conversation.id, conversation);
            return conversation;
        } catch (error) {
            console.error('[ChatService] 获取会话详情失败:', error);
            return this.getLocalConversations().find(c => c.id === conversationId);
        }
    },

    async markAsRead(conversationId, messageId = null) {
        const currentUserId = this.getCurrentUserId();

        try {
            const { supabase } = await this.getSupabase();
            if (supabase) {
                if (messageId) {
                    await supabase
                        .from('chat_messages')
                        .update({ read_at: new Date().toISOString() })
                        .eq('conversation_id', conversationId)
                        .eq('id', messageId);
                } else {
                    await supabase
                        .from('chat_messages')
                        .update({ read_at: new Date().toISOString() })
                        .eq('conversation_id', conversationId)
                        .neq('sender_id', currentUserId)
                        .is('read_at', null);
                }
            }

            const conversation = await this.getConversation(conversationId);
            if (conversation && conversation.unreadCount) {
                conversation.unreadCount[currentUserId] = 0;
                this.saveConversationToLocal(conversation);
            }

            this.unreadCount.set(conversationId, 0);
            this.notifyStatusListeners(conversationId, 'read');
        } catch (error) {
            console.error('[ChatService] 标记已读失败:', error);
        }
    },

    async getUnreadCount(conversationId = null) {
        const currentUserId = this.getCurrentUserId();

        if (conversationId) {
            if (this.unreadCount.has(conversationId)) {
                return this.unreadCount.get(conversationId);
            }

            try {
                const { supabase } = await this.getSupabase();
                if (supabase) {
                    const { count, error } = await supabase
                        .from('chat_messages')
                        .select('*', { count: 'exact', head: true })
                        .eq('conversation_id', conversationId)
                        .neq('sender_id', currentUserId)
                        .is('read_at', null);

                    if (error) throw error;
                    this.unreadCount.set(conversationId, count || 0);
                    return count || 0;
                }
            } catch (error) {
                console.error('[ChatService] 获取未读数失败:', error);
            }

            return 0;
        }

        let totalUnread = 0;
        const conversations = await this.getConversations();

        for (const conv of conversations) {
            const count = await this.getUnreadCount(conv.id);
            totalUnread += count;
        }

        return totalUnread;
    },

    async setTyping(conversationId, isTyping) {
        const currentUserId = this.getCurrentUserId();
        const typingUsers = this.typingUsers.get(conversationId) || new Set();

        if (isTyping) {
            typingUsers.add(currentUserId);
        } else {
            typingUsers.delete(currentUserId);
        }

        this.typingUsers.set(conversationId, typingUsers);
        this.notifyTypingListeners(conversationId, Array.from(typingUsers));
    },

    addMessageListener(callback) {
        this.messageListeners.push(callback);
        return () => {
            this.messageListeners = this.messageListeners.filter(l => l !== callback);
        };
    },

    addStatusListener(callback) {
        this.statusListeners.push(callback);
        return () => {
            this.statusListeners = this.statusListeners.filter(l => l !== callback);
        };
    },

    addTypingListener(callback) {
        this.typingListeners.push(callback);
        return () => {
            this.typingListeners = this.typingListeners.filter(l => l !== callback);
        };
    },

    addOnlineListener(callback) {
        this.onlineListeners.push(callback);
        return () => {
            this.onlineListeners = this.onlineListeners.filter(l => l !== callback);
        };
    },

    notifyMessageListeners(message) {
        this.messageListeners.forEach(listener => {
            try {
                listener(message);
            } catch (error) {
                console.error('[ChatService] 消息监听器执行失败:', error);
            }
        });
    },

    notifyStatusListeners(conversationId, status) {
        this.statusListeners.forEach(listener => {
            try {
                listener(conversationId, status);
            } catch (error) {
                console.error('[ChatService] 状态监听器执行失败:', error);
            }
        });
    },

    notifyTypingListeners(conversationId, users) {
        this.typingListeners.forEach(listener => {
            try {
                listener(conversationId, users);
            } catch (error) {
                console.error('[ChatService] 输入监听器执行失败:', error);
            }
        });
    },

    notifyOnlineListeners(users) {
        this.onlineListeners.forEach(listener => {
            try {
                listener(users);
            } catch (error) {
                console.error('[ChatService] 在线用户监听器执行失败:', error);
            }
        });
    },

    startHeartbeat() {
        this.heartbeatInterval = setInterval(async () => {
            const currentUserId = this.getCurrentUserId();
            if (currentUserId) {
                this.updateOnlineStatus(currentUserId, true);
            }
        }, 30000);
    },

    stopHeartbeat() {
        if (this.heartbeatInterval) {
            clearInterval(this.heartbeatInterval);
            this.heartbeatInterval = null;
        }
    },

    async updateOnlineStatus(userId, isOnline) {
        if (isOnline) {
            this.onlineUsers.add(userId);
        } else {
            this.onlineUsers.delete(userId);
        }

        this.notifyOnlineListeners(Array.from(this.onlineUsers));
    },

    async getOnlineUsers() {
        return Array.from(this.onlineUsers);
    },

    async searchMessages(query, options = {}) {
        const { conversationId = null, limit = 50, offset = 0 } = options;

        try {
            const { supabase } = await this.getSupabase();
            if (!supabase) {
                return this.searchMessagesLocally(query, conversationId);
            }

            let queryBuilder = supabase
                .from('chat_messages')
                .select('*')
                .ilike('content', `%${query}%`)
                .order('created_at', { ascending: false })
                .limit(limit)
                .range(offset, offset + limit - 1);

            if (conversationId) {
                queryBuilder = queryBuilder.eq('conversation_id', conversationId);
            }

            const { data, error } = await queryBuilder;

            if (error) throw error;

            return (data || []).map(this.convertToCamelCase);
        } catch (error) {
            console.error('[ChatService] 搜索消息失败:', error);
            return this.searchMessagesLocally(query, conversationId);
        }
    },

    searchMessagesLocally(query, conversationId) {
        const messages = [];
        const conversations = conversationId
            ? [conversationId]
            : this.getLocalConversations().map(c => c.id);

        for (const convId of conversations) {
            const convMessages = this.getLocalMessages(convId);
            const filtered = convMessages.filter(m =>
                m.content.toLowerCase().includes(query.toLowerCase())
            );
            messages.push(...filtered);
        }

        return messages.sort((a, b) =>
            new Date(b.createdAt) - new Date(a.createdAt)
        ).slice(0, 50);
    },

    async deleteMessage(messageId) {
        try {
            const { supabase } = await this.getSupabase();
            if (supabase) {
                const { error } = await supabase
                    .from('chat_messages')
                    .delete()
                    .eq('id', messageId);

                if (error) throw error;
            } else {
                this.deleteMessageLocally(messageId);
            }

            return true;
        } catch (error) {
            console.error('[ChatService] 删除消息失败:', error);
            return false;
        }
    },

    deleteMessageLocally(messageId) {
        for (const [convId, messages] of this.messages.entries()) {
            const index = messages.findIndex(m => m.id === messageId);
            if (index >= 0) {
                messages.splice(index, 1);
                localStorage.setItem(`chat_messages_${convId}`, JSON.stringify(messages));
                break;
            }
        }
    },

    async deleteConversation(conversationId) {
        try {
            const { supabase } = await this.getSupabase();
            if (supabase) {
                await supabase
                    .from('chat_messages')
                    .delete()
                    .eq('conversation_id', conversationId);

                const { error } = await supabase
                    .from('chat_conversations')
                    .delete()
                    .eq('id', conversationId);

                if (error) throw error;
            } else {
                this.deleteConversationLocally(conversationId);
            }

            this.conversations.delete(conversationId);
            this.messages.delete(conversationId);
            this.unreadCount.delete(conversationId);

            return true;
        } catch (error) {
            console.error('[ChatService] 删除会话失败:', error);
            return false;
        }
    },

    deleteConversationLocally(conversationId) {
        const conversations = this.getLocalConversations().filter(c => c.id !== conversationId);
        localStorage.setItem('chat_conversations', JSON.stringify(conversations));
        localStorage.removeItem(`chat_messages_${conversationId}`);
    },

    async getSupabase() {
        if (window.SupabaseService && window.SupabaseService.supabase) {
            return { supabase: window.SupabaseService.supabase };
        }

        if (window.supabase) {
            return { supabase: window.supabase };
        }

        return null;
    },

    getCurrentUserId() {
        if (window.DataService) {
            const user = window.DataService.getCurrentUserFromStorage();
            return user ? user.id : null;
        }

        const userData = localStorage.getItem('currentUser');
        if (userData) {
            try {
                return JSON.parse(userData).id;
            } catch {
                return null;
            }
        }

        return null;
    },

    generateId() {
        return 'xxxx-xxxx-xxxx-xxxx'.replace(/x/g, () =>
            Math.floor(Math.random() * 16).toString(16)
        );
    },

    convertToCamelCase(obj) {
        if (obj === null || obj === undefined) return obj;
        if (Array.isArray(obj)) {
            return obj.map(item => this.convertToCamelCase(item));
        }
        if (typeof obj === 'object') {
            const result = {};
            for (const key in obj) {
                if (obj.hasOwnProperty(key)) {
                    const camelKey = key.replace(/_([a-z])/g, (_, letter) => letter.toUpperCase());
                    result[camelKey] = this.convertToCamelCase(obj[key]);
                }
            }
            return result;
        }
        return obj;
    },

    convertToSnakeCase(obj) {
        if (obj === null || obj === undefined) return obj;
        if (Array.isArray(obj)) {
            return obj.map(item => this.convertToSnakeCase(item));
        }
        if (typeof obj === 'object') {
            const result = {};
            for (const key in obj) {
                if (obj.hasOwnProperty(key)) {
                    const snakeKey = key.replace(/[A-Z]/g, letter => `_${letter.toLowerCase()}`);
                    result[snakeKey] = this.convertToSnakeCase(obj[key]);
                }
            }
            return result;
        }
        return obj;
    },

    destroy() {
        this.stopHeartbeat();
        this.conversations.clear();
        this.messages.clear();
        this.onlineUsers.clear();
        this.unreadCount.clear();
        this.typingUsers.clear();
        this.messageListeners = [];
        this.statusListeners = [];
        this.typingListeners = [];
        this.onlineListeners = [];
        this.initialized = false;

        console.log('[ChatService] 聊天服务已销毁');
    }
};

window.ChatService = ChatService;
