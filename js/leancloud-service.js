const LeanCloudService = {
    initialized: false,
    
    async init() {
        if (this.initialized) return;
        
        try {
            const AV = await this.loadSDK();
            
            const config = window.LeanCloudConfig;
            if (!config || config.appId === 'YOUR_APP_ID') {
                console.log('LeanCloud not configured, using LocalStorage');
                return false;
            }
            
            AV.init({
                appId: config.appId,
                appKey: config.appKey,
                serverURL: config.serverURL
            });
            
            this.AV = AV;
            this.initialized = true;
            console.log('LeanCloud initialized successfully');
            return true;
        } catch (error) {
            console.error('LeanCloud initialization error:', error);
            return false;
        }
    },
    
    loadSDK() {
        return new Promise((resolve, reject) => {
            if (window.AV) {
                resolve(window.AV);
                return;
            }
            
            const script = document.createElement('script');
            script.src = 'https://cdn.jsdelivr.net/npm/leancloud-storage@4.15.0/dist/av-min.js';
            script.onload = () => resolve(window.AV);
            script.onerror = reject;
            document.head.appendChild(script);
        });
    },
    
    async ensureInit() {
        if (!this.initialized) {
            await this.init();
        }
        return this.initialized;
    },
    
    async signIn(username, password) {
        if (!await this.ensureInit()) {
            return { success: false, message: 'LeanCloud not initialized' };
        }
        
        try {
            const user = await this.AV.User.logIn(username, password);
            const userData = await this.getUserByUsername(username);
            
            if (userData) {
                localStorage.setItem('currentUser', JSON.stringify(userData));
                return { success: true, user: userData };
            }
            
            return { success: false, message: '用户数据不存在' };
        } catch (error) {
            console.error('Login error:', error);
            if (error.code === 210) {
                return { success: false, message: '密码错误' };
            } else if (error.code === 211) {
                return { success: false, message: '用户不存在' };
            }
            return { success: false, message: error.message || '登录失败' };
        }
    },
    
    async signOut() {
        if (await this.ensureInit()) {
            try {
                await this.AV.User.logOut();
            } catch (e) {
                console.warn('Logout warning:', e);
            }
        }
        localStorage.removeItem('currentUser');
        return { success: true };
    },
    
    getCurrentUser() {
        const userJson = localStorage.getItem('currentUser');
        return userJson ? JSON.parse(userJson) : null;
    },
    
    async getUsers() {
        if (!await this.ensureInit()) return [];
        
        try {
            const query = new this.AV.Query('Users');
            const results = await query.find();
            return results.map(item => {
                const data = item.toJSON();
                return { id: data.id || data.objectId, ...data };
            });
        } catch (error) {
            console.error('Get users error:', error);
            return [];
        }
    },
    
    async getUserById(id) {
        if (!await this.ensureInit()) return null;
        
        try {
            const query = new this.AV.Query('Users');
            const results = await query.equalTo('id', String(id)).find();
            if (results.length > 0) {
                const data = results[0].toJSON();
                return { id: data.id || data.objectId, ...data };
            }
            return null;
        } catch (error) {
            console.error('Get user error:', error);
            return null;
        }
    },
    
    async getUserByUsername(username) {
        if (!await this.ensureInit()) return null;
        
        try {
            const query = new this.AV.Query('Users');
            const results = await query.equalTo('username', username).find();
            if (results.length > 0) {
                const data = results[0].toJSON();
                return { id: data.id || data.objectId, ...data };
            }
            return null;
        } catch (error) {
            console.error('Get user by username error:', error);
            return null;
        }
    },
    
    async addUser(userData) {
        if (!await this.ensureInit()) return null;
        
        try {
            const users = await this.getUsers();
            const maxId = users.length > 0 ? Math.max(...users.map(u => parseInt(u.id) || 0)) : 0;
            const newId = String(maxId + 1);
            
            const UserClass = this.AV.Object.extend('Users');
            const user = new UserClass();
            
            user.set('id', newId);
            user.set('username', userData.username);
            user.set('password', userData.password || '123456');
            user.set('name', userData.name);
            user.set('role', userData.role || 'user');
            user.set('department', userData.department || '');
            user.set('className', userData.className || '');
            user.set('email', userData.email || '');
            user.set('phone', userData.phone || '');
            user.set('remark', userData.remark || '');
            user.set('status', userData.status || 'active');
            user.set('createdAt', new Date().toISOString());
            
            await user.save();
            
            return {
                id: newId,
                ...userData,
                status: userData.status || 'active',
                createdAt: new Date().toISOString()
            };
        } catch (error) {
            console.error('Add user error:', error);
            throw error;
        }
    },
    
    async updateUser(id, updates) {
        if (!await this.ensureInit()) return null;
        
        try {
            const query = new this.AV.Query('Users');
            const results = await query.equalTo('id', String(id)).find();
            
            if (results.length > 0) {
                const user = results[0];
                Object.keys(updates).forEach(key => {
                    user.set(key, updates[key]);
                });
                await user.save();
                return { id, ...updates };
            }
            return null;
        } catch (error) {
            console.error('Update user error:', error);
            throw error;
        }
    },
    
    async deleteUser(id) {
        if (!await this.ensureInit()) return false;
        
        try {
            const query = new this.AV.Query('Users');
            const results = await query.equalTo('id', String(id)).find();
            
            if (results.length > 0) {
                await results[0].destroy();
                return true;
            }
            return false;
        } catch (error) {
            console.error('Delete user error:', error);
            throw error;
        }
    },
    
    async getGroups() {
        if (!await this.ensureInit()) return [];
        
        try {
            const query = new this.AV.Query('Groups');
            const results = await query.find();
            return results.map(item => {
                const data = item.toJSON();
                return { id: data.id || data.objectId, ...data };
            });
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
            const newId = String(maxId + 1);
            
            const GroupClass = this.AV.Object.extend('Groups');
            const group = new GroupClass();
            
            group.set('id', newId);
            group.set('name', groupData.name);
            group.set('members', groupData.members || []);
            group.set('createdAt', new Date().toISOString());
            
            await group.save();
            
            return {
                id: newId,
                ...groupData,
                createdAt: new Date().toISOString()
            };
        } catch (error) {
            console.error('Add group error:', error);
            throw error;
        }
    },
    
    async updateGroup(id, updates) {
        if (!await this.ensureInit()) return null;
        
        try {
            const query = new this.AV.Query('Groups');
            const results = await query.equalTo('id', String(id)).find();
            
            if (results.length > 0) {
                const group = results[0];
                Object.keys(updates).forEach(key => {
                    group.set(key, updates[key]);
                });
                await group.save();
                return { id, ...updates };
            }
            return null;
        } catch (error) {
            console.error('Update group error:', error);
            throw error;
        }
    },
    
    async deleteGroup(id) {
        if (!await this.ensureInit()) return false;
        
        try {
            const query = new this.AV.Query('Groups');
            const results = await query.equalTo('id', String(id)).find();
            
            if (results.length > 0) {
                await results[0].destroy();
                return true;
            }
            return false;
        } catch (error) {
            console.error('Delete group error:', error);
            throw error;
        }
    },
    
    async getAttendances() {
        if (!await this.ensureInit()) return [];
        
        try {
            const query = new this.AV.Query('Attendances');
            const results = await query.find();
            return results.map(item => {
                const data = item.toJSON();
                return { id: data.id || data.objectId, ...data };
            });
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
            const newId = String(maxId + 1);
            
            const AttendanceClass = this.AV.Object.extend('Attendances');
            const attendance = new AttendanceClass();
            
            attendance.set('id', newId);
            Object.keys(attendanceData).forEach(key => {
                attendance.set(key, attendanceData[key]);
            });
            attendance.set('createdAt', new Date().toISOString());
            
            await attendance.save();
            
            return { id: newId, ...attendanceData, createdAt: new Date().toISOString() };
        } catch (error) {
            console.error('Add attendance error:', error);
            throw error;
        }
    },
    
    async updateAttendance(id, updates) {
        if (!await this.ensureInit()) return null;
        
        try {
            const query = new this.AV.Query('Attendances');
            const results = await query.equalTo('id', String(id)).find();
            
            if (results.length > 0) {
                const attendance = results[0];
                Object.keys(updates).forEach(key => {
                    attendance.set(key, updates[key]);
                });
                await attendance.save();
                return { id, ...updates };
            }
            return null;
        } catch (error) {
            console.error('Update attendance error:', error);
            throw error;
        }
    },
    
    async deleteAttendance(id) {
        if (!await this.ensureInit()) return false;
        
        try {
            const query = new this.AV.Query('Attendances');
            const results = await query.equalTo('id', String(id)).find();
            
            if (results.length > 0) {
                await results[0].destroy();
                return true;
            }
            return false;
        } catch (error) {
            console.error('Delete attendance error:', error);
            throw error;
        }
    },
    
    async getAttendanceRecords() {
        if (!await this.ensureInit()) return [];
        
        try {
            const query = new this.AV.Query('AttendanceRecords');
            const results = await query.find();
            return results.map(item => {
                const data = item.toJSON();
                return { id: data.id || data.objectId, ...data };
            });
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
            const newId = String(maxId + 1);
            
            const RecordClass = this.AV.Object.extend('AttendanceRecords');
            const record = new RecordClass();
            
            record.set('id', newId);
            Object.keys(recordData).forEach(key => {
                record.set(key, recordData[key]);
            });
            record.set('createdAt', new Date().toISOString());
            
            await record.save();
            
            return { id: newId, ...recordData, createdAt: new Date().toISOString() };
        } catch (error) {
            console.error('Add attendance record error:', error);
            throw error;
        }
    },
    
    async getExams() {
        if (!await this.ensureInit()) return [];
        
        try {
            const query = new this.AV.Query('Exams');
            const results = await query.find();
            return results.map(item => {
                const data = item.toJSON();
                return { id: data.id || data.objectId, ...data };
            });
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
            const newId = String(maxId + 1);
            
            const ExamClass = this.AV.Object.extend('Exams');
            const exam = new ExamClass();
            
            exam.set('id', newId);
            Object.keys(examData).forEach(key => {
                exam.set(key, examData[key]);
            });
            exam.set('createdAt', new Date().toISOString());
            
            await exam.save();
            
            return { id: newId, ...examData, createdAt: new Date().toISOString() };
        } catch (error) {
            console.error('Add exam error:', error);
            throw error;
        }
    },
    
    async updateExam(id, updates) {
        if (!await this.ensureInit()) return null;
        
        try {
            const query = new this.AV.Query('Exams');
            const results = await query.equalTo('id', String(id)).find();
            
            if (results.length > 0) {
                const exam = results[0];
                Object.keys(updates).forEach(key => {
                    exam.set(key, updates[key]);
                });
                await exam.save();
                return { id, ...updates };
            }
            return null;
        } catch (error) {
            console.error('Update exam error:', error);
            throw error;
        }
    },
    
    async deleteExam(id) {
        if (!await this.ensureInit()) return false;
        
        try {
            const query = new this.AV.Query('Exams');
            const results = await query.equalTo('id', String(id)).find();
            
            if (results.length > 0) {
                await results[0].destroy();
                return true;
            }
            return false;
        } catch (error) {
            console.error('Delete exam error:', error);
            throw error;
        }
    },
    
    async getQuestions() {
        if (!await this.ensureInit()) return [];
        
        try {
            const query = new this.AV.Query('Questions');
            const results = await query.find();
            return results.map(item => {
                const data = item.toJSON();
                return { id: data.id || data.objectId, ...data };
            });
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
            const newId = String(maxId + 1);
            
            const QuestionClass = this.AV.Object.extend('Questions');
            const question = new QuestionClass();
            
            question.set('id', newId);
            Object.keys(questionData).forEach(key => {
                question.set(key, questionData[key]);
            });
            question.set('createdAt', new Date().toISOString());
            
            await question.save();
            
            return { id: newId, ...questionData, createdAt: new Date().toISOString() };
        } catch (error) {
            console.error('Add question error:', error);
            throw error;
        }
    },
    
    async getExamRecords() {
        if (!await this.ensureInit()) return [];
        
        try {
            const query = new this.AV.Query('ExamRecords');
            const results = await query.find();
            return results.map(item => {
                const data = item.toJSON();
                return { id: data.id || data.objectId, ...data };
            });
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
            const newId = String(maxId + 1);
            
            const RecordClass = this.AV.Object.extend('ExamRecords');
            const record = new RecordClass();
            
            record.set('id', newId);
            Object.keys(recordData).forEach(key => {
                record.set(key, recordData[key]);
            });
            record.set('submittedAt', new Date().toISOString());
            
            await record.save();
            
            return { id: newId, ...recordData, submittedAt: new Date().toISOString() };
        } catch (error) {
            console.error('Add exam record error:', error);
            throw error;
        }
    },
    
    async getVotes() {
        if (!await this.ensureInit()) return [];
        
        try {
            const query = new this.AV.Query('Votes');
            const results = await query.find();
            return results.map(item => {
                const data = item.toJSON();
                return { id: data.id || data.objectId, ...data };
            });
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
            const newId = String(maxId + 1);
            
            const VoteClass = this.AV.Object.extend('Votes');
            const vote = new VoteClass();
            
            vote.set('id', newId);
            Object.keys(voteData).forEach(key => {
                vote.set(key, voteData[key]);
            });
            vote.set('createdAt', new Date().toISOString());
            
            await vote.save();
            
            return { id: newId, ...voteData, createdAt: new Date().toISOString() };
        } catch (error) {
            console.error('Add vote error:', error);
            throw error;
        }
    },
    
    async updateVote(id, updates) {
        if (!await this.ensureInit()) return null;
        
        try {
            const query = new this.AV.Query('Votes');
            const results = await query.equalTo('id', String(id)).find();
            
            if (results.length > 0) {
                const vote = results[0];
                Object.keys(updates).forEach(key => {
                    vote.set(key, updates[key]);
                });
                await vote.save();
                return { id, ...updates };
            }
            return null;
        } catch (error) {
            console.error('Update vote error:', error);
            throw error;
        }
    },
    
    async deleteVote(id) {
        if (!await this.ensureInit()) return false;
        
        try {
            const query = new this.AV.Query('Votes');
            const results = await query.equalTo('id', String(id)).find();
            
            if (results.length > 0) {
                await results[0].destroy();
                return true;
            }
            return false;
        } catch (error) {
            console.error('Delete vote error:', error);
            throw error;
        }
    },
    
    async getVoteRecords() {
        if (!await this.ensureInit()) return [];
        
        try {
            const query = new this.AV.Query('VoteRecords');
            const results = await query.find();
            return results.map(item => {
                const data = item.toJSON();
                return { id: data.id || data.objectId, ...data };
            });
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
            const newId = String(maxId + 1);
            
            const RecordClass = this.AV.Object.extend('VoteRecords');
            const record = new RecordClass();
            
            record.set('id', newId);
            Object.keys(recordData).forEach(key => {
                record.set(key, recordData[key]);
            });
            record.set('votedAt', new Date().toISOString());
            
            await record.save();
            
            return { id: newId, ...recordData, votedAt: new Date().toISOString() };
        } catch (error) {
            console.error('Add vote record error:', error);
            throw error;
        }
    },
    
    async getLotteries() {
        if (!await this.ensureInit()) return [];
        
        try {
            const query = new this.AV.Query('Lotteries');
            const results = await query.find();
            return results.map(item => {
                const data = item.toJSON();
                return { id: data.id || data.objectId, ...data };
            });
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
            const newId = String(maxId + 1);
            
            const LotteryClass = this.AV.Object.extend('Lotteries');
            const lottery = new LotteryClass();
            
            lottery.set('id', newId);
            Object.keys(lotteryData).forEach(key => {
                lottery.set(key, lotteryData[key]);
            });
            lottery.set('createdAt', new Date().toISOString());
            
            await lottery.save();
            
            return { id: newId, ...lotteryData, createdAt: new Date().toISOString() };
        } catch (error) {
            console.error('Add lottery error:', error);
            throw error;
        }
    },
    
    async updateLottery(id, updates) {
        if (!await this.ensureInit()) return null;
        
        try {
            const query = new this.AV.Query('Lotteries');
            const results = await query.equalTo('id', String(id)).find();
            
            if (results.length > 0) {
                const lottery = results[0];
                Object.keys(updates).forEach(key => {
                    lottery.set(key, updates[key]);
                });
                await lottery.save();
                return { id, ...updates };
            }
            return null;
        } catch (error) {
            console.error('Update lottery error:', error);
            throw error;
        }
    },
    
    async deleteLottery(id) {
        if (!await this.ensureInit()) return false;
        
        try {
            const query = new this.AV.Query('Lotteries');
            const results = await query.equalTo('id', String(id)).find();
            
            if (results.length > 0) {
                await results[0].destroy();
                return true;
            }
            return false;
        } catch (error) {
            console.error('Delete lottery error:', error);
            throw error;
        }
    },
    
    async getLotteryRecords() {
        if (!await this.ensureInit()) return [];
        
        try {
            const query = new this.AV.Query('LotteryRecords');
            const results = await query.find();
            return results.map(item => {
                const data = item.toJSON();
                return { id: data.id || data.objectId, ...data };
            });
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
            const newId = String(maxId + 1);
            
            const RecordClass = this.AV.Object.extend('LotteryRecords');
            const record = new RecordClass();
            
            record.set('id', newId);
            Object.keys(recordData).forEach(key => {
                record.set(key, recordData[key]);
            });
            record.set('drawnAt', new Date().toISOString());
            
            await record.save();
            
            return { id: newId, ...recordData, drawnAt: new Date().toISOString() };
        } catch (error) {
            console.error('Add lottery record error:', error);
            throw error;
        }
    },
    
    async getNotifications() {
        if (!await this.ensureInit()) return [];
        
        try {
            const query = new this.AV.Query('Notifications');
            query.descending('createdAt');
            const results = await query.find();
            return results.map(item => {
                const data = item.toJSON();
                return { id: data.id || data.objectId, ...data };
            });
        } catch (error) {
            console.error('Get notifications error:', error);
            return [];
        }
    },
    
    async addNotification(notificationData) {
        if (!await this.ensureInit()) return null;
        
        try {
            const NotificationClass = this.AV.Object.extend('Notifications');
            const notification = new NotificationClass();
            
            notification.set('id', Date.now().toString());
            Object.keys(notificationData).forEach(key => {
                notification.set(key, notificationData[key]);
            });
            notification.set('createdAt', new Date().toISOString());
            notification.set('read', false);
            
            await notification.save();
            
            return { id: Date.now().toString(), ...notificationData, createdAt: new Date().toISOString(), read: false };
        } catch (error) {
            console.error('Add notification error:', error);
            throw error;
        }
    },
    
    async markNotificationRead(id) {
        if (!await this.ensureInit()) return false;
        
        try {
            const query = new this.AV.Query('Notifications');
            const results = await query.equalTo('id', String(id)).find();
            
            if (results.length > 0) {
                results[0].set('read', true);
                await results[0].save();
                return true;
            }
            return false;
        } catch (error) {
            console.error('Mark notification read error:', error);
            throw error;
        }
    },
    
    async getPasswordResetRequests() {
        if (!await this.ensureInit()) return [];
        
        try {
            const query = new this.AV.Query('PasswordResetRequests');
            const results = await query.find();
            return results.map(item => {
                const data = item.toJSON();
                return { id: data.id || data.objectId, ...data };
            });
        } catch (error) {
            console.error('Get password reset requests error:', error);
            return [];
        }
    },
    
    async addPasswordResetRequest(requestData) {
        if (!await this.ensureInit()) return null;
        
        try {
            const RequestClass = this.AV.Object.extend('PasswordResetRequests');
            const request = new RequestClass();
            
            request.set('id', Date.now().toString());
            Object.keys(requestData).forEach(key => {
                request.set(key, requestData[key]);
            });
            request.set('createdAt', new Date().toISOString());
            request.set('status', 'pending');
            
            await request.save();
            
            return { id: Date.now().toString(), ...requestData, createdAt: new Date().toISOString(), status: 'pending' };
        } catch (error) {
            console.error('Add password reset request error:', error);
            throw error;
        }
    },
    
    async processPasswordResetRequest(id, processed) {
        if (!await this.ensureInit()) return false;
        
        try {
            const query = new this.AV.Query('PasswordResetRequests');
            const results = await query.equalTo('id', String(id)).find();
            
            if (results.length > 0) {
                const request = results[0];
                request.set('status', processed ? 'processed' : 'rejected');
                request.set('processedAt', new Date().toISOString());
                await request.save();
                
                if (processed) {
                    const requestData = request.toJSON();
                    const user = await this.getUserByUsername(requestData.username);
                    if (user) {
                        await this.updateUser(user.id, { password: '123456' });
                    }
                }
                return true;
            }
            return false;
        } catch (error) {
            console.error('Process password reset request error:', error);
            throw error;
        }
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
                if (typeof value === 'object') {
                    value = JSON.stringify(value);
                }
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
    }
};

window.LeanCloudService = LeanCloudService;
