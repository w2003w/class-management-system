const SupabaseService = {
    initialized: false,
    supabase: null,
    
    cleanData(data) {
        const cleaned = { ...data };
        Object.keys(cleaned).forEach(key => {
            if (cleaned[key] === '' || cleaned[key] === undefined) {
                cleaned[key] = null;
            }
        });
        return cleaned;
    },
    
    async init() {
        if (this.initialized) return true;
        
        try {
            const config = window.SupabaseConfig;
            if (!config || config.url === 'YOUR_SUPABASE_URL') {
                console.log('Supabase not configured, using LocalStorage');
                return false;
            }
            
            const { createClient } = supabase;
            this.supabase = createClient(config.url, config.anonKey);
            this.initialized = true;
            console.log('Supabase initialized successfully');
            return true;
        } catch (error) {
            console.error('Supabase initialization error:', error);
            return false;
        }
    },
    
    async ensureInit() {
        if (!this.initialized) {
            await this.init();
        }
        return this.initialized;
    },
    
    async signIn(username, password) {
        if (!await this.ensureInit()) {
            return { success: false, message: 'Supabase not initialized' };
        }
        
        try {
            const user = await this.getUserByUsername(username);
            
            if (!user) {
                return { success: false, message: '用户不存在' };
            }
            
            if (user.password !== password) {
                return { success: false, message: '密码错误' };
            }
            
            localStorage.setItem('currentUser', JSON.stringify(user));
            return { success: true, user };
        } catch (error) {
            console.error('Login error:', error);
            return { success: false, message: error.message || '登录失败' };
        }
    },
    
    async signOut() {
        localStorage.removeItem('currentUser');
        return { success: true };
    },
    
    getCurrentUser() {
        const userJson = localStorage.getItem('currentUser');
        return userJson ? JSON.parse(userJson) : null;
    },
    
    clearCurrentUser() {
        localStorage.removeItem('currentUser');
    },
    
    logout() {
        localStorage.removeItem('currentUser');
    },
    
    async getUsers() {
        if (!await this.ensureInit()) return [];
        
        try {
            const { data, error } = await this.supabase
                .from('users')
                .select('*');
            
            if (error) throw error;
            return data || [];
        } catch (error) {
            console.error('Get users error:', error);
            return [];
        }
    },
    
    async getUserById(id) {
        if (!await this.ensureInit()) return null;
        
        try {
            const { data, error } = await this.supabase
                .from('users')
                .select('*')
                .eq('id', id)
                .single();
            
            if (error) throw error;
            return data;
        } catch (error) {
            console.error('Get user error:', error);
            return null;
        }
    },
    
    async getUserByUsername(username) {
        if (!await this.ensureInit()) return null;
        
        try {
            const { data, error } = await this.supabase
                .from('users')
                .select('*')
                .eq('username', username)
                .single();
            
            if (error && error.code !== 'PGRST116') throw error;
            return data;
        } catch (error) {
            console.error('Get user by username error:', error);
            return null;
        }
    },
    
    async addUser(userData) {
        console.log('SupabaseService.addUser called');
        if (!await this.ensureInit()) {
            console.log('Supabase not initialized');
            return null;
        }
        
        try {
            const users = await this.getUsers();
            const maxId = users.length > 0 ? Math.max(...users.map(u => parseInt(u.id) || 0)) : 0;
            const newId = maxId + 1;
            
            const newUser = {
                id: newId,
                ...this.cleanData(userData),
                createdat: new Date().toISOString()
            };
            
            console.log('Inserting user into Supabase:', newUser);
            
            const { data, error } = await this.supabase
                .from('users')
                .insert([newUser])
                .select()
                .single();
            
            if (error) {
                console.error('Supabase insert error:', error);
                throw error;
            }
            
            console.log('Supabase insert success:', data);
            return data;
        } catch (error) {
            console.error('Add user error:', error);
            throw error;
        }
    },
    
    async updateUser(id, updates) {
        if (!await this.ensureInit()) return null;
        
        try {
            const { data, error } = await this.supabase
                .from('users')
                .update(this.cleanData(updates))
                .eq('id', id)
                .select()
                .single();
            
            if (error) throw error;
            return data;
        } catch (error) {
            console.error('Update user error:', error);
            throw error;
        }
    },
    
    async deleteUser(id) {
        if (!await this.ensureInit()) return false;
        
        try {
            const { error } = await this.supabase
                .from('users')
                .delete()
                .eq('id', id);
            
            if (error) throw error;
            return true;
        } catch (error) {
            console.error('Delete user error:', error);
            throw error;
        }
    },
    
    async getGroups() {
        if (!await this.ensureInit()) return [];
        
        try {
            const { data, error } = await this.supabase
                .from('groups')
                .select('*');
            
            if (error) throw error;
            return data || [];
        } catch (error) {
            console.error('Get groups error:', error);
            return [];
        }
    },
    
    async addGroup(groupData) {
        if (!await this.ensureInit()) return null;
        
        try {
            const groups = await this.getGroups();
            const maxId = groups.length > 0 ? Math.max(...groups.map(g => parseInt(g.id) || 0)) : 0;
            const newId = maxId + 1;
            
            const newGroup = {
                id: newId,
                ...this.cleanData(groupData),
                createdat: new Date().toISOString()
            };
            
            const { data, error } = await this.supabase
                .from('groups')
                .insert([newGroup])
                .select()
                .single();
            
            if (error) throw error;
            return data;
        } catch (error) {
            console.error('Add group error:', error);
            throw error;
        }
    },
    
    async updateGroup(id, updates) {
        if (!await this.ensureInit()) return null;
        
        try {
            const { data, error } = await this.supabase
                .from('groups')
                .update(this.cleanData(updates))
                .eq('id', id)
                .select()
                .single();
            
            if (error) throw error;
            return data;
        } catch (error) {
            console.error('Update group error:', error);
            throw error;
        }
    },
    
    async deleteGroup(id) {
        if (!await this.ensureInit()) return false;
        
        try {
            const { error } = await this.supabase
                .from('groups')
                .delete()
                .eq('id', id);
            
            if (error) throw error;
            return true;
        } catch (error) {
            console.error('Delete group error:', error);
            throw error;
        }
    },
    
    async getGroupById(id) {
        if (!await this.ensureInit()) return null;
        
        try {
            const { data, error } = await this.supabase
                .from('groups')
                .select('*')
                .eq('id', id)
                .single();
            
            if (error) throw error;
            return data;
        } catch (error) {
            console.error('Get group by id error:', error);
            return null;
        }
    },
    
    async getAttendances() {
        if (!await this.ensureInit()) return [];
        
        try {
            const { data, error } = await this.supabase
                .from('attendances')
                .select('*');
            
            if (error) throw error;
            return data || [];
        } catch (error) {
            console.error('Get attendances error:', error);
            return [];
        }
    },
    
    async addAttendance(attendanceData) {
        if (!await this.ensureInit()) return null;
        
        try {
            const attendances = await this.getAttendances();
            const maxId = attendances.length > 0 ? Math.max(...attendances.map(a => parseInt(a.id) || 0)) : 0;
            const newId = maxId + 1;
            
            const newAttendance = {
                id: newId,
                ...this.cleanData(attendanceData),
                createdat: new Date().toISOString()
            };
            
            const { data, error } = await this.supabase
                .from('attendances')
                .insert([newAttendance])
                .select()
                .single();
            
            if (error) throw error;
            return data;
        } catch (error) {
            console.error('Add attendance error:', error);
            throw error;
        }
    },
    
    async updateAttendance(id, updates) {
        if (!await this.ensureInit()) return null;
        
        try {
            const { data, error } = await this.supabase
                .from('attendances')
                .update(this.cleanData(updates))
                .eq('id', id)
                .select()
                .single();
            
            if (error) throw error;
            return data;
        } catch (error) {
            console.error('Update attendance error:', error);
            throw error;
        }
    },
    
    async deleteAttendance(id) {
        if (!await this.ensureInit()) return false;
        
        try {
            const { error } = await this.supabase
                .from('attendances')
                .delete()
                .eq('id', id);
            
            if (error) throw error;
            return true;
        } catch (error) {
            console.error('Delete attendance error:', error);
            throw error;
        }
    },
    
    async getAttendanceRecords() {
        if (!await this.ensureInit()) return [];
        
        try {
            const { data, error } = await this.supabase
                .from('attendance_records')
                .select('*');
            
            if (error) throw error;
            return data || [];
        } catch (error) {
            console.error('Get attendance records error:', error);
            return [];
        }
    },
    
    async addAttendanceRecord(recordData) {
        if (!await this.ensureInit()) return null;
        
        try {
            const records = await this.getAttendanceRecords();
            const maxId = records.length > 0 ? Math.max(...records.map(r => parseInt(r.id) || 0)) : 0;
            const newId = maxId + 1;
            
            const newRecord = {
                id: newId,
                ...this.cleanData(recordData),
                createdat: new Date().toISOString()
            };
            
            const { data, error } = await this.supabase
                .from('attendance_records')
                .insert([newRecord])
                .select()
                .single();
            
            if (error) throw error;
            return data;
        } catch (error) {
            console.error('Add attendance record error:', error);
            throw error;
        }
    },
    
    async getExams() {
        if (!await this.ensureInit()) return [];
        
        try {
            const { data, error } = await this.supabase
                .from('exams')
                .select('*');
            
            if (error) throw error;
            return data || [];
        } catch (error) {
            console.error('Get exams error:', error);
            return [];
        }
    },
    
    async addExam(examData) {
        if (!await this.ensureInit()) return null;
        
        try {
            const exams = await this.getExams();
            const maxId = exams.length > 0 ? Math.max(...exams.map(e => parseInt(e.id) || 0)) : 0;
            const newId = maxId + 1;
            
            const newExam = {
                id: newId,
                ...this.cleanData(examData),
                createdat: new Date().toISOString()
            };
            
            const { data, error } = await this.supabase
                .from('exams')
                .insert([newExam])
                .select()
                .single();
            
            if (error) throw error;
            return data;
        } catch (error) {
            console.error('Add exam error:', error);
            throw error;
        }
    },
    
    async updateExam(id, updates) {
        if (!await this.ensureInit()) return null;
        
        try {
            const { data, error } = await this.supabase
                .from('exams')
                .update(this.cleanData(updates))
                .eq('id', id)
                .select()
                .single();
            
            if (error) throw error;
            return data;
        } catch (error) {
            console.error('Update exam error:', error);
            throw error;
        }
    },
    
    async deleteExam(id) {
        if (!await this.ensureInit()) return false;
        
        try {
            const { error } = await this.supabase
                .from('exams')
                .delete()
                .eq('id', id);
            
            if (error) throw error;
            return true;
        } catch (error) {
            console.error('Delete exam error:', error);
            throw error;
        }
    },
    
    async getQuestions() {
        if (!await this.ensureInit()) return [];
        
        try {
            const { data, error } = await this.supabase
                .from('questions')
                .select('*');
            
            if (error) throw error;
            return data || [];
        } catch (error) {
            console.error('Get questions error:', error);
            return [];
        }
    },
    
    async addQuestion(questionData) {
        if (!await this.ensureInit()) return null;
        
        try {
            const questions = await this.getQuestions();
            const maxId = questions.length > 0 ? Math.max(...questions.map(q => parseInt(q.id) || 0)) : 0;
            const newId = maxId + 1;
            
            const newQuestion = {
                id: newId,
                ...this.cleanData(questionData),
                createdat: new Date().toISOString()
            };
            
            const { data, error } = await this.supabase
                .from('questions')
                .insert([newQuestion])
                .select()
                .single();
            
            if (error) throw error;
            return data;
        } catch (error) {
            console.error('Add question error:', error);
            throw error;
        }
    },
    
    async deleteQuestion(id) {
        if (!await this.ensureInit()) return false;
        
        try {
            const { error } = await this.supabase
                .from('questions')
                .delete()
                .eq('id', id);
            
            if (error) throw error;
            return true;
        } catch (error) {
            console.error('Delete question error:', error);
            throw error;
        }
    },
    
    async getExamRecords() {
        if (!await this.ensureInit()) return [];
        
        try {
            const { data, error } = await this.supabase
                .from('exam_records')
                .select('*');
            
            if (error) throw error;
            return data || [];
        } catch (error) {
            console.error('Get exam records error:', error);
            return [];
        }
    },
    
    async addExamRecord(recordData) {
        if (!await this.ensureInit()) return null;
        
        try {
            const records = await this.getExamRecords();
            const maxId = records.length > 0 ? Math.max(...records.map(r => parseInt(r.id) || 0)) : 0;
            const newId = maxId + 1;
            
            const newRecord = {
                id: newId,
                ...this.cleanData(recordData),
                submittedAt: new Date().toISOString()
            };
            
            const { data, error } = await this.supabase
                .from('exam_records')
                .insert([newRecord])
                .select()
                .single();
            
            if (error) throw error;
            return data;
        } catch (error) {
            console.error('Add exam record error:', error);
            throw error;
        }
    },
    
    async updateExamRecord(record) {
        if (!await this.ensureInit()) return null;
        
        try {
            const { data, error } = await this.supabase
                .from('exam_records')
                .update(this.cleanData({
                    score: record.score,
                    totalScore: record.totalScore,
                    essayAnswers: record.essayAnswers,
                    details: record.details,
                    status: record.status
                }))
                .eq('id', record.id)
                .select()
                .single();
            
            if (error) throw error;
            console.log('Exam record updated:', data);
            return data;
        } catch (error) {
            console.error('Update exam record error:', error);
            throw error;
        }
    },
    
    async saveExamRecords(records) {
        if (!await this.ensureInit()) return;
        
        try {
            for (const record of records) {
                const { error } = await this.supabase
                    .from('exam_records')
                    .upsert(record, { onConflict: 'id' });
                
                if (error) throw error;
            }
        } catch (error) {
            console.error('Save exam records error:', error);
            throw error;
        }
    },
    
    async getVotes() {
        if (!await this.ensureInit()) return [];
        
        try {
            const { data, error } = await this.supabase
                .from('votes')
                .select('*');
            
            if (error) throw error;
            return data || [];
        } catch (error) {
            console.error('Get votes error:', error);
            return [];
        }
    },
    
    async addVote(voteData) {
        if (!await this.ensureInit()) return null;
        
        try {
            const votes = await this.getVotes();
            const maxId = votes.length > 0 ? Math.max(...votes.map(v => parseInt(v.id) || 0)) : 0;
            const newId = maxId + 1;
            
            const newVote = {
                id: newId,
                ...this.cleanData(voteData),
                createdat: new Date().toISOString()
            };
            
            const { data, error } = await this.supabase
                .from('votes')
                .insert([newVote])
                .select()
                .single();
            
            if (error) throw error;
            return data;
        } catch (error) {
            console.error('Add vote error:', error);
            throw error;
        }
    },
    
    async updateVote(id, updates) {
        if (!await this.ensureInit()) return null;
        
        try {
            const { data, error } = await this.supabase
                .from('votes')
                .update(this.cleanData(updates))
                .eq('id', id)
                .select()
                .single();
            
            if (error) throw error;
            return data;
        } catch (error) {
            console.error('Update vote error:', error);
            throw error;
        }
    },
    
    async deleteVote(id) {
        if (!await this.ensureInit()) return false;
        
        try {
            const { error } = await this.supabase
                .from('votes')
                .delete()
                .eq('id', id);
            
            if (error) throw error;
            return true;
        } catch (error) {
            console.error('Delete vote error:', error);
            throw error;
        }
    },
    
    async getVoteRecords() {
        if (!await this.ensureInit()) return [];
        
        try {
            const { data, error } = await this.supabase
                .from('vote_records')
                .select('*');
            
            if (error) throw error;
            return data || [];
        } catch (error) {
            console.error('Get vote records error:', error);
            return [];
        }
    },
    
    async addVoteRecord(recordData) {
        if (!await this.ensureInit()) return null;
        
        try {
            const records = await this.getVoteRecords();
            const maxId = records.length > 0 ? Math.max(...records.map(r => parseInt(r.id) || 0)) : 0;
            const newId = maxId + 1;
            
            const newRecord = {
                id: newId,
                ...this.cleanData(recordData),
                votedAt: new Date().toISOString()
            };
            
            const { data, error } = await this.supabase
                .from('vote_records')
                .insert([newRecord])
                .select()
                .single();
            
            if (error) throw error;
            return data;
        } catch (error) {
            console.error('Add vote record error:', error);
            throw error;
        }
    },
    
    async getLotteries() {
        if (!await this.ensureInit()) return [];
        
        try {
            const { data, error } = await this.supabase
                .from('lotteries')
                .select('*');
            
            if (error) throw error;
            return data || [];
        } catch (error) {
            console.error('Get lotteries error:', error);
            return [];
        }
    },
    
    async addLottery(lotteryData) {
        if (!await this.ensureInit()) return null;
        
        try {
            const lotteries = await this.getLotteries();
            const maxId = lotteries.length > 0 ? Math.max(...lotteries.map(l => parseInt(l.id) || 0)) : 0;
            const newId = maxId + 1;
            
            const newLottery = {
                id: newId,
                ...this.cleanData(lotteryData),
                createdat: new Date().toISOString()
            };
            
            const { data, error } = await this.supabase
                .from('lotteries')
                .insert([newLottery])
                .select()
                .single();
            
            if (error) throw error;
            return data;
        } catch (error) {
            console.error('Add lottery error:', error);
            throw error;
        }
    },
    
    async updateLottery(id, updates) {
        if (!await this.ensureInit()) return null;
        
        try {
            const { data, error } = await this.supabase
                .from('lotteries')
                .update(this.cleanData(updates))
                .eq('id', id)
                .select()
                .single();
            
            if (error) throw error;
            return data;
        } catch (error) {
            console.error('Update lottery error:', error);
            throw error;
        }
    },
    
    async deleteLottery(id) {
        if (!await this.ensureInit()) return false;
        
        try {
            const { error } = await this.supabase
                .from('lotteries')
                .delete()
                .eq('id', id);
            
            if (error) throw error;
            return true;
        } catch (error) {
            console.error('Delete lottery error:', error);
            throw error;
        }
    },
    
    async getLotteryRecords() {
        if (!await this.ensureInit()) return [];
        
        try {
            const { data, error } = await this.supabase
                .from('lottery_records')
                .select('*');
            
            if (error) throw error;
            return data || [];
        } catch (error) {
            console.error('Get lottery records error:', error);
            return [];
        }
    },
    
    async addLotteryRecord(recordData) {
        if (!await this.ensureInit()) return null;
        
        try {
            const records = await this.getLotteryRecords();
            const maxId = records.length > 0 ? Math.max(...records.map(r => parseInt(r.id) || 0)) : 0;
            const newId = maxId + 1;
            
            const newRecord = {
                id: newId,
                ...this.cleanData(recordData),
                drawnAt: new Date().toISOString()
            };
            
            const { data, error } = await this.supabase
                .from('lottery_records')
                .insert([newRecord])
                .select()
                .single();
            
            if (error) throw error;
            return data;
        } catch (error) {
            console.error('Add lottery record error:', error);
            throw error;
        }
    },
    
    async getNotifications() {
        if (!await this.ensureInit()) return [];
        
        try {
            const { data, error } = await this.supabase
                .from('notifications')
                .select('*')
                .order('createdat', { ascending: false });
            
            if (error) throw error;
            return data || [];
        } catch (error) {
            console.error('Get notifications error:', error);
            return [];
        }
    },
    
    async addNotification(notificationData) {
        if (!await this.ensureInit()) return null;
        
        try {
            const newNotification = {
                id: Date.now(),
                ...this.cleanData(notificationData),
                createdat: new Date().toISOString(),
                read: false
            };
            
            const { data, error } = await this.supabase
                .from('notifications')
                .insert([newNotification])
                .select()
                .single();
            
            if (error) throw error;
            return data;
        } catch (error) {
            console.error('Add notification error:', error);
            throw error;
        }
    },
    
    async markNotificationRead(id) {
        if (!await this.ensureInit()) return false;
        
        try {
            const { error } = await this.supabase
                .from('notifications')
                .update({ read: true })
                .eq('id', id);
            
            if (error) throw error;
            return true;
        } catch (error) {
            console.error('Mark notification read error:', error);
            throw error;
        }
    },
    
    async getPasswordResetRequests() {
        if (!await this.ensureInit()) return [];
        
        try {
            const { data, error } = await this.supabase
                .from('password_reset_requests')
                .select('*');
            
            if (error) throw error;
            return data || [];
        } catch (error) {
            console.error('Get password reset requests error:', error);
            return [];
        }
    },
    
    async addPasswordResetRequest(requestData) {
        if (!await this.ensureInit()) return null;
        
        try {
            const newRequest = {
                id: Date.now(),
                ...this.cleanData(requestData),
                createdat: new Date().toISOString(),
                status: 'pending'
            };
            
            const { data, error } = await this.supabase
                .from('password_reset_requests')
                .insert([newRequest])
                .select()
                .single();
            
            if (error) throw error;
            return data;
        } catch (error) {
            console.error('Add password reset request error:', error);
            throw error;
        }
    },
    
    async processPasswordResetRequest(id, processed) {
        if (!await this.ensureInit()) return false;
        
        try {
            const { data: request, error: error1 } = await this.supabase
                .from('password_reset_requests')
                .select('*')
                .eq('id', id)
                .single();
            
            if (error1) throw error1;
            
            const { error: error2 } = await this.supabase
                .from('password_reset_requests')
                .update({
                    status: processed ? 'processed' : 'rejected',
                    processedAt: new Date().toISOString()
                })
                .eq('id', id);
            
            if (error2) throw error2;
            
            if (processed && request) {
                await this.updateUser(request.userId, { password: '123456' });
            }
            
            return true;
        } catch (error) {
            console.error('Process password reset request error:', error);
            throw error;
        }
    },
    
    async getSettings() {
        const saved = localStorage.getItem('settings');
        return saved ? JSON.parse(saved) : {};
    },
    
    async saveSettings(settings) {
        localStorage.setItem('settings', JSON.stringify(settings));
        return settings;
    },
    
    async getPermissionSettings() {
        const saved = localStorage.getItem('permissionSettings');
        return saved ? JSON.parse(saved) : {
            attendance: { showMemberList: true, showSignedCount: true, showUnsignedList: false },
            exam: { showMemberList: true, showScores: false, showAnswers: false, showRanking: false },
            vote: { showMemberList: true, showVoteCount: true, showVoteDetails: false },
            lottery: { showMemberList: true, showPrizeList: true, showWinnerList: false }
        };
    },
    
    async savePermissionSettings(settings) {
        localStorage.setItem('permissionSettings', JSON.stringify(settings));
    },
    
    async canView(module, permission) {
        const user = this.getCurrentUser();
        if (!user) return false;
        
        if (user.role === 'admin' || user.role === 'subAdmin') {
            return true;
        }
        
        const settings = await this.getPermissionSettings();
        if (settings[module] && settings[module][permission] !== undefined) {
            return settings[module][permission];
        }
        
        return false;
    },
    
    exportToCSV(data, filename) {
        if (!data || data.length === 0) {
            alert('没有数据可导出');
            return;
        }
        
        const headers = Object.keys(data[0]);
        const csvContent = [
            headers.join(','),
            ...data.map(row => headers.map(h => {
                let value = row[h];
                if (typeof value === 'object') value = JSON.stringify(value);
                value = String(value || '').replace(/"/g, '""');
                return `"${value}"`;
            }).join(','))
        ].join('\n');
        
        const BOM = '\uFEFF';
        const blob = new Blob([BOM + csvContent], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement('a');
        link.href = URL.createObjectURL(blob);
        link.download = filename + '.csv';
        link.click();
    },
    
    // 问卷相关方法
    async getQuestionnaires() {
        if (!await this.ensureInit()) return [];
        
        try {
            const { data, error } = await this.supabase
                .from('questionnaires')
                .select('*')
                .order('createdat', { ascending: false });
            
            if (error) throw error;
            return data || [];
        } catch (error) {
            console.error('Get questionnaires error:', error);
            return [];
        }
    },
    
    async getQuestionnaireById(id) {
        if (!await this.ensureInit()) return null;
        
        try {
            const { data, error } = await this.supabase
                .from('questionnaires')
                .select('*')
                .eq('id', id)
                .single();
            
            if (error) throw error;
            return data;
        } catch (error) {
            console.error('Get questionnaire error:', error);
            return null;
        }
    },
    
    async addQuestionnaire(questionnaireData) {
        if (!await this.ensureInit()) return null;
        
        try {
            const questionnaires = await this.getQuestionnaires();
            const maxId = questionnaires.length > 0 ? Math.max(...questionnaires.map(q => parseInt(q.id) || 0)) : 0;
            const newId = maxId + 1;
            
            const newQuestionnaire = {
                id: newId,
                ...this.cleanData(questionnaireData),
                createdat: new Date().toISOString()
            };
            
            const { data, error } = await this.supabase
                .from('questionnaires')
                .insert([newQuestionnaire])
                .select()
                .single();
            
            if (error) throw error;
            return data;
        } catch (error) {
            console.error('Add questionnaire error:', error);
            throw error;
        }
    },
    
    async updateQuestionnaire(id, updates) {
        if (!await this.ensureInit()) return null;
        
        try {
            const { data, error } = await this.supabase
                .from('questionnaires')
                .update(this.cleanData(updates))
                .eq('id', id)
                .select()
                .single();
            
            if (error) throw error;
            return data;
        } catch (error) {
            console.error('Update questionnaire error:', error);
            throw error;
        }
    },
    
    async deleteQuestionnaire(id) {
        if (!await this.ensureInit()) return false;
        
        try {
            const { error } = await this.supabase
                .from('questionnaires')
                .delete()
                .eq('id', id);
            
            if (error) throw error;
            return true;
        } catch (error) {
            console.error('Delete questionnaire error:', error);
            throw error;
        }
    },
    
    async getQuestionnaireRecords() {
        if (!await this.ensureInit()) return [];
        
        try {
            const { data, error } = await this.supabase
                .from('questionnaire_records')
                .select('*')
                .order('createdat', { ascending: false });
            
            if (error) throw error;
            return data || [];
        } catch (error) {
            console.error('Get questionnaire records error:', error);
            return [];
        }
    },
    
    async addQuestionnaireRecord(recordData) {
        if (!await this.ensureInit()) return null;
        
        try {
            const records = await this.getQuestionnaireRecords();
            const maxId = records.length > 0 ? Math.max(...records.map(r => parseInt(r.id) || 0)) : 0;
            const newId = maxId + 1;
            
            const newRecord = {
                id: newId,
                ...this.cleanData(recordData),
                submittedAt: new Date().toISOString()
            };
            
            const { data, error } = await this.supabase
                .from('questionnaire_records')
                .insert([newRecord])
                .select()
                .single();
            
            if (error) throw error;
            return data;
        } catch (error) {
            console.error('Add questionnaire record error:', error);
            throw error;
        }
    }
};

window.SupabaseService = SupabaseService;
