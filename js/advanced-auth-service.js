const AdvancedAuthService = {
    initialized: false,
    currentUser: null,
    roles: {
        admin: ['dashboard', 'attendance', 'exam', 'vote', 'wrong-questions', 'files', 'users', 'grading', 'settings', 'profile'],
        subAdmin: ['dashboard', 'attendance', 'exam', 'vote', 'wrong-questions', 'files', 'grading', 'profile'],
        member: ['dashboard', 'attendance', 'exam', 'vote', 'wrong-questions', 'profile']
    },
    
    async init() {
        if (this.initialized) return;
        
        this.loadCurrentUser();
        this.initialized = true;
        console.log('[AdvancedAuthService] 高级权限服务初始化完成');
    },
    
    loadCurrentUser() {
        const userData = localStorage.getItem('currentUser');
        if (userData) {
            try {
                this.currentUser = JSON.parse(userData);
                console.log('[AdvancedAuthService] 用户已登录:', this.currentUser.username);
            } catch (error) {
                console.error('[AdvancedAuthService] 解析用户数据失败:', error);
                this.currentUser = null;
            }
        }
    },
    
    async login(email, password) {
        console.log('[AdvancedAuthService] 尝试登录:', email);
        
        try {
            const { data, error } = await window.supabase
                .from('users')
                .select('*')
                .eq('email', email)
                .eq('password', password)
                .eq('status', 'active')
                .maybeSingle();
            
            if (error) throw error;
            
            if (!data) {
                throw new Error('邮箱或密码错误');
            }
            
            this.currentUser = data;
            localStorage.setItem('currentUser', JSON.stringify(data));
            console.log('[AdvancedAuthService] 登录成功:', data.username);
            
            return { success: true, user: data };
        } catch (error) {
            console.error('[AdvancedAuthService] 登录失败:', error);
            return { success: false, error: error.message };
        }
    },
    
    async logout() {
        console.log('[AdvancedAuthService] 退出登录');
        
        this.currentUser = null;
        localStorage.removeItem('currentUser');
        localStorage.removeItem('token');
        
        try {
            await window.supabase.auth.signOut();
        } catch (error) {
            console.warn('[AdvancedAuthService] Supabase登出失败:', error);
        }
        
        return { success: true };
    },
    
    async register(userData) {
        console.log('[AdvancedAuthService] 注册新用户:', userData.email);
        
        try {
            const existing = await window.supabase
                .from('users')
                .select('id')
                .eq('email', userData.email)
                .maybeSingle();
            
            if (existing.data) {
                throw new Error('该邮箱已被注册');
            }
            
            const { data, error } = await window.supabase
                .from('users')
                .insert({
                    id: crypto.randomUUID(),
                    username: userData.username,
                    email: userData.email,
                    password: userData.password,
                    role: 'member',
                    status: 'active',
                    created_at: new Date().toISOString()
                })
                .select()
                .maybeSingle();
            
            if (error) throw error;
            
            console.log('[AdvancedAuthService] 注册成功:', data.username);
            return { success: true, user: data };
        } catch (error) {
            console.error('[AdvancedAuthService] 注册失败:', error);
            return { success: false, error: error.message };
        }
    },
    
    async changePassword(userId, oldPassword, newPassword) {
        console.log('[AdvancedAuthService] 修改密码');
        
        try {
            const user = await window.supabase
                .from('users')
                .select('password')
                .eq('id', userId)
                .maybeSingle();
            
            if (!user.data) {
                throw new Error('用户不存在');
            }
            
            if (user.data.password !== oldPassword) {
                throw new Error('旧密码不正确');
            }
            
            const { data, error } = await window.supabase
                .from('users')
                .update({ password: newPassword })
                .eq('id', userId)
                .select()
                .maybeSingle();
            
            if (error) throw error;
            
            console.log('[AdvancedAuthService] 密码修改成功');
            return { success: true };
        } catch (error) {
            console.error('[AdvancedAuthService] 密码修改失败:', error);
            return { success: false, error: error.message };
        }
    },
    
    isAuthenticated() {
        return !!this.currentUser;
    },
    
    getUserRole() {
        return this.currentUser?.role || 'guest';
    },
    
    hasPermission(pageName) {
        if (!this.currentUser) return false;
        
        const allowedPages = this.roles[this.currentUser.role] || [];
        return allowedPages.includes(pageName);
    },
    
    canAccess(pageName) {
        const hasPermission = this.hasPermission(pageName);
        
        if (!hasPermission) {
            console.warn(`[AdvancedAuthService] 用户无权限访问: ${pageName}`);
            this.redirectToAccessDenied();
            return false;
        }
        
        return true;
    },
    
    redirectToAccessDenied() {
        if (this.currentUser) {
            window.location.href = 'access-denied.html';
        } else {
            window.location.href = 'index.html';
        }
    },
    
    redirectToLogin() {
        window.location.href = 'index.html';
    },
    
    requireAuth() {
        if (!this.isAuthenticated()) {
            this.redirectToLogin();
            return false;
        }
        return true;
    },
    
    requireAdmin() {
        if (!this.isAuthenticated()) {
            this.redirectToLogin();
            return false;
        }
        
        if (this.currentUser.role !== 'admin') {
            this.redirectToAccessDenied();
            return false;
        }
        
        return true;
    },
    
    async getUserInfo(userId) {
        try {
            const { data, error } = await window.supabase
                .from('users')
                .select('*')
                .eq('id', userId)
                .maybeSingle();
            
            if (error) throw error;
            return data;
        } catch (error) {
            console.error('[AdvancedAuthService] 获取用户信息失败:', error);
            return null;
        }
    },
    
    async updateUserProfile(userId, updates) {
        try {
            const { data, error } = await window.supabase
                .from('users')
                .update(updates)
                .eq('id', userId)
                .select()
                .maybeSingle();
            
            if (error) throw error;
            
            if (userId === this.currentUser?.id) {
                this.currentUser = { ...this.currentUser, ...data };
                localStorage.setItem('currentUser', JSON.stringify(this.currentUser));
            }
            
            return { success: true, user: data };
        } catch (error) {
            console.error('[AdvancedAuthService] 更新用户资料失败:', error);
            return { success: false, error: error.message };
        }
    },
    
    getCurrentUser() {
        return this.currentUser;
    },
    
    async checkSession() {
        if (!this.currentUser) return false;
        
        try {
            const { data, error } = await window.supabase
                .from('users')
                .select('status')
                .eq('id', this.currentUser.id)
                .maybeSingle();
            
            if (error) throw error;
            
            if (!data || data.status !== 'active') {
                this.logout();
                return false;
            }
            
            return true;
        } catch (error) {
            console.error('[AdvancedAuthService] 检查会话失败:', error);
            this.logout();
            return false;
        }
    }
};

window.AdvancedAuthService = AdvancedAuthService;