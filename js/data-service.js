const DataService = {
    useFirebase: false,
    useLeanCloud: false,
    useSupabase: false,
    initialized: false,
    
    async init() {
        if (this.initialized) return;
        
        const supabaseConfig = window.SupabaseConfig;
        if (supabaseConfig && supabaseConfig.url && supabaseConfig.url !== 'YOUR_SUPABASE_URL') {
            try {
                const success = await SupabaseService.init();
                if (success) {
                    this.useSupabase = true;
                    console.log('Using Supabase for data storage');
                }
            } catch (error) {
                console.warn('Supabase init failed:', error);
            }
        }
        
        if (!this.useSupabase) {
            const leancloudConfig = window.LeanCloudConfig;
            if (leancloudConfig && leancloudConfig.appId && leancloudConfig.appId !== 'YOUR_APP_ID') {
                try {
                    const success = await LeanCloudService.init();
                    if (success) {
                        this.useLeanCloud = true;
                        console.log('Using LeanCloud for data storage');
                    }
                } catch (error) {
                    console.warn('LeanCloud init failed:', error);
                }
            }
        }
        
        if (!this.useSupabase && !this.useLeanCloud) {
            const firebaseConfig = window.FirebaseConfig;
            if (firebaseConfig && firebaseConfig.apiKey && firebaseConfig.apiKey !== 'YOUR_API_KEY') {
                try {
                    await FirebaseService.init();
                    this.useFirebase = true;
                    console.log('Using Firebase for data storage');
                } catch (error) {
                    console.warn('Firebase init failed, falling back to LocalStorage:', error);
                    this.useFirebase = false;
                }
            }
        }
        
        if (!this.useSupabase && !this.useLeanCloud && !this.useFirebase) {
            console.log('Using LocalStorage for data storage');
            DataStore.init();
        }
        
        this.initialized = true;
    },
    
    async ensureInit() {
        if (!this.initialized) {
            await this.init();
        }
    },
    
    async getUsers() {
        await this.ensureInit();
        if (this.useSupabase) return await SupabaseService.getUsers();
        if (this.useLeanCloud) return await LeanCloudService.getUsers();
        if (this.useFirebase) return await FirebaseService.getUsers();
        return DataStore.getUsers();
    },
    
    async saveUsers(users) {
        await this.ensureInit();
        if (!this.useSupabase && !this.useLeanCloud && !this.useFirebase) DataStore.saveUsers(users);
    },
    
    async getUserByUsername(username) {
        await this.ensureInit();
        if (this.useSupabase) return await SupabaseService.getUserByUsername(username);
        if (this.useLeanCloud) return await LeanCloudService.getUserByUsername(username);
        if (this.useFirebase) return await FirebaseService.getUserByUsername(username);
        return DataStore.getUserByUsername(username);
    },
    
    async getUserById(id) {
        await this.ensureInit();
        if (this.useSupabase) return await SupabaseService.getUserById(id);
        if (this.useLeanCloud) return await LeanCloudService.getUserById(id);
        if (this.useFirebase) return await FirebaseService.getUserById(id);
        return DataStore.getUserById(id);
    },
    
    async addUser(user) {
        await this.ensureInit();
        console.log('DataService.addUser called, useSupabase:', this.useSupabase);
        try {
            if (this.useSupabase) {
                console.log('Using Supabase to add user');
                const result = await SupabaseService.addUser(user);
                console.log('Supabase add user result:', result);
                return result;
            }
            if (this.useLeanCloud) return await LeanCloudService.addUser(user);
            if (this.useFirebase) return await FirebaseService.addUser(user);
            console.log('Using LocalStorage to add user');
            return DataStore.addUser(user);
        } catch (error) {
            console.error('Cloud storage failed, falling back to LocalStorage:', error);
            return DataStore.addUser(user);
        }
    },
    
    async updateUser(id, updates) {
        await this.ensureInit();
        console.log('DataService.updateUser called, useSupabase:', this.useSupabase);
        try {
            if (this.useSupabase) {
                console.log('Using Supabase to update user');
                const result = await SupabaseService.updateUser(id, updates);
                console.log('Supabase update user result:', result);
                return result;
            }
            if (this.useLeanCloud) return await LeanCloudService.updateUser(id, updates);
            if (this.useFirebase) return await FirebaseService.updateUser(id, updates);
            console.log('Using LocalStorage to update user');
            return DataStore.updateUser(id, updates);
        } catch (error) {
            console.error('Cloud storage failed, falling back to LocalStorage:', error);
            return DataStore.updateUser(id, updates);
        }
    },
    
    async deleteUser(id) {
        await this.ensureInit();
        if (this.useSupabase) return await SupabaseService.deleteUser(id);
        if (this.useLeanCloud) return await LeanCloudService.deleteUser(id);
        if (this.useFirebase) return await FirebaseService.deleteUser(id);
        return DataStore.deleteUser(id);
    },
    
    async getGroups() {
        await this.ensureInit();
        if (this.useSupabase) return await SupabaseService.getGroups();
        if (this.useLeanCloud) return await LeanCloudService.getGroups();
        if (this.useFirebase) return await FirebaseService.getGroups();
        return DataStore.getGroups();
    },
    
    async saveGroups(groups) {
        await this.ensureInit();
        if (!this.useSupabase && !this.useLeanCloud && !this.useFirebase) DataStore.saveGroups(groups);
    },
    
    async addGroup(group) {
        await this.ensureInit();
        if (this.useSupabase) return await SupabaseService.addGroup(group);
        if (this.useLeanCloud) return await LeanCloudService.addGroup(group);
        if (this.useFirebase) return await FirebaseService.addGroup(group);
        return DataStore.addGroup(group);
    },
    
    async updateGroup(id, updates) {
        await this.ensureInit();
        if (this.useSupabase) return await SupabaseService.updateGroup(id, updates);
        if (this.useLeanCloud) return await LeanCloudService.updateGroup(id, updates);
        if (this.useFirebase) return await FirebaseService.updateGroup(id, updates);
        return DataStore.updateGroup(id, updates);
    },
    
    async deleteGroup(id) {
        await this.ensureInit();
        if (this.useSupabase) return await SupabaseService.deleteGroup(id);
        if (this.useLeanCloud) return await LeanCloudService.deleteGroup(id);
        if (this.useFirebase) return await FirebaseService.deleteGroup(id);
        return DataStore.deleteGroup(id);
    },
    
    async getGroupById(id) {
        await this.ensureInit();
        if (this.useSupabase) return await SupabaseService.getGroupById(id);
        if (this.useLeanCloud) return await LeanCloudService.getGroupById(id);
        if (this.useFirebase) return await FirebaseService.getGroupById(id);
        const groups = await this.getGroups();
        return groups.find(g => g.id === id);
    },
    
    async getAttendances() {
        await this.ensureInit();
        if (this.useSupabase) return await SupabaseService.getAttendances();
        if (this.useLeanCloud) return await LeanCloudService.getAttendances();
        if (this.useFirebase) return await FirebaseService.getAttendances();
        return DataStore.getAttendances();
    },
    
    async saveAttendances(attendances) {
        await this.ensureInit();
        if (!this.useSupabase && !this.useLeanCloud && !this.useFirebase) DataStore.saveAttendances(attendances);
    },
    
    async addAttendance(attendance) {
        await this.ensureInit();
        if (this.useSupabase) return await SupabaseService.addAttendance(attendance);
        if (this.useLeanCloud) return await LeanCloudService.addAttendance(attendance);
        if (this.useFirebase) return await FirebaseService.addAttendance(attendance);
        return DataStore.addAttendance(attendance);
    },
    
    async updateAttendance(id, updates) {
        await this.ensureInit();
        if (this.useSupabase) return await SupabaseService.updateAttendance(id, updates);
        if (this.useLeanCloud) return await LeanCloudService.updateAttendance(id, updates);
        if (this.useFirebase) return await FirebaseService.updateAttendance(id, updates);
        const attendances = await this.getAttendances();
        const index = attendances.findIndex(a => a.id === id);
        if (index !== -1) {
            attendances[index] = { ...attendances[index], ...updates };
            await this.saveAttendances(attendances);
            return attendances[index];
        }
        return null;
    },
    
    async deleteAttendance(id) {
        await this.ensureInit();
        if (this.useSupabase) return await SupabaseService.deleteAttendance(id);
        if (this.useLeanCloud) return await LeanCloudService.deleteAttendance(id);
        if (this.useFirebase) return await FirebaseService.deleteAttendance(id);
        const attendances = await this.getAttendances();
        const filtered = attendances.filter(a => a.id !== id);
        await this.saveAttendances(filtered);
        return filtered.length < attendances.length;
    },
    
    async getAttendanceRecords() {
        await this.ensureInit();
        if (this.useSupabase) return await SupabaseService.getAttendanceRecords();
        if (this.useLeanCloud) return await LeanCloudService.getAttendanceRecords();
        if (this.useFirebase) return await FirebaseService.getAttendanceRecords();
        return DataStore.getAttendanceRecords();
    },
    
    async saveAttendanceRecords(records) {
        await this.ensureInit();
        if (!this.useSupabase && !this.useLeanCloud && !this.useFirebase) DataStore.saveAttendanceRecords(records);
    },
    
    async addAttendanceRecord(record) {
        await this.ensureInit();
        if (this.useSupabase) return await SupabaseService.addAttendanceRecord(record);
        if (this.useLeanCloud) return await LeanCloudService.addAttendanceRecord(record);
        if (this.useFirebase) return await FirebaseService.addAttendanceRecord(record);
        return DataStore.addAttendanceRecord(record);
    },
    
    async getQuestions() {
        await this.ensureInit();
        if (this.useSupabase) return await SupabaseService.getQuestions();
        if (this.useLeanCloud) return await LeanCloudService.getQuestions();
        if (this.useFirebase) return await FirebaseService.getQuestions();
        return DataStore.getQuestions();
    },
    
    async saveQuestions(questions) {
        await this.ensureInit();
        if (!this.useSupabase && !this.useLeanCloud && !this.useFirebase) DataStore.saveQuestions(questions);
    },
    
    async addQuestion(question) {
        await this.ensureInit();
        try {
            if (this.useSupabase) return await SupabaseService.addQuestion(question);
            if (this.useLeanCloud) return await LeanCloudService.addQuestion(question);
            if (this.useFirebase) return await FirebaseService.addQuestion(question);
            return DataStore.addQuestion(question);
        } catch (error) {
            console.error('Cloud storage failed, falling back to LocalStorage:', error);
            return DataStore.addQuestion(question);
        }
    },
    
    async deleteQuestion(id) {
        await this.ensureInit();
        if (this.useSupabase) return await SupabaseService.deleteQuestion(id);
        if (this.useLeanCloud) return await LeanCloudService.deleteQuestion(id);
        if (this.useFirebase) return await FirebaseService.deleteQuestion(id);
        return DataStore.deleteQuestion(id);
    },
    
    async getExams() {
        await this.ensureInit();
        if (this.useSupabase) return await SupabaseService.getExams();
        if (this.useLeanCloud) return await LeanCloudService.getExams();
        if (this.useFirebase) return await FirebaseService.getExams();
        return DataStore.getExams();
    },
    
    async saveExams(exams) {
        await this.ensureInit();
        if (!this.useSupabase && !this.useLeanCloud && !this.useFirebase) DataStore.saveExams(exams);
    },
    
    async addExam(exam) {
        await this.ensureInit();
        if (this.useSupabase) return await SupabaseService.addExam(exam);
        if (this.useLeanCloud) return await LeanCloudService.addExam(exam);
        if (this.useFirebase) return await FirebaseService.addExam(exam);
        return DataStore.addExam(exam);
    },
    
    async updateExam(id, updates) {
        await this.ensureInit();
        if (this.useSupabase) return await SupabaseService.updateExam(id, updates);
        if (this.useLeanCloud) return await LeanCloudService.updateExam(id, updates);
        if (this.useFirebase) return await FirebaseService.updateExam(id, updates);
        const exams = await this.getExams();
        const index = exams.findIndex(e => e.id === id);
        if (index !== -1) {
            exams[index] = { ...exams[index], ...updates };
            await this.saveExams(exams);
            return exams[index];
        }
        return null;
    },
    
    async deleteExam(id) {
        await this.ensureInit();
        if (this.useSupabase) return await SupabaseService.deleteExam(id);
        if (this.useLeanCloud) return await LeanCloudService.deleteExam(id);
        if (this.useFirebase) return await FirebaseService.deleteExam(id);
        const exams = await this.getExams();
        const filtered = exams.filter(e => e.id !== id);
        await this.saveExams(filtered);
        return filtered.length < exams.length;
    },
    
    async getExamRecords() {
        await this.ensureInit();
        if (this.useSupabase) return await SupabaseService.getExamRecords();
        if (this.useLeanCloud) return await LeanCloudService.getExamRecords();
        if (this.useFirebase) return await FirebaseService.getExamRecords();
        return DataStore.getExamRecords();
    },
    
    async saveExamRecords(records) {
        await this.ensureInit();
        if (this.useSupabase) {
            for (const record of records) {
                await SupabaseService.updateExamRecord(record);
            }
            return;
        }
        if (this.useLeanCloud) {
            for (const record of records) {
                await LeanCloudService.updateExamRecord(record);
            }
            return;
        }
        if (this.useFirebase) {
            for (const record of records) {
                await FirebaseService.updateExamRecord(record);
            }
            return;
        }
        DataStore.saveExamRecords(records);
    },
    
    async addExamRecord(record) {
        await this.ensureInit();
        if (this.useSupabase) return await SupabaseService.addExamRecord(record);
        if (this.useLeanCloud) return await LeanCloudService.addExamRecord(record);
        if (this.useFirebase) return await FirebaseService.addExamRecord(record);
        return DataStore.addExamRecord(record);
    },
    
    async getExamResults() {
        await this.ensureInit();
        if (this.useSupabase) return await SupabaseService.getExamRecords();
        if (this.useLeanCloud) return await LeanCloudService.getExamRecords();
        if (this.useFirebase) return await FirebaseService.getExamRecords();
        return DataStore.getExamRecords();
    },
    
    async addExamResult(result) {
        await this.ensureInit();
        if (this.useSupabase) return await SupabaseService.addExamRecord(result);
        if (this.useLeanCloud) return await LeanCloudService.addExamRecord(result);
        if (this.useFirebase) return await FirebaseService.addExamRecord(result);
        return DataStore.addExamRecord(result);
    },
    
    async getVotes() {
        await this.ensureInit();
        if (this.useSupabase) return await SupabaseService.getVotes();
        if (this.useLeanCloud) return await LeanCloudService.getVotes();
        if (this.useFirebase) return await FirebaseService.getVotes();
        return DataStore.getVotes();
    },
    
    async saveVotes(votes) {
        await this.ensureInit();
        if (!this.useSupabase && !this.useLeanCloud && !this.useFirebase) DataStore.saveVotes(votes);
    },
    
    async addVote(vote) {
        await this.ensureInit();
        if (this.useSupabase) return await SupabaseService.addVote(vote);
        if (this.useLeanCloud) return await LeanCloudService.addVote(vote);
        if (this.useFirebase) return await FirebaseService.addVote(vote);
        return DataStore.addVote(vote);
    },
    
    async updateVote(id, updates) {
        await this.ensureInit();
        if (this.useSupabase) return await SupabaseService.updateVote(id, updates);
        if (this.useLeanCloud) return await LeanCloudService.updateVote(id, updates);
        if (this.useFirebase) return await FirebaseService.updateVote(id, updates);
        const votes = await this.getVotes();
        const index = votes.findIndex(v => v.id === id);
        if (index !== -1) {
            votes[index] = { ...votes[index], ...updates };
            await this.saveVotes(votes);
            return votes[index];
        }
        return null;
    },
    
    async deleteVote(id) {
        await this.ensureInit();
        if (this.useSupabase) return await SupabaseService.deleteVote(id);
        if (this.useLeanCloud) return await LeanCloudService.deleteVote(id);
        if (this.useFirebase) return await FirebaseService.deleteVote(id);
        const votes = await this.getVotes();
        const filtered = votes.filter(v => v.id !== id);
        await this.saveVotes(filtered);
        return filtered.length < votes.length;
    },
    
    async getVoteRecords() {
        await this.ensureInit();
        if (this.useSupabase) return await SupabaseService.getVoteRecords();
        if (this.useLeanCloud) return await LeanCloudService.getVoteRecords();
        if (this.useFirebase) return await FirebaseService.getVoteRecords();
        return DataStore.getVoteRecords();
    },
    
    async saveVoteRecords(records) {
        await this.ensureInit();
        if (!this.useSupabase && !this.useLeanCloud && !this.useFirebase) DataStore.saveVoteRecords(records);
    },
    
    async addVoteRecord(record) {
        await this.ensureInit();
        if (this.useSupabase) return await SupabaseService.addVoteRecord(record);
        if (this.useLeanCloud) return await LeanCloudService.addVoteRecord(record);
        if (this.useFirebase) return await FirebaseService.addVoteRecord(record);
        return DataStore.addVoteRecord(record);
    },
    
    async getLotteries() {
        await this.ensureInit();
        if (this.useSupabase) return await SupabaseService.getLotteries();
        if (this.useLeanCloud) return await LeanCloudService.getLotteries();
        if (this.useFirebase) return await FirebaseService.getLotteries();
        return DataStore.getLotteries();
    },
    
    async saveLotteries(lotteries) {
        await this.ensureInit();
        if (!this.useSupabase && !this.useLeanCloud && !this.useFirebase) DataStore.saveLotteries(lotteries);
    },
    
    async addLottery(lottery) {
        await this.ensureInit();
        if (this.useSupabase) return await SupabaseService.addLottery(lottery);
        if (this.useLeanCloud) return await LeanCloudService.addLottery(lottery);
        if (this.useFirebase) return await FirebaseService.addLottery(lottery);
        return DataStore.addLottery(lottery);
    },
    
    async updateLottery(id, updates) {
        await this.ensureInit();
        if (this.useSupabase) return await SupabaseService.updateLottery(id, updates);
        if (this.useLeanCloud) return await LeanCloudService.updateLottery(id, updates);
        if (this.useFirebase) return await FirebaseService.updateLottery(id, updates);
        const lotteries = await this.getLotteries();
        const index = lotteries.findIndex(l => l.id === id);
        if (index !== -1) {
            lotteries[index] = { ...lotteries[index], ...updates };
            await this.saveLotteries(lotteries);
            return lotteries[index];
        }
        return null;
    },
    
    async deleteLottery(id) {
        await this.ensureInit();
        if (this.useSupabase) return await SupabaseService.deleteLottery(id);
        if (this.useLeanCloud) return await LeanCloudService.deleteLottery(id);
        if (this.useFirebase) return await FirebaseService.deleteLottery(id);
        const lotteries = await this.getLotteries();
        const filtered = lotteries.filter(l => l.id !== id);
        await this.saveLotteries(filtered);
        return filtered.length < lotteries.length;
    },
    
    async getLotteryRecords() {
        await this.ensureInit();
        if (this.useSupabase) return await SupabaseService.getLotteryRecords();
        if (this.useLeanCloud) return await LeanCloudService.getLotteryRecords();
        if (this.useFirebase) return await FirebaseService.getLotteryRecords();
        return DataStore.getLotteryRecords();
    },
    
    async saveLotteryRecords(records) {
        await this.ensureInit();
        if (!this.useSupabase && !this.useLeanCloud && !this.useFirebase) DataStore.saveLotteryRecords(records);
    },
    
    async addLotteryRecord(record) {
        await this.ensureInit();
        if (this.useSupabase) return await SupabaseService.addLotteryRecord(record);
        if (this.useLeanCloud) return await LeanCloudService.addLotteryRecord(record);
        if (this.useFirebase) return await FirebaseService.addLotteryRecord(record);
        return DataStore.addLotteryRecord(record);
    },
    
    async getPasswordResetRequests() {
        await this.ensureInit();
        if (this.useSupabase) return await SupabaseService.getPasswordResetRequests();
        if (this.useLeanCloud) return await LeanCloudService.getPasswordResetRequests();
        if (this.useFirebase) return await FirebaseService.getPasswordResetRequests();
        return DataStore.getPasswordResetRequests();
    },
    
    async savePasswordResetRequests(requests) {
        await this.ensureInit();
        if (!this.useSupabase && !this.useLeanCloud && !this.useFirebase) DataStore.savePasswordResetRequests(requests);
    },
    
    async addPasswordResetRequest(request) {
        await this.ensureInit();
        if (this.useSupabase) return await SupabaseService.addPasswordResetRequest(request);
        if (this.useLeanCloud) return await LeanCloudService.addPasswordResetRequest(request);
        if (this.useFirebase) return await FirebaseService.addPasswordResetRequest(request);
        return DataStore.addPasswordResetRequest(request);
    },
    
    async processPasswordResetRequest(id, processed) {
        await this.ensureInit();
        if (this.useSupabase) return await SupabaseService.processPasswordResetRequest(id, processed);
        if (this.useLeanCloud) return await LeanCloudService.processPasswordResetRequest(id, processed);
        if (this.useFirebase) return await FirebaseService.processPasswordResetRequest(id, processed);
        return DataStore.processPasswordResetRequest(id, processed);
    },
    
    async getNotifications() {
        await this.ensureInit();
        if (this.useSupabase) return await SupabaseService.getNotifications();
        if (this.useLeanCloud) return await LeanCloudService.getNotifications();
        if (this.useFirebase) return await FirebaseService.getNotifications();
        return DataStore.getNotifications();
    },
    
    async saveNotifications(notifications) {
        await this.ensureInit();
        if (!this.useSupabase && !this.useLeanCloud && !this.useFirebase) DataStore.saveNotifications(notifications);
    },
    
    async addNotification(notification) {
        await this.ensureInit();
        if (this.useSupabase) return await SupabaseService.addNotification(notification);
        if (this.useLeanCloud) return await LeanCloudService.addNotification(notification);
        if (this.useFirebase) return await FirebaseService.addNotification(notification);
        return DataStore.addNotification(notification);
    },
    
    async markNotificationRead(id) {
        await this.ensureInit();
        if (this.useSupabase) return await SupabaseService.markNotificationRead(id);
        if (this.useLeanCloud) return await LeanCloudService.markNotificationRead(id);
        if (this.useFirebase) return await FirebaseService.markNotificationRead(id);
        return DataStore.markNotificationRead(id);
    },
    
    async getCurrentUser() {
        await this.ensureInit();
        if (this.useSupabase) return SupabaseService.getCurrentUser();
        if (this.useLeanCloud) return LeanCloudService.getCurrentUser();
        if (this.useFirebase) return await FirebaseService.getCurrentUser();
        return DataStore.getCurrentUser();
    },
    
    async setCurrentUser(user) {
        localStorage.setItem('currentUser', JSON.stringify(user));
    },
    
    async clearCurrentUser() {
        if (this.useSupabase) await SupabaseService.signOut();
        else if (this.useLeanCloud) await LeanCloudService.signOut();
        else if (this.useFirebase) await FirebaseService.signOut();
        else localStorage.removeItem('currentUser');
    },
    
    logout() {
        localStorage.removeItem('currentUser');
    },
    
    async isLoggedIn() {
        const user = await this.getCurrentUser();
        return user !== null;
    },
    
    async isAdmin() {
        const user = await this.getCurrentUser();
        return user && (user.role === 'admin' || user.role === 'subAdmin');
    },
    
    async isSuperAdmin() {
        const user = await this.getCurrentUser();
        return user && user.role === 'admin';
    },
    
    async signIn(username, password) {
        await this.ensureInit();
        if (this.useSupabase) return await SupabaseService.signIn(username, password);
        if (this.useLeanCloud) return await LeanCloudService.signIn(username, password);
        if (this.useFirebase) return await FirebaseService.signIn(username, password);
        
        const user = await this.getUserByUsername(username);
        if (!user) return { success: false, message: '用户不存在' };
        if (user.password !== password) return { success: false, message: '密码错误' };
        
        await this.setCurrentUser(user);
        return { success: true, user };
    },
    
    async signOut() {
        await this.ensureInit();
        if (this.useSupabase) return await SupabaseService.signOut();
        if (this.useLeanCloud) return await LeanCloudService.signOut();
        if (this.useFirebase) return await FirebaseService.signOut();
        this.clearCurrentUser();
        return { success: true };
    },
    
    async getSettings() {
        await this.ensureInit();
        if (this.useSupabase) return await SupabaseService.getSettings();
        if (this.useLeanCloud) return await LeanCloudService.getSettings();
        if (this.useFirebase) return await FirebaseService.getSettings();
        const saved = localStorage.getItem('settings');
        return saved ? JSON.parse(saved) : {};
    },
    
    async saveSettings(settings) {
        await this.ensureInit();
        if (this.useSupabase) return await SupabaseService.saveSettings(settings);
        if (this.useLeanCloud) return await LeanCloudService.saveSettings(settings);
        if (this.useFirebase) return await FirebaseService.saveSettings(settings);
        localStorage.setItem('settings', JSON.stringify(settings));
        return settings;
    },
    
    generateId() {
        return Date.now().toString(36) + Math.random().toString(36).substr(2);
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
    
    async getPermissionSettings() {
        await this.ensureInit();
        if (this.useSupabase) return await SupabaseService.getPermissionSettings();
        if (this.useLeanCloud) return await LeanCloudService.getPermissionSettings();
        if (this.useFirebase) return await FirebaseService.getPermissionSettings();
        return DataStore.getPermissionSettings();
    },
    
    async savePermissionSettings(settings) {
        await this.ensureInit();
        if (this.useSupabase) return await SupabaseService.savePermissionSettings(settings);
        if (this.useLeanCloud) return await LeanCloudService.savePermissionSettings(settings);
        if (this.useFirebase) return await FirebaseService.savePermissionSettings(settings);
        return DataStore.savePermissionSettings(settings);
    },
    
    async canView(module, permission) {
        await this.ensureInit();
        if (this.useSupabase) return await SupabaseService.canView(module, permission);
        if (this.useLeanCloud) return await LeanCloudService.canView(module, permission);
        if (this.useFirebase) return await FirebaseService.canView(module, permission);
        return DataStore.canView(module, permission);
    },
    
    async resetDatabase() {
        if (this.useSupabase || this.useLeanCloud || this.useFirebase) {
            console.warn('Reset database is not supported in cloud mode');
            return;
        }
        localStorage.clear();
        DataStore.init();
    },
    
    isUsingCloud() {
        return this.useSupabase || this.useLeanCloud || this.useFirebase;
    },
    
    getStorageType() {
        if (this.useSupabase) return 'Supabase';
        if (this.useLeanCloud) return 'LeanCloud';
        if (this.useFirebase) return 'Firebase';
        return 'LocalStorage';
    },
    
    // 问卷相关方法
    async getQuestionnaires() {
        await this.ensureInit();
        if (this.useSupabase) return await SupabaseService.getQuestionnaires();
        if (this.useLeanCloud) return await LeanCloudService.getQuestionnaires();
        if (this.useFirebase) return await FirebaseService.getQuestionnaires();
        return DataStore.getQuestionnaires();
    },
    
    async getQuestionnaireById(id) {
        await this.ensureInit();
        if (this.useSupabase) return await SupabaseService.getQuestionnaireById(id);
        if (this.useLeanCloud) return await LeanCloudService.getQuestionnaireById(id);
        if (this.useFirebase) return await FirebaseService.getQuestionnaireById(id);
        return DataStore.getQuestionnaireById(id);
    },
    
    async addQuestionnaire(questionnaire) {
        await this.ensureInit();
        if (this.useSupabase) return await SupabaseService.addQuestionnaire(questionnaire);
        if (this.useLeanCloud) return await LeanCloudService.addQuestionnaire(questionnaire);
        if (this.useFirebase) return await FirebaseService.addQuestionnaire(questionnaire);
        return DataStore.addQuestionnaire(questionnaire);
    },
    
    async updateQuestionnaire(id, updates) {
        await this.ensureInit();
        if (this.useSupabase) return await SupabaseService.updateQuestionnaire(id, updates);
        if (this.useLeanCloud) return await LeanCloudService.updateQuestionnaire(id, updates);
        if (this.useFirebase) return await FirebaseService.updateQuestionnaire(id, updates);
        return DataStore.updateQuestionnaire(id, updates);
    },
    
    async deleteQuestionnaire(id) {
        await this.ensureInit();
        if (this.useSupabase) return await SupabaseService.deleteQuestionnaire(id);
        if (this.useLeanCloud) return await LeanCloudService.deleteQuestionnaire(id);
        if (this.useFirebase) return await FirebaseService.deleteQuestionnaire(id);
        return DataStore.deleteQuestionnaire(id);
    },
    
    async getQuestionnaireRecords() {
        await this.ensureInit();
        if (this.useSupabase) return await SupabaseService.getQuestionnaireRecords();
        if (this.useLeanCloud) return await LeanCloudService.getQuestionnaireRecords();
        if (this.useFirebase) return await FirebaseService.getQuestionnaireRecords();
        return DataStore.getQuestionnaireRecords();
    },
    
    async addQuestionnaireRecord(record) {
        await this.ensureInit();
        if (this.useSupabase) return await SupabaseService.addQuestionnaireRecord(record);
        if (this.useLeanCloud) return await LeanCloudService.addQuestionnaireRecord(record);
        if (this.useFirebase) return await FirebaseService.addQuestionnaireRecord(record);
        return DataStore.addQuestionnaireRecord(record);
    }
};

window.DataService = DataService;
