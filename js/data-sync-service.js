const DataSyncService = {
    initialized: false,
    syncInterval: null,
    syncStatus: 'idle',
    lastSyncTime: null,
    pendingChanges: [],
    conflictResolvers: new Map(),
    syncListeners: [],
    retryAttempts: 3,
    retryDelay: 1000,

    async init(options = {}) {
        if (this.initialized) return;

        const {
            syncIntervalMs = 30000,
            enableAutoSync = true,
            retryAttempts = 3,
            retryDelay = 1000
        } = options;

        this.retryAttempts = retryAttempts;
        this.retryDelay = retryDelay;

        console.log('[DataSyncService] 初始化数据同步服务...');

        this.loadPendingChanges();
        this.registerDefaultConflictResolvers();

        if (enableAutoSync) {
            this.startAutoSync(syncIntervalMs);
        }

        this.initialized = true;
        console.log('[DataSyncService] 数据同步服务初始化完成');
    },

    async sync(force = false) {
        if (this.syncStatus === 'syncing') {
            console.log('[DataSyncService] 同步正在进行中，跳过');
            return { status: 'skipped', reason: 'sync_in_progress' };
        }

        if (!force && !this.hasPendingChanges()) {
            console.log('[DataSyncService] 没有待同步的更改');
            return { status: 'skipped', reason: 'no_pending_changes' };
        }

        this.syncStatus = 'syncing';
        this.notifySyncListeners('syncing');

        try {
            const localChanges = this.getPendingChanges();
            const serverChanges = await this.fetchServerChanges();

            const mergedChanges = await this.mergeChanges(localChanges, serverChanges);

            await this.pushChanges(mergedChanges.local);
            await this.applyServerChanges(mergedChanges.server);

            this.clearPendingChanges();
            this.lastSyncTime = new Date().toISOString();
            this.saveLastSyncTime();

            this.syncStatus = 'idle';
            this.notifySyncListeners('synced', {
                localChanges: mergedChanges.local.length,
                serverChanges: mergedChanges.server.length
            });

            console.log('[DataSyncService] 同步完成', {
                local: mergedChanges.local.length,
                server: mergedChanges.server.length
            });

            return {
                status: 'success',
                localChanges: mergedChanges.local.length,
                serverChanges: mergedChanges.server.length
            };
        } catch (error) {
            console.error('[DataSyncService] 同步失败:', error);
            this.syncStatus = 'error';
            this.notifySyncListeners('error', { error: error.message });

            if (force) {
                return { status: 'error', error: error.message };
            }

            return await this.retrySync();
        }
    },

    async retrySync() {
        for (let attempt = 1; attempt <= this.retryAttempts; attempt++) {
            console.log(`[DataSyncService] 重试同步 (${attempt}/${this.retryAttempts})...`);

            await this.delay(this.retryDelay * attempt);

            try {
                const result = await this.sync(true);
                if (result.status === 'success') {
                    return result;
                }
            } catch (error) {
                console.error(`[DataSyncService] 重试失败 (${attempt}/${this.retryAttempts}):`, error);
            }
        }

        return { status: 'failed', error: 'max_retries_exceeded' };
    },

    async fetchServerChanges() {
        const lastSync = this.getLastSyncTime();

        try {
            const { supabase } = await this.getSupabase();
            if (!supabase) {
                return [];
            }

            let query = supabase
                .from('sync_log')
                .select('*')
                .order('created_at', { ascending: false })
                .limit(100);

            if (lastSync) {
                query = query.gt('created_at', lastSync);
            }

            const { data, error } = await query;

            if (error) throw error;

            return data || [];
        } catch (error) {
            console.error('[DataSyncService] 获取服务器更改失败:', error);
            return [];
        }
    },

    async pushChanges(changes) {
        if (changes.length === 0) return;

        try {
            const { supabase } = await this.getSupabase();
            if (!supabase) {
                this.savePendingChanges(changes);
                return;
            }

            const syncRecords = changes.map(change => ({
                id: change.id || this.generateId(),
                table_name: change.table,
                record_id: change.recordId,
                operation: change.operation,
                data: change.data,
                created_by: change.userId,
                created_at: change.timestamp
            }));

            const { error } = await supabase
                .from('sync_log')
                .insert(syncRecords);

            if (error) throw error;
        } catch (error) {
            console.error('[DataSyncService] 推送更改失败:', error);
            this.savePendingChanges(changes);
            throw error;
        }
    },

    async applyServerChanges(changes) {
        for (const change of changes) {
            try {
                const resolver = this.conflictResolvers.get(change.table_name);
                if (resolver) {
                    await resolver(change);
                } else {
                    await this.defaultResolve(change);
                }
            } catch (error) {
                console.error(`[DataSyncService] 应用更改失败 [${change.table_name}]:`, error);
            }
        }
    },

    async mergeChanges(localChanges, serverChanges) {
        const merged = {
            local: [],
            server: []
        };

        const localByTableAndRecord = new Map();
        localChanges.forEach(change => {
            const key = `${change.table}:${change.recordId}`;
            localByTableAndRecord.set(key, change);
        });

        const serverByTableAndRecord = new Map();
        serverChanges.forEach(change => {
            const key = `${change.table_name}:${change.record_id}`;
            serverByTableAndRecord.set(key, change);
        });

        for (const [key, localChange] of localByTableAndRecord) {
            const serverChange = serverByTableAndRecord.get(key);

            if (!serverChange) {
                merged.local.push(localChange);
            } else {
                const localTime = new Date(localChange.timestamp).getTime();
                const serverTime = new Date(serverChange.created_at).getTime();

                if (localTime > serverTime) {
                    merged.local.push(localChange);
                }
            }
        }

        for (const [key, serverChange] of serverByTableAndRecord) {
            if (!localByTableAndRecord.has(key)) {
                merged.server.push(serverChange);
            }
        }

        return merged;
    },

    async defaultResolve(change) {
        const { supabase } = await this.getSupabase();
        if (!supabase) return;

        switch (change.operation) {
            case 'INSERT':
                await supabase
                    .from(change.table_name)
                    .upsert(this.convertToSnakeCase(change.data));
                break;

            case 'UPDATE':
                await supabase
                    .from(change.table_name)
                    .update(this.convertToSnakeCase(change.data))
                    .eq('id', change.record_id);
                break;

            case 'DELETE':
                await supabase
                    .from(change.table_name)
                    .delete()
                    .eq('id', change.record_id);
                break;
        }
    },

    registerConflictResolver(tableName, resolver) {
        this.conflictResolvers.set(tableName, resolver);
    },

    registerDefaultConflictResolvers() {
        this.registerConflictResolver('users', async (change) => {
            console.log('[DataSyncService] 解决用户冲突:', change);
        });

        this.registerConflictResolver('attendances', async (change) => {
            console.log('[DataSyncService] 解决签到冲突:', change);
        });

        this.registerConflictResolver('wrong_questions', async (change) => {
            console.log('[DataSyncService] 解决错题冲突:', change);
        });
    },

    addPendingChange(table, recordId, operation, data) {
        const change = {
            id: this.generateId(),
            table,
            recordId,
            operation,
            data,
            timestamp: new Date().toISOString(),
            userId: this.getCurrentUserId()
        };

        this.pendingChanges.push(change);
        this.savePendingChanges();

        console.log('[DataSyncService] 添加待同步更改:', change);
    },

    getPendingChanges() {
        return [...this.pendingChanges];
    },

    hasPendingChanges() {
        return this.pendingChanges.length > 0;
    },

    clearPendingChanges() {
        this.pendingChanges = [];
        this.savePendingChanges();
    },

    savePendingChanges() {
        try {
            localStorage.setItem('sync_pending_changes', JSON.stringify(this.pendingChanges));
        } catch (error) {
            console.error('[DataSyncService] 保存待同步更改失败:', error);
        }
    },

    loadPendingChanges() {
        try {
            const data = localStorage.getItem('sync_pending_changes');
            this.pendingChanges = data ? JSON.parse(data) : [];
        } catch (error) {
            console.error('[DataSyncService] 加载待同步更改失败:', error);
            this.pendingChanges = [];
        }
    },

    saveLastSyncTime() {
        try {
            localStorage.setItem('sync_last_time', this.lastSyncTime);
        } catch (error) {
            console.error('[DataSyncService] 保存最后同步时间失败:', error);
        }
    },

    getLastSyncTime() {
        try {
            return localStorage.getItem('sync_last_time');
        } catch (error) {
            return null;
        }
    },

    startAutoSync(intervalMs) {
        if (this.syncInterval) {
            clearInterval(this.syncInterval);
        }

        this.syncInterval = setInterval(() => {
            this.sync().catch(error => {
                console.error('[DataSyncService] 自动同步失败:', error);
            });
        }, intervalMs);

        console.log(`[DataSyncService] 启动自动同步，间隔 ${intervalMs}ms`);
    },

    stopAutoSync() {
        if (this.syncInterval) {
            clearInterval(this.syncInterval);
            this.syncInterval = null;
            console.log('[DataSyncService] 停止自动同步');
        }
    },

    addSyncListener(callback) {
        this.syncListeners.push(callback);
        return () => {
            this.syncListeners = this.syncListeners.filter(l => l !== callback);
        };
    },

    notifySyncListeners(status, data = {}) {
        this.syncListeners.forEach(listener => {
            try {
                listener(status, data);
            } catch (error) {
                console.error('[DataSyncService] 同步监听器执行失败:', error);
            }
        });
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
        return 'sync-xxxx-xxxx-xxxx'.replace(/x/g, () =>
            Math.floor(Math.random() * 16).toString(16)
        );
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

    delay(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    },

    getStatus() {
        return {
            initialized: this.initialized,
            syncStatus: this.syncStatus,
            lastSyncTime: this.lastSyncTime,
            pendingChangesCount: this.pendingChanges.length,
            autoSyncEnabled: !!this.syncInterval
        };
    },

    destroy() {
        this.stopAutoSync();
        this.pendingChanges = [];
        this.conflictResolvers.clear();
        this.syncListeners = [];
        this.initialized = false;

        console.log('[DataSyncService] 数据同步服务已销毁');
    }
};

window.DataSyncService = DataSyncService;
