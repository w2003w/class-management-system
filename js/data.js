const DataStore = {
    init: function() {
        if (!localStorage.getItem('db_initialized')) {
            this.initializeData();
            localStorage.setItem('db_initialized', 'true');
        } else {
            this.ensureDataIntegrity();
        }
    },
    
    ensureDataIntegrity: function() {
        const users = this.getUsers();
        if (!users || users.length === 0) {
            this.initializeUsers();
        }
    },
    
    initializeUsers: function() {
        const defaultUsers = [
            { 
                id: 1, 
                username: 'wutao2007526', 
                password: 'Wutao@2007526', 
                name: '吴涛', 
                role: 'admin',
                avatar: '',
                createdAt: new Date().toISOString()
            }
        ];
        localStorage.setItem('users', JSON.stringify(defaultUsers));
    },
    
    initializeData: function() {
        this.initializeUsers();
        
        localStorage.setItem('attendances', JSON.stringify([]));
        localStorage.setItem('attendanceRecords', JSON.stringify([]));
        
        localStorage.setItem('questions', JSON.stringify([]));
        localStorage.setItem('exams', JSON.stringify([]));
        localStorage.setItem('examRecords', JSON.stringify([]));
        
        localStorage.setItem('votes', JSON.stringify([]));
        localStorage.setItem('voteRecords', JSON.stringify([]));
        localStorage.setItem('lotteries', JSON.stringify([]));
        localStorage.setItem('lotteryRecords', JSON.stringify([]));
        
        localStorage.setItem('passwordResetRequests', JSON.stringify([]));
        
        localStorage.setItem('notifications', JSON.stringify([]));
        
        localStorage.setItem('groups', JSON.stringify([]));
    },
    
    getUsers: function() {
        return JSON.parse(localStorage.getItem('users') || '[]');
    },
    
    saveUsers: function(users) {
        localStorage.setItem('users', JSON.stringify(users));
    },
    
    getUserByUsername: function(username) {
        const users = this.getUsers();
        return users.find(u => u.username === username);
    },
    
    getUserById: function(id) {
        const users = this.getUsers();
        return users.find(u => String(u.id) === String(id));
    },
    
    addUser: function(user) {
        const users = this.getUsers();
        const maxId = users.length > 0 ? Math.max(...users.map(u => u.id)) : 0;
        user.id = maxId + 1;
        user.createdAt = new Date().toISOString();
        users.push(user);
        this.saveUsers(users);
        return user;
    },
    
    updateUser: function(id, updates) {
        const users = this.getUsers();
        const index = users.findIndex(u => String(u.id) === String(id));
        if (index !== -1) {
            users[index] = { ...users[index], ...updates };
            this.saveUsers(users);
            return users[index];
        }
        return null;
    },
    
    deleteUser: function(id) {
        const users = this.getUsers();
        const filtered = users.filter(u => String(u.id) !== String(id));
        this.saveUsers(filtered);
        return filtered.length < users.length;
    },
    
    getGroups: function() {
        return JSON.parse(localStorage.getItem('groups') || '[]');
    },
    
    saveGroups: function(groups) {
        localStorage.setItem('groups', JSON.stringify(groups));
    },
    
    addGroup: function(group) {
        const groups = this.getGroups();
        const maxId = groups.length > 0 ? Math.max(...groups.map(g => g.id)) : 0;
        group.id = maxId + 1;
        group.createdAt = new Date().toISOString();
        groups.push(group);
        this.saveGroups(groups);
        return group;
    },
    
    updateGroup: function(id, updates) {
        const groups = this.getGroups();
        const index = groups.findIndex(g => g.id === id);
        if (index !== -1) {
            groups[index] = { ...groups[index], ...updates };
            this.saveGroups(groups);
            return groups[index];
        }
        return null;
    },
    
    deleteGroup: function(id) {
        const groups = this.getGroups();
        const filtered = groups.filter(g => g.id !== id);
        this.saveGroups(filtered);
        return filtered.length < groups.length;
    },
    
    getGroupById: function(id) {
        const groups = this.getGroups();
        return groups.find(g => g.id === id);
    },
    
    getAttendances: function() {
        return JSON.parse(localStorage.getItem('attendances') || '[]');
    },
    
    saveAttendances: function(attendances) {
        localStorage.setItem('attendances', JSON.stringify(attendances));
    },
    
    addAttendance: function(attendance) {
        const attendances = this.getAttendances();
        const maxId = attendances.length > 0 ? Math.max(...attendances.map(a => a.id)) : 0;
        attendance.id = maxId + 1;
        attendance.createdAt = new Date().toISOString();
        attendances.push(attendance);
        this.saveAttendances(attendances);
        return attendance;
    },
    
    getAttendanceRecords: function() {
        return JSON.parse(localStorage.getItem('attendanceRecords') || '[]');
    },
    
    saveAttendanceRecords: function(records) {
        localStorage.setItem('attendanceRecords', JSON.stringify(records));
    },
    
    addAttendanceRecord: function(record) {
        const records = this.getAttendanceRecords();
        const maxId = records.length > 0 ? Math.max(...records.map(r => r.id)) : 0;
        record.id = maxId + 1;
        record.createdAt = new Date().toISOString();
        records.push(record);
        this.saveAttendanceRecords(records);
        return record;
    },
    
    getQuestions: function() {
        return JSON.parse(localStorage.getItem('questions') || '[]');
    },
    
    saveQuestions: function(questions) {
        localStorage.setItem('questions', JSON.stringify(questions));
    },
    
    addQuestion: function(question) {
        const questions = this.getQuestions();
        const maxId = questions.length > 0 ? Math.max(...questions.map(q => q.id)) : 0;
        question.id = maxId + 1;
        question.createdAt = new Date().toISOString();
        questions.push(question);
        this.saveQuestions(questions);
        return question;
    },
    
    deleteQuestion: function(id) {
        let questions = this.getQuestions();
        questions = questions.filter(q => q.id !== id);
        this.saveQuestions(questions);
        return true;
    },
    
    getExams: function() {
        return JSON.parse(localStorage.getItem('exams') || '[]');
    },
    
    saveExams: function(exams) {
        localStorage.setItem('exams', JSON.stringify(exams));
    },
    
    addExam: function(exam) {
        const exams = this.getExams();
        const maxId = exams.length > 0 ? Math.max(...exams.map(e => e.id)) : 0;
        exam.id = maxId + 1;
        exam.createdAt = new Date().toISOString();
        exams.push(exam);
        this.saveExams(exams);
        return exam;
    },
    
    getExamRecords: function() {
        return JSON.parse(localStorage.getItem('examRecords') || '[]');
    },
    
    saveExamRecords: function(records) {
        localStorage.setItem('examRecords', JSON.stringify(records));
    },
    
    addExamRecord: function(record) {
        const records = this.getExamRecords();
        const maxId = records.length > 0 ? Math.max(...records.map(r => r.id)) : 0;
        record.id = maxId + 1;
        record.submittedAt = new Date().toISOString();
        records.push(record);
        this.saveExamRecords(records);
        return record;
    },
    
    getVotes: function() {
        return JSON.parse(localStorage.getItem('votes') || '[]');
    },
    
    saveVotes: function(votes) {
        localStorage.setItem('votes', JSON.stringify(votes));
    },
    
    addVote: function(vote) {
        const votes = this.getVotes();
        const maxId = votes.length > 0 ? Math.max(...votes.map(v => v.id)) : 0;
        vote.id = maxId + 1;
        vote.createdAt = new Date().toISOString();
        votes.push(vote);
        this.saveVotes(votes);
        return vote;
    },
    
    getVoteRecords: function() {
        return JSON.parse(localStorage.getItem('voteRecords') || '[]');
    },
    
    saveVoteRecords: function(records) {
        localStorage.setItem('voteRecords', JSON.stringify(records));
    },
    
    addVoteRecord: function(record) {
        const records = this.getVoteRecords();
        const maxId = records.length > 0 ? Math.max(...records.map(r => r.id)) : 0;
        record.id = maxId + 1;
        record.votedAt = new Date().toISOString();
        records.push(record);
        this.saveVoteRecords(records);
        return record;
    },
    
    getLotteries: function() {
        return JSON.parse(localStorage.getItem('lotteries') || '[]');
    },
    
    saveLotteries: function(lotteries) {
        localStorage.setItem('lotteries', JSON.stringify(lotteries));
    },
    
    addLottery: function(lottery) {
        const lotteries = this.getLotteries();
        const maxId = lotteries.length > 0 ? Math.max(...lotteries.map(l => l.id)) : 0;
        lottery.id = maxId + 1;
        lottery.createdAt = new Date().toISOString();
        lotteries.push(lottery);
        this.saveLotteries(lotteries);
        return lottery;
    },
    
    getLotteryRecords: function() {
        return JSON.parse(localStorage.getItem('lotteryRecords') || '[]');
    },
    
    saveLotteryRecords: function(records) {
        localStorage.setItem('lotteryRecords', JSON.stringify(records));
    },
    
    addLotteryRecord: function(record) {
        const records = this.getLotteryRecords();
        const maxId = records.length > 0 ? Math.max(...records.map(r => r.id)) : 0;
        record.id = maxId + 1;
        record.drawnAt = new Date().toISOString();
        records.push(record);
        this.saveLotteryRecords(records);
        return record;
    },
    
    getPasswordResetRequests: function() {
        return JSON.parse(localStorage.getItem('passwordResetRequests') || '[]');
    },
    
    savePasswordResetRequests: function(requests) {
        localStorage.setItem('passwordResetRequests', JSON.stringify(requests));
    },
    
    addPasswordResetRequest: function(request) {
        const requests = this.getPasswordResetRequests();
        const maxId = requests.length > 0 ? Math.max(...requests.map(r => r.id)) : 0;
        request.id = maxId + 1;
        request.createdAt = new Date().toISOString();
        request.status = 'pending';
        requests.push(request);
        this.savePasswordResetRequests(requests);
        return request;
    },
    
    processPasswordResetRequest: function(id, processed) {
        const requests = this.getPasswordResetRequests();
        const index = requests.findIndex(r => r.id === id);
        if (index !== -1) {
            requests[index].status = processed ? 'processed' : 'rejected';
            requests[index].processedAt = new Date().toISOString();
            this.savePasswordResetRequests(requests);
            
            if (processed) {
                const request = requests[index];
                const user = this.getUserByUsername(request.username);
                if (user) {
                    this.updateUser(user.id, { password: '123456' });
                }
            }
            return requests[index];
        }
        return null;
    },
    
    getNotifications: function() {
        return JSON.parse(localStorage.getItem('notifications') || '[]');
    },
    
    saveNotifications: function(notifications) {
        localStorage.setItem('notifications', JSON.stringify(notifications));
    },
    
    addNotification: function(notification) {
        const notifications = this.getNotifications();
        const maxId = notifications.length > 0 ? Math.max(...notifications.map(n => n.id)) : 0;
        notification.id = maxId + 1;
        notification.createdAt = new Date().toISOString();
        notification.read = false;
        notifications.unshift(notification);
        this.saveNotifications(notifications);
        return notification;
    },
    
    markNotificationRead: function(id) {
        const notifications = this.getNotifications();
        const index = notifications.findIndex(n => n.id === id);
        if (index !== -1) {
            notifications[index].read = true;
            this.saveNotifications(notifications);
        }
    },
    
    getCurrentUser: function() {
        const userJson = localStorage.getItem('currentUser');
        return userJson ? JSON.parse(userJson) : null;
    },
    
    setCurrentUser: function(user) {
        localStorage.setItem('currentUser', JSON.stringify(user));
    },
    
    clearCurrentUser: function() {
        localStorage.removeItem('currentUser');
    },
    
    isLoggedIn: function() {
        return this.getCurrentUser() !== null;
    },
    
    isAdmin: function() {
        const user = this.getCurrentUser();
        return user && (user.role === 'admin' || user.role === 'subAdmin');
    },
    
    isSuperAdmin: function() {
        const user = this.getCurrentUser();
        return user && user.role === 'admin';
    },
    
    generateId: function() {
        return Date.now().toString(36) + Math.random().toString(36).substr(2);
    },
    
    exportToCSV: function(data, filename) {
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
    },
    
    getPermissionSettings: function() {
        const defaultSettings = {
            attendance: {
                showMemberList: true,
                showSignedCount: true,
                showUnsignedList: false
            },
            exam: {
                showMemberList: true,
                showScores: false,
                showAnswers: false,
                showRanking: false
            },
            vote: {
                showMemberList: true,
                showVoteCount: true,
                showVoteDetails: false
            },
            lottery: {
                showMemberList: true,
                showPrizeList: true,
                showWinnerList: false
            }
        };
        
        const saved = localStorage.getItem('permissionSettings');
        return saved ? JSON.parse(saved) : defaultSettings;
    },
    
    savePermissionSettings: function(settings) {
        localStorage.setItem('permissionSettings', JSON.stringify(settings));
    },
    
    canView: function(module, permission) {
        const user = this.getCurrentUser();
        if (!user) return false;
        
        if (user.role === 'admin' || user.role === 'subAdmin') {
            return true;
        }
        
        const settings = this.getPermissionSettings();
        if (settings[module] && settings[module][permission] !== undefined) {
            return settings[module][permission];
        }
        
        return false;
    },
    
    // 问卷相关方法
    getQuestionnaires: function() {
        const data = localStorage.getItem('questionnaires');
        return data ? JSON.parse(data) : [];
    },
    
    saveQuestionnaires: function(questionnaires) {
        localStorage.setItem('questionnaires', JSON.stringify(questionnaires));
    },
    
    getQuestionnaireById: function(id) {
        const questionnaires = this.getQuestionnaires();
        return questionnaires.find(q => q.id === id);
    },
    
    addQuestionnaire: function(questionnaire) {
        const questionnaires = this.getQuestionnaires();
        const maxId = questionnaires.length > 0 ? Math.max(...questionnaires.map(q => parseInt(q.id) || 0)) : 0;
        questionnaire.id = maxId + 1;
        questionnaire.createdat = new Date().toISOString();
        questionnaires.push(questionnaire);
        this.saveQuestionnaires(questionnaires);
        return questionnaire;
    },
    
    updateQuestionnaire: function(id, updates) {
        const questionnaires = this.getQuestionnaires();
        const index = questionnaires.findIndex(q => q.id === id);
        if (index !== -1) {
            questionnaires[index] = { ...questionnaires[index], ...updates };
            this.saveQuestionnaires(questionnaires);
            return questionnaires[index];
        }
        return null;
    },
    
    deleteQuestionnaire: function(id) {
        const questionnaires = this.getQuestionnaires();
        const index = questionnaires.findIndex(q => q.id === id);
        if (index !== -1) {
            questionnaires.splice(index, 1);
            this.saveQuestionnaires(questionnaires);
            return true;
        }
        return false;
    },
    
    getQuestionnaireRecords: function() {
        const data = localStorage.getItem('questionnaire_records');
        return data ? JSON.parse(data) : [];
    },
    
    saveQuestionnaireRecords: function(records) {
        localStorage.setItem('questionnaire_records', JSON.stringify(records));
    },
    
    addQuestionnaireRecord: function(record) {
        const records = this.getQuestionnaireRecords();
        const maxId = records.length > 0 ? Math.max(...records.map(r => parseInt(r.id) || 0)) : 0;
        record.id = maxId + 1;
        record.submittedAt = new Date().toISOString();
        record.createdat = new Date().toISOString();
        records.push(record);
        this.saveQuestionnaireRecords(records);
        return record;
    },
    
    resetDatabase: function() {
        localStorage.clear();
        this.init();
    },
    
    getSubjects: function() {
        const data = localStorage.getItem('subjects');
        if (!data) return this.getDefaultSubjects();
        try {
            return JSON.parse(data);
        } catch {
            return this.getDefaultSubjects();
        }
    },
    
    getDefaultSubjects: function() {
        return [
            { id: '1', name: '语文', color: '#EF4444' },
            { id: '2', name: '数学', color: '#3B82F6' },
            { id: '3', name: '英语', color: '#22C55E' },
            { id: '4', name: '物理', color: '#F59E0B' },
            { id: '5', name: '化学', color: '#8B5CF6' },
            { id: '6', name: '生物', color: '#EC4899' },
            { id: '7', name: '历史', color: '#6B7280' },
            { id: '8', name: '地理', color: '#14B8A6' },
            { id: '9', name: '政治', color: '#F97316' }
        ];
    },
    
    saveSubjects: function(subjects) {
        localStorage.setItem('subjects', JSON.stringify(subjects));
    },
    
    addSubject: function(subject) {
        const subjects = this.getSubjects();
        const maxId = Math.max(...subjects.map(s => parseInt(s.id)), 0);
        subject.id = String(maxId + 1);
        subjects.push(subject);
        this.saveSubjects(subjects);
        return subject;
    },
    
    updateSubject: function(id, updates) {
        const subjects = this.getSubjects();
        const index = subjects.findIndex(s => s.id === id);
        if (index !== -1) {
            subjects[index] = { ...subjects[index], ...updates };
            this.saveSubjects(subjects);
            return subjects[index];
        }
        return null;
    },
    
    deleteSubject: function(id) {
        const subjects = this.getSubjects();
        const filtered = subjects.filter(s => s.id !== id);
        this.saveSubjects(filtered);
        return filtered.length < subjects.length;
    },
    
    getQuestionTypes: function() {
        const data = localStorage.getItem('questionTypes');
        if (!data) return this.getDefaultQuestionTypes();
        try {
            return JSON.parse(data);
        } catch {
            return this.getDefaultQuestionTypes();
        }
    },
    
    getDefaultQuestionTypes: function() {
        return [
            { id: '1', name: '选择题' },
            { id: '2', name: '填空题' },
            { id: '3', name: '判断题' },
            { id: '4', name: '简答题' },
            { id: '5', name: '计算题' },
            { id: '6', name: '证明题' },
            { id: '7', name: '作文' },
            { id: '8', name: '阅读理解' }
        ];
    },
    
    saveQuestionTypes: function(types) {
        localStorage.setItem('questionTypes', JSON.stringify(types));
    },
    
    addQuestionType: function(type) {
        const types = this.getQuestionTypes();
        const maxId = Math.max(...types.map(t => parseInt(t.id)), 0);
        type.id = String(maxId + 1);
        types.push(type);
        this.saveQuestionTypes(types);
        return type;
    },
    
    updateQuestionType: function(id, updates) {
        const types = this.getQuestionTypes();
        const index = types.findIndex(t => t.id === id);
        if (index !== -1) {
            types[index] = { ...types[index], ...updates };
            this.saveQuestionTypes(types);
            return types[index];
        }
        return null;
    },
    
    deleteQuestionType: function(id) {
        const types = this.getQuestionTypes();
        const filtered = types.filter(t => t.id !== id);
        this.saveQuestionTypes(filtered);
        return filtered.length < types.length;
    },
    
    getKnowledgePoints: function() {
        const data = localStorage.getItem('knowledgePoints');
        if (!data) return this.getDefaultKnowledgePoints();
        try {
            return JSON.parse(data);
        } catch {
            return this.getDefaultKnowledgePoints();
        }
    },
    
    getDefaultKnowledgePoints: function() {
        return [
            { id: '1', name: '函数', subjectId: '2' },
            { id: '2', name: '三角函数', subjectId: '2' },
            { id: '3', name: '概率统计', subjectId: '2' },
            { id: '4', name: '力学', subjectId: '4' },
            { id: '5', name: '电学', subjectId: '4' },
            { id: '6', name: '有机化学', subjectId: '5' },
            { id: '7', name: '无机化学', subjectId: '5' },
            { id: '8', name: '细胞生物学', subjectId: '6' },
            { id: '9', name: '遗传变异', subjectId: '6' },
            { id: '10', name: '阅读理解', subjectId: '1' },
            { id: '11', name: '文言文', subjectId: '1' },
            { id: '12', name: '词汇语法', subjectId: '3' },
            { id: '13', name: '时态语态', subjectId: '3' },
            { id: '14', name: '中国历史', subjectId: '7' },
            { id: '15', name: '世界历史', subjectId: '7' }
        ];
    },
    
    saveKnowledgePoints: function(kps) {
        localStorage.setItem('knowledgePoints', JSON.stringify(kps));
    },
    
    addKnowledgePoint: function(kp) {
        const kps = this.getKnowledgePoints();
        const maxId = Math.max(...kps.map(k => parseInt(k.id)), 0);
        kp.id = String(maxId + 1);
        kps.push(kp);
        this.saveKnowledgePoints(kps);
        return kp;
    },
    
    updateKnowledgePoint: function(id, updates) {
        const kps = this.getKnowledgePoints();
        const index = kps.findIndex(k => k.id === id);
        if (index !== -1) {
            kps[index] = { ...kps[index], ...updates };
            this.saveKnowledgePoints(kps);
            return kps[index];
        }
        return null;
    },
    
    deleteKnowledgePoint: function(id) {
        const kps = this.getKnowledgePoints();
        const filtered = kps.filter(k => k.id !== id);
        this.saveKnowledgePoints(filtered);
        return filtered.length < kps.length;
    },
    
    getWrongQuestions: function() {
        const data = localStorage.getItem('wrongQuestions');
        if (!data) return [];
        try {
            return JSON.parse(data);
        } catch {
            return [];
        }
    },
    
    saveWrongQuestions: function(questions) {
        localStorage.setItem('wrongQuestions', JSON.stringify(questions));
    },
    
    addWrongQuestion: function(question) {
        const questions = this.getWrongQuestions();
        const maxId = Math.max(...questions.map(q => parseInt(q.id || 0)), 0);
        question.id = String(maxId + 1);
        questions.push(question);
        this.saveWrongQuestions(questions);
        return question;
    },
    
    updateWrongQuestion: function(id, updates) {
        const questions = this.getWrongQuestions();
        const index = questions.findIndex(q => q.id === id);
        if (index !== -1) {
            questions[index] = { ...questions[index], ...updates };
            this.saveWrongQuestions(questions);
            return questions[index];
        }
        return null;
    },
    
    deleteWrongQuestion: function(id) {
        const questions = this.getWrongQuestions();
        const filtered = questions.filter(q => q.id !== id);
        this.saveWrongQuestions(filtered);
        return filtered.length < questions.length;
    }
};

DataStore.init();
