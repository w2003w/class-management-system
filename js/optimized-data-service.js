// 优化的数据服务层 - 支持缓存和批量操作
const OptimizedDataService = {
    // 缓存配置
    CACHE_DURATION: 5 * 60 * 1000, // 5分钟
    
    // 内存缓存
    cache: new Map(),
    
    // 请求去重池
    pendingRequests: new Map(),
    
    // 获取缓存键
    getCacheKey(method, ...args) {
        return `${method}_${JSON.stringify(args)}`;
    },
    
    // 获取缓存数据
    getCached(key) {
        const item = this.cache.get(key);
        if (!item) return null;
        if (Date.now() > item.expires) {
            this.cache.delete(key);
            return null;
        }
        return item.data;
    },
    
    // 设置缓存
    setCache(key, data, duration = this.CACHE_DURATION) {
        this.cache.set(key, {
            data,
            expires: Date.now() + duration
        });
    },
    
    // 清除缓存
    clearCache(pattern) {
        if (pattern) {
            for (const key of this.cache.keys()) {
                if (key.includes(pattern)) {
                    this.cache.delete(key);
                }
            }
        } else {
            this.cache.clear();
        }
    },
    
    // 带缓存的数据获取
    async getWithCache(method, cacheKey, fetchFn, ttl = this.CACHE_DURATION) {
        // 先检查缓存
        const cached = this.getCached(cacheKey);
        if (cached) {
            return cached;
        }
        
        // 检查是否有正在进行的相同请求
        if (this.pendingRequests.has(cacheKey)) {
            return this.pendingRequests.get(cacheKey);
        }
        
        // 执行请求
        const promise = fetchFn().then(data => {
            this.setCache(cacheKey, data, ttl);
            this.pendingRequests.delete(cacheKey);
            return data;
        }).catch(error => {
            this.pendingRequests.delete(cacheKey);
            throw error;
        });
        
        this.pendingRequests.set(cacheKey, promise);
        return promise;
    },
    
    // 批量获取用户（分页）
    async getUsersPaginated(page = 1, pageSize = 50) {
        const cacheKey = this.getCacheKey('users', page, pageSize);
        return this.getWithCache('getUsersPaginated', cacheKey, async () => {
            const start = (page - 1) * pageSize;
            const end = start + pageSize - 1;
            
            const { data, error, count } = await SupabaseService.supabase
                .from('users')
                .select('*', { count: 'exact' })
                .range(start, end)
                .order('id', { ascending: true });
            
            if (error) throw error;
            return { data: data || [], total: count || 0, page, pageSize };
        }, 60000); // 用户列表缓存1分钟
    },
    
    // 批量获取考试（分页）
    async getExamsPaginated(page = 1, pageSize = 20) {
        const cacheKey = this.getCacheKey('exams', page, pageSize);
        return this.getWithCache('getExamsPaginated', cacheKey, async () => {
            const start = (page - 1) * pageSize;
            const end = start + pageSize - 1;
            
            const { data, error, count } = await SupabaseService.supabase
                .from('exams')
                .select('*', { count: 'exact' })
                .range(start, end)
                .order('createdAt', { ascending: false });
            
            if (error) throw error;
            return { data: data || [], total: count || 0, page, pageSize };
        }, 30000); // 考试列表缓存30秒
    },
    
    // 批量获取考试记录（优化版）
    async getExamRecordsOptimized(examId, options = {}) {
        const { page = 1, pageSize = 100, filters = {} } = options;
        const cacheKey = this.getCacheKey('examRecords', examId, page, pageSize, JSON.stringify(filters));
        
        return this.getWithCache('getExamRecordsOptimized', cacheKey, async () => {
            let query = SupabaseService.supabase
                .from('exam_records')
                .select(`
                    *,
                    users:userId (id, name, username)
                `, { count: 'exact' })
                .eq('examId', examId);
            
            // 应用过滤器
            if (filters.userId) query = query.eq('userId', filters.userId);
            if (filters.minScore) query = query.gte('score', filters.minScore);
            if (filters.maxScore) query = query.lte('score', filters.maxScore);
            
            const start = (page - 1) * pageSize;
            const end = start + pageSize - 1;
            
            const { data, error, count } = await query
                .range(start, end)
                .order('score', { ascending: false });
            
            if (error) throw error;
            return { data: data || [], total: count || 0, page, pageSize };
        }, 20000); // 缓存20秒
    },
    
    // 批量提交考试答案（优化版）
    async submitExamAnswersBatch(examId, userId, answers) {
        // 使用事务批量提交
        const { data, error } = await SupabaseService.supabase.rpc('submit_exam_answers', {
            p_exam_id: examId,
            p_user_id: userId,
            p_answers: JSON.stringify(answers)
        });
        
        if (error) {
            // 降级为单独提交
            console.warn('Batch submit failed, falling back to individual:', error);
            return this.submitExamAnswersIndividual(examId, userId, answers);
        }
        
        // 清除相关缓存
        this.clearCache('examRecords');
        return data;
    },
    
    // 单独提交（降级方案）
    async submitExamAnswersIndividual(examId, userId, answers) {
        const { data, error } = await SupabaseService.supabase
            .from('exam_records')
            .upsert({
                examId,
                userId,
                answers,
                submittedAt: new Date().toISOString()
            }, {
                onConflict: 'examId,userId'
            });
        
        if (error) throw error;
        this.clearCache('examRecords');
        return data;
    },
    
    // 获取统计数据（带缓存）
    async getDashboardStats() {
        const cacheKey = 'dashboard_stats';
        return this.getWithCache('getDashboardStats', cacheKey, async () => {
            // 并行获取所有统计数据
            const [
                { count: userCount },
                { count: examCount },
                { count: attendanceCount },
                { count: voteCount }
            ] = await Promise.all([
                SupabaseService.supabase.from('users').select('*', { count: 'exact', head: true }),
                SupabaseService.supabase.from('exams').select('*', { count: 'exact', head: true }),
                SupabaseService.supabase.from('attendances').select('*', { count: 'exact', head: true }),
                SupabaseService.supabase.from('votes').select('*', { count: 'exact', head: true })
            ]);
            
            return {
                userCount: userCount || 0,
                examCount: examCount || 0,
                attendanceCount: attendanceCount || 0,
                voteCount: voteCount || 0,
                timestamp: Date.now()
            };
        }, 60000); // 统计数据缓存1分钟
    },
    
    // 实时订阅（优化版）
    subscriptions: new Map(),
    
    subscribeToTable(table, callback, filters = {}) {
        const filterKey = JSON.stringify(filters);
        const subKey = `${table}_${filterKey}`;
        
        // 如果已存在相同订阅，先取消
        if (this.subscriptions.has(subKey)) {
            this.subscriptions.get(subKey).unsubscribe();
        }
        
        let query = SupabaseService.supabase.channel(`${table}_changes`)
            .on('postgres_changes', 
                { event: '*', schema: 'public', table, ...filters },
                (payload) => {
                    callback(payload);
                    // 清除相关缓存
                    this.clearCache(table);
                }
            );
        
        const subscription = query.subscribe();
        this.subscriptions.set(subKey, subscription);
        
        return () => {
            subscription.unsubscribe();
            this.subscriptions.delete(subKey);
        };
    },
    
    // 批量操作队列
    batchQueue: [],
    batchTimer: null,
    
    // 添加到批量队列
    queueOperation(operation) {
        this.batchQueue.push(operation);
        
        if (this.batchTimer) {
            clearTimeout(this.batchTimer);
        }
        
        this.batchTimer = setTimeout(() => {
            this.processBatch();
        }, 50); // 50ms内合并请求
    },
    
    // 处理批量操作
    async processBatch() {
        if (this.batchQueue.length === 0) return;
        
        const operations = [...this.batchQueue];
        this.batchQueue = [];
        
        // 按类型分组
        const groups = operations.reduce((acc, op) => {
            const key = op.type || 'default';
            if (!acc[key]) acc[key] = [];
            acc[key].push(op);
            return acc;
        }, {});
        
        // 批量执行
        await Promise.all(
            Object.values(groups).map(group => 
                Promise.all(group.map(op => op.fn()))
            )
        );
    }
};

// 导出
window.OptimizedDataService = OptimizedDataService;
