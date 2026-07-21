console.log('data-service v5 loaded at', new Date().toISOString());

const DataService = {
    useFirebase: false,
    useLeanCloud: false,
    useSupabase: false,
    initialized: false,

    getCurrentUserFromStorage() {
        if (this.useSupabase) return SupabaseService.getCurrentUserFromStorage();
        if (this.useLeanCloud) return LeanCloudService.getCurrentUserFromStorage();
        if (this.useFirebase) return FirebaseService.getCurrentUserFromStorage();
        return null;
    },

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
        }
        
        DataStore.init();
        
        this.initialized = true;
    },
    
    async ensureInit() {
        if (!this.initialized) {
            await this.init();
        }
    },
    
    async getUsers() {
        await this.ensureInit();
        try {
            if (this.useSupabase) return await SupabaseService.getUsers();
            if (this.useLeanCloud) return await LeanCloudService.getUsers();
            if (this.useFirebase) return await FirebaseService.getUsers();
        } catch (error) {
            console.warn('Cloud storage getUsers failed, falling back to LocalStorage:', error);
        }
        return DataStore.getUsers();
    },
    
    async saveUsers(users) {
        await this.ensureInit();
        try {
            if (this.useSupabase) {
                for (const user of users) {
                    try {
                        const existing = await SupabaseService.getUserById(user.id);
                        if (existing) await SupabaseService.updateUser(user.id, user);
                        else await SupabaseService.addUser(user);
                    } catch (userError) {
                        console.warn(`Cloud storage save user ${user.id} failed, falling back to LocalStorage:`, userError);
                        throw userError;
                    }
                }
                return;
            }
            if (this.useLeanCloud) {
                for (const user of users) {
                    try {
                        const existing = await LeanCloudService.getUserById(user.id);
                        if (existing) await LeanCloudService.updateUser(user.id, user);
                        else await LeanCloudService.addUser(user);
                    } catch (userError) {
                        console.warn(`Cloud storage save user ${user.id} failed, falling back to LocalStorage:`, userError);
                        throw userError;
                    }
                }
                return;
            }
            if (this.useFirebase) {
                for (const user of users) {
                    try {
                        const existing = await FirebaseService.getUserById(user.id);
                        if (existing) await FirebaseService.updateUser(user.id, user);
                        else await FirebaseService.addUser(user);
                    } catch (userError) {
                        console.warn(`Cloud storage save user ${user.id} failed, falling back to LocalStorage:`, userError);
                        throw userError;
                    }
                }
                return;
            }
        } catch (error) {
            console.warn('Cloud storage saveUsers failed, falling back to LocalStorage:', error);
        }
        DataStore.saveUsers(users);
    },
    
    async getUserByUsername(username) {
        await this.ensureInit();
        try {
            if (this.useSupabase) return await SupabaseService.getUserByUsername(username);
            if (this.useLeanCloud) return await LeanCloudService.getUserByUsername(username);
            if (this.useFirebase) return await FirebaseService.getUserByUsername(username);
        } catch (error) {
            console.warn('Cloud storage getUserByUsername failed, falling back to LocalStorage:', error);
        }
        return DataStore.getUserByUsername(username);
    },
    
    async getUserById(id) {
        await this.ensureInit();
        try {
            if (this.useSupabase) return await SupabaseService.getUserById(id);
            if (this.useLeanCloud) return await LeanCloudService.getUserById(id);
            if (this.useFirebase) return await FirebaseService.getUserById(id);
        } catch (error) {
            console.warn('Cloud storage getUserById failed, falling back to LocalStorage:', error);
        }
        return DataStore.getUserById(id);
    },
    
    async addUser(user) {
        await this.ensureInit();
        try {
            if (this.useSupabase) return await SupabaseService.addUser(user);
            if (this.useLeanCloud) return await LeanCloudService.addUser(user);
            if (this.useFirebase) return await FirebaseService.addUser(user);
        } catch (error) {
            console.warn('Cloud storage addUser failed, falling back to LocalStorage:', error);
        }
        return DataStore.addUser(user);
    },
    
    async updateUser(id, updates) {
        await this.ensureInit();
        try {
            if (this.useSupabase) return await SupabaseService.updateUser(id, updates);
            if (this.useLeanCloud) return await LeanCloudService.updateUser(id, updates);
            if (this.useFirebase) return await FirebaseService.updateUser(id, updates);
        } catch (error) {
            console.warn('Cloud storage updateUser failed, falling back to LocalStorage:', error);
        }
        return DataStore.updateUser(id, updates);
    },
    
    async deleteUser(id) {
        await this.ensureInit();
        try {
            if (this.useSupabase) return await SupabaseService.deleteUser(id);
            if (this.useLeanCloud) return await LeanCloudService.deleteUser(id);
            if (this.useFirebase) return await FirebaseService.deleteUser(id);
        } catch (error) {
            console.warn('Cloud storage deleteUser failed, falling back to LocalStorage:', error);
        }
        return DataStore.deleteUser(id);
    },
    
    async getGroups() {
        await this.ensureInit();
        try {
            if (this.useSupabase) return await SupabaseService.getGroups();
            if (this.useLeanCloud) return await LeanCloudService.getGroups();
            if (this.useFirebase) return await FirebaseService.getGroups();
        } catch (error) {
            console.warn('Cloud storage getGroups failed, falling back to LocalStorage:', error);
        }
        return DataStore.getGroups();
    },
    
    async saveGroups(groups) {
        await this.ensureInit();
        try {
            if (this.useSupabase) {
                for (const group of groups) {
                    const existing = await SupabaseService.getGroupById(group.id);
                    if (existing) await SupabaseService.updateGroup(group.id, group);
                    else await SupabaseService.addGroup(group);
                }
                return;
            }
            if (this.useLeanCloud) {
                for (const group of groups) {
                    const existing = await LeanCloudService.getGroupById(group.id);
                    if (existing) await LeanCloudService.updateGroup(group.id, group);
                    else await LeanCloudService.addGroup(group);
                }
                return;
            }
            if (this.useFirebase) {
                for (const group of groups) {
                    const existing = await FirebaseService.getGroupById(group.id);
                    if (existing) await FirebaseService.updateGroup(group.id, group);
                    else await FirebaseService.addGroup(group);
                }
                return;
            }
        } catch (error) {
            console.warn('Cloud storage saveGroups failed, falling back to LocalStorage:', error);
        }
        DataStore.saveGroups(groups);
    },
    
    async addGroup(group) {
        await this.ensureInit();
        try {
            if (this.useSupabase) return await SupabaseService.addGroup(group);
            if (this.useLeanCloud) return await LeanCloudService.addGroup(group);
            if (this.useFirebase) return await FirebaseService.addGroup(group);
        } catch (error) {
            console.warn('Cloud storage addGroup failed, falling back to LocalStorage:', error);
        }
        return DataStore.addGroup(group);
    },
    
    async updateGroup(id, updates) {
        await this.ensureInit();
        try {
            if (this.useSupabase) return await SupabaseService.updateGroup(id, updates);
            if (this.useLeanCloud) return await LeanCloudService.updateGroup(id, updates);
            if (this.useFirebase) return await FirebaseService.updateGroup(id, updates);
        } catch (error) {
            console.warn('Cloud storage updateGroup failed, falling back to LocalStorage:', error);
        }
        return DataStore.updateGroup(id, updates);
    },
    
    async deleteGroup(id) {
        await this.ensureInit();
        try {
            if (this.useSupabase) return await SupabaseService.deleteGroup(id);
            if (this.useLeanCloud) return await LeanCloudService.deleteGroup(id);
            if (this.useFirebase) return await FirebaseService.deleteGroup(id);
        } catch (error) {
            console.warn('Cloud storage deleteGroup failed, falling back to LocalStorage:', error);
        }
        return DataStore.deleteGroup(id);
    },
    
    async getGroupById(id) {
        await this.ensureInit();
        try {
            if (this.useSupabase) return await SupabaseService.getGroupById(id);
            if (this.useLeanCloud) return await LeanCloudService.getGroupById(id);
            if (this.useFirebase) return await FirebaseService.getGroupById(id);
        } catch (error) {
            console.warn('Cloud storage getGroupById failed, falling back to LocalStorage:', error);
        }
        const groups = await this.getGroups();
        return groups.find(g => g.id === id);
    },
    
    async getAttendances() {
        await this.ensureInit();
        try {
            if (this.useSupabase) return await SupabaseService.getAttendances();
            if (this.useLeanCloud) return await LeanCloudService.getAttendances();
            if (this.useFirebase) return await FirebaseService.getAttendances();
        } catch (error) {
            console.warn('Cloud storage getAttendances failed, falling back to LocalStorage:', error);
        }
        return DataStore.getAttendances();
    },
    
    async saveAttendances(attendances) {
        await this.ensureInit();
        try {
            if (this.useSupabase) {
                for (const att of attendances) {
                    const existing = await SupabaseService.getAttendanceById(att.id);
                    if (existing) await SupabaseService.updateAttendance(att.id, att);
                    else await SupabaseService.addAttendance(att);
                }
                return;
            }
            if (this.useLeanCloud) {
                for (const att of attendances) {
                    const existing = await LeanCloudService.getAttendanceById(att.id);
                    if (existing) await LeanCloudService.updateAttendance(att.id, att);
                    else await LeanCloudService.addAttendance(att);
                }
                return;
            }
            if (this.useFirebase) {
                for (const att of attendances) {
                    const existing = await FirebaseService.getAttendanceById(att.id);
                    if (existing) await FirebaseService.updateAttendance(att.id, att);
                    else await FirebaseService.addAttendance(att);
                }
                return;
            }
        } catch (error) {
            console.warn('Cloud storage saveAttendances failed, falling back to LocalStorage:', error);
        }
        DataStore.saveAttendances(attendances);
    },
    
    async addAttendance(attendance) {
        await this.ensureInit();
        try {
            if (this.useSupabase) return await SupabaseService.addAttendance(attendance);
            if (this.useLeanCloud) return await LeanCloudService.addAttendance(attendance);
            if (this.useFirebase) return await FirebaseService.addAttendance(attendance);
        } catch (error) {
            console.warn('Cloud storage addAttendance failed, falling back to LocalStorage:', error);
        }
        return DataStore.addAttendance(attendance);
    },
    
    async updateAttendance(id, updates) {
        await this.ensureInit();
        try {
            if (this.useSupabase) return await SupabaseService.updateAttendance(id, updates);
            if (this.useLeanCloud) return await LeanCloudService.updateAttendance(id, updates);
            if (this.useFirebase) return await FirebaseService.updateAttendance(id, updates);
        } catch (error) {
            console.warn('Cloud storage updateAttendance failed, falling back to LocalStorage:', error);
        }
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
        try {
            if (this.useSupabase) return await SupabaseService.deleteAttendance(id);
            if (this.useLeanCloud) return await LeanCloudService.deleteAttendance(id);
            if (this.useFirebase) return await FirebaseService.deleteAttendance(id);
        } catch (error) {
            console.warn('Cloud storage deleteAttendance failed, falling back to LocalStorage:', error);
        }
        const attendances = await this.getAttendances();
        const filtered = attendances.filter(a => a.id !== id);
        await this.saveAttendances(filtered);
        return filtered.length < attendances.length;
    },
    
    async getAttendanceRecords() {
        await this.ensureInit();
        try {
            if (this.useSupabase) return await SupabaseService.getAttendanceRecords();
            if (this.useLeanCloud) return await LeanCloudService.getAttendanceRecords();
            if (this.useFirebase) return await FirebaseService.getAttendanceRecords();
        } catch (error) {
            console.warn('Cloud storage getAttendanceRecords failed, falling back to LocalStorage:', error);
        }
        return DataStore.getAttendanceRecords();
    },
    
    async saveAttendanceRecords(records) {
        await this.ensureInit();
        try {
            if (this.useSupabase) {
                for (const record of records) {
                    await SupabaseService.updateAttendanceRecord(record);
                }
                return;
            }
            if (this.useLeanCloud) {
                for (const record of records) {
                    await LeanCloudService.updateAttendanceRecord(record);
                }
                return;
            }
            if (this.useFirebase) {
                for (const record of records) {
                    await FirebaseService.updateAttendanceRecord(record);
                }
                return;
            }
        } catch (error) {
            console.warn('Cloud storage saveAttendanceRecords failed, falling back to LocalStorage:', error);
        }
        DataStore.saveAttendanceRecords(records);
    },
    
    async addAttendanceRecord(record) {
        await this.ensureInit();
        try {
            if (this.useSupabase) return await SupabaseService.addAttendanceRecord(record);
            if (this.useLeanCloud) return await LeanCloudService.addAttendanceRecord(record);
            if (this.useFirebase) return await FirebaseService.addAttendanceRecord(record);
        } catch (error) {
            console.warn('Cloud storage addAttendanceRecord failed, falling back to LocalStorage:', error);
        }
        return DataStore.addAttendanceRecord(record);
    },
    
    async getQuestions() {
        await this.ensureInit();
        try {
            if (this.useSupabase) return await SupabaseService.getQuestions();
            if (this.useLeanCloud) return await LeanCloudService.getQuestions();
            if (this.useFirebase) return await FirebaseService.getQuestions();
        } catch (error) {
            console.warn('Cloud storage getQuestions failed, falling back to LocalStorage:', error);
        }
        return DataStore.getQuestions();
    },
    
    async saveQuestions(questions) {
        await this.ensureInit();
        try {
            if (this.useSupabase) {
                for (const q of questions) {
                    const existing = await SupabaseService.getQuestionById(q.id);
                    if (existing) await SupabaseService.updateQuestion(q.id, q);
                    else await SupabaseService.addQuestion(q);
                }
                return;
            }
            if (this.useLeanCloud) {
                for (const q of questions) {
                    const existing = await LeanCloudService.getQuestionById(q.id);
                    if (existing) await LeanCloudService.updateQuestion(q.id, q);
                    else await LeanCloudService.addQuestion(q);
                }
                return;
            }
            if (this.useFirebase) {
                for (const q of questions) {
                    const existing = await FirebaseService.getQuestionById(q.id);
                    if (existing) await FirebaseService.updateQuestion(q.id, q);
                    else await FirebaseService.addQuestion(q);
                }
                return;
            }
        } catch (error) {
            console.warn('Cloud storage saveQuestions failed, falling back to LocalStorage:', error);
        }
        DataStore.saveQuestions(questions);
    },
    
    async addQuestion(question) {
        await this.ensureInit();
        try {
            if (this.useSupabase) return await SupabaseService.addQuestion(question);
            if (this.useLeanCloud) return await LeanCloudService.addQuestion(question);
            if (this.useFirebase) return await FirebaseService.addQuestion(question);
        } catch (error) {
            console.warn('Cloud storage addQuestion failed, falling back to LocalStorage:', error);
        }
        return DataStore.addQuestion(question);
    },
    
    async deleteQuestion(id) {
        await this.ensureInit();
        try {
            if (this.useSupabase) return await SupabaseService.deleteQuestion(id);
            if (this.useLeanCloud) return await LeanCloudService.deleteQuestion(id);
            if (this.useFirebase) return await FirebaseService.deleteQuestion(id);
        } catch (error) {
            console.warn('Cloud storage deleteQuestion failed, falling back to LocalStorage:', error);
        }
        return DataStore.deleteQuestion(id);
    },
    
    async getExams() {
        await this.ensureInit();
        try {
            if (this.useSupabase) return await SupabaseService.getExams();
            if (this.useLeanCloud) return await LeanCloudService.getExams();
            if (this.useFirebase) return await FirebaseService.getExams();
        } catch (error) {
            console.warn('Cloud storage getExams failed, falling back to LocalStorage:', error);
        }
        return DataStore.getExams();
    },
    
    async saveExams(exams) {
        await this.ensureInit();
        try {
            if (this.useSupabase) {
                for (const exam of exams) {
                    const existing = await SupabaseService.getExamById(exam.id);
                    if (existing) await SupabaseService.updateExam(exam.id, exam);
                    else await SupabaseService.addExam(exam);
                }
                return;
            }
            if (this.useLeanCloud) {
                for (const exam of exams) {
                    const existing = await LeanCloudService.getExamById(exam.id);
                    if (existing) await LeanCloudService.updateExam(exam.id, exam);
                    else await LeanCloudService.addExam(exam);
                }
                return;
            }
            if (this.useFirebase) {
                for (const exam of exams) {
                    const existing = await FirebaseService.getExamById(exam.id);
                    if (existing) await FirebaseService.updateExam(exam.id, exam);
                    else await FirebaseService.addExam(exam);
                }
                return;
            }
        } catch (error) {
            console.warn('Cloud storage saveExams failed, falling back to LocalStorage:', error);
        }
        DataStore.saveExams(exams);
    },
    
    async addExam(exam) {
        await this.ensureInit();
        try {
            if (this.useSupabase) return await SupabaseService.addExam(exam);
            if (this.useLeanCloud) return await LeanCloudService.addExam(exam);
            if (this.useFirebase) return await FirebaseService.addExam(exam);
        } catch (error) {
            console.warn('Cloud storage addExam failed, falling back to LocalStorage:', error);
        }
        return DataStore.addExam(exam);
    },
    
    async updateExam(id, updates) {
        await this.ensureInit();
        try {
            if (this.useSupabase) return await SupabaseService.updateExam(id, updates);
            if (this.useLeanCloud) return await LeanCloudService.updateExam(id, updates);
            if (this.useFirebase) return await FirebaseService.updateExam(id, updates);
        } catch (error) {
            console.warn('Cloud storage updateExam failed, falling back to LocalStorage:', error);
        }
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
        try {
            if (this.useSupabase) return await SupabaseService.deleteExam(id);
            if (this.useLeanCloud) return await LeanCloudService.deleteExam(id);
            if (this.useFirebase) return await FirebaseService.deleteExam(id);
        } catch (error) {
            console.warn('Cloud storage deleteExam failed, falling back to LocalStorage:', error);
        }
        const exams = await this.getExams();
        const filtered = exams.filter(e => e.id !== id);
        await this.saveExams(filtered);
        return filtered.length < exams.length;
    },
    
    async getExamRecords() {
        await this.ensureInit();
        try {
            if (this.useSupabase) return await SupabaseService.getExamRecords();
            if (this.useLeanCloud) return await LeanCloudService.getExamRecords();
            if (this.useFirebase) return await FirebaseService.getExamRecords();
        } catch (error) {
            console.warn('Cloud storage getExamRecords failed, falling back to LocalStorage:', error);
        }
        return DataStore.getExamRecords();
    },
    
    async saveExamRecords(records) {
        await this.ensureInit();
        try {
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
        } catch (error) {
            console.warn('Cloud storage saveExamRecords failed, falling back to LocalStorage:', error);
        }
        DataStore.saveExamRecords(records);
    },
    
    async addExamRecord(record) {
        await this.ensureInit();
        try {
            if (this.useSupabase) return await SupabaseService.addExamRecord(record);
            if (this.useLeanCloud) return await LeanCloudService.addExamRecord(record);
            if (this.useFirebase) return await FirebaseService.addExamRecord(record);
        } catch (error) {
            console.warn('Cloud storage addExamRecord failed, falling back to LocalStorage:', error);
        }
        return DataStore.addExamRecord(record);
    },
    
    async getExamResults() {
        await this.ensureInit();
        try {
            if (this.useSupabase) return await SupabaseService.getExamRecords();
            if (this.useLeanCloud) return await LeanCloudService.getExamRecords();
            if (this.useFirebase) return await FirebaseService.getExamRecords();
        } catch (error) {
            console.warn('Cloud storage getExamResults failed, falling back to LocalStorage:', error);
        }
        return DataStore.getExamRecords();
    },
    
    async addExamResult(result) {
        await this.ensureInit();
        try {
            if (this.useSupabase) return await SupabaseService.addExamRecord(result);
            if (this.useLeanCloud) return await LeanCloudService.addExamRecord(result);
            if (this.useFirebase) return await FirebaseService.addExamRecord(result);
        } catch (error) {
            console.warn('Cloud storage addExamResult failed, falling back to LocalStorage:', error);
        }
        return DataStore.addExamRecord(result);
    },
    
    async getVotes() {
        await this.ensureInit();
        try {
            if (this.useSupabase) return await SupabaseService.getVotes();
            if (this.useLeanCloud) return await LeanCloudService.getVotes();
            if (this.useFirebase) return await FirebaseService.getVotes();
        } catch (error) {
            console.warn('Cloud storage getVotes failed, falling back to LocalStorage:', error);
        }
        return DataStore.getVotes();
    },
    
    async saveVotes(votes) {
        await this.ensureInit();
        try {
            if (this.useSupabase) {
                for (const vote of votes) {
                    const existing = await SupabaseService.getVoteById(vote.id);
                    if (existing) await SupabaseService.updateVote(vote.id, vote);
                    else await SupabaseService.addVote(vote);
                }
                return;
            }
            if (this.useLeanCloud) {
                for (const vote of votes) {
                    const existing = await LeanCloudService.getVoteById(vote.id);
                    if (existing) await LeanCloudService.updateVote(vote.id, vote);
                    else await LeanCloudService.addVote(vote);
                }
                return;
            }
            if (this.useFirebase) {
                for (const vote of votes) {
                    const existing = await FirebaseService.getVoteById(vote.id);
                    if (existing) await FirebaseService.updateVote(vote.id, vote);
                    else await FirebaseService.addVote(vote);
                }
                return;
            }
        } catch (error) {
            console.warn('Cloud storage saveVotes failed, falling back to LocalStorage:', error);
        }
        DataStore.saveVotes(votes);
    },
    
    async addVote(vote) {
        await this.ensureInit();
        try {
            if (this.useSupabase) return await SupabaseService.addVote(vote);
            if (this.useLeanCloud) return await LeanCloudService.addVote(vote);
            if (this.useFirebase) return await FirebaseService.addVote(vote);
        } catch (error) {
            console.warn('Cloud storage addVote failed, falling back to LocalStorage:', error);
        }
        return DataStore.addVote(vote);
    },
    
    async updateVote(id, updates) {
        await this.ensureInit();
        try {
            if (this.useSupabase) return await SupabaseService.updateVote(id, updates);
            if (this.useLeanCloud) return await LeanCloudService.updateVote(id, updates);
            if (this.useFirebase) return await FirebaseService.updateVote(id, updates);
        } catch (error) {
            console.warn('Cloud storage updateVote failed, falling back to LocalStorage:', error);
        }
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
        try {
            if (this.useSupabase) return await SupabaseService.deleteVote(id);
            if (this.useLeanCloud) return await LeanCloudService.deleteVote(id);
            if (this.useFirebase) return await FirebaseService.deleteVote(id);
        } catch (error) {
            console.warn('Cloud storage deleteVote failed, falling back to LocalStorage:', error);
        }
        const votes = await this.getVotes();
        const filtered = votes.filter(v => v.id !== id);
        await this.saveVotes(filtered);
        return filtered.length < votes.length;
    },
    
    async getVoteRecords() {
        await this.ensureInit();
        try {
            if (this.useSupabase) return await SupabaseService.getVoteRecords();
            if (this.useLeanCloud) return await LeanCloudService.getVoteRecords();
            if (this.useFirebase) return await FirebaseService.getVoteRecords();
        } catch (error) {
            console.warn('Cloud storage getVoteRecords failed, falling back to LocalStorage:', error);
        }
        return DataStore.getVoteRecords();
    },
    
    async saveVoteRecords(records) {
        await this.ensureInit();
        try {
            if (this.useSupabase) {
                for (const record of records) {
                    await SupabaseService.updateVoteRecord(record);
                }
                return;
            }
            if (this.useLeanCloud) {
                for (const record of records) {
                    await LeanCloudService.updateVoteRecord(record);
                }
                return;
            }
            if (this.useFirebase) {
                for (const record of records) {
                    await FirebaseService.updateVoteRecord(record);
                }
                return;
            }
        } catch (error) {
            console.warn('Cloud storage saveVoteRecords failed, falling back to LocalStorage:', error);
        }
        DataStore.saveVoteRecords(records);
    },
    
    async addVoteRecord(record) {
        await this.ensureInit();
        try {
            if (this.useSupabase) return await SupabaseService.addVoteRecord(record);
            if (this.useLeanCloud) return await LeanCloudService.addVoteRecord(record);
            if (this.useFirebase) return await FirebaseService.addVoteRecord(record);
        } catch (error) {
            console.warn('Cloud storage addVoteRecord failed, falling back to LocalStorage:', error);
        }
        return DataStore.addVoteRecord(record);
    },
    
    async getLotteries() {
        await this.ensureInit();
        try {
            if (this.useSupabase) return await SupabaseService.getLotteries();
            if (this.useLeanCloud) return await LeanCloudService.getLotteries();
            if (this.useFirebase) return await FirebaseService.getLotteries();
        } catch (error) {
            console.warn('Cloud storage getLotteries failed, falling back to LocalStorage:', error);
        }
        return DataStore.getLotteries();
    },
    
    async saveLotteries(lotteries) {
        await this.ensureInit();
        try {
            if (this.useSupabase) {
                for (const lottery of lotteries) {
                    const existing = await SupabaseService.getLotteryById(lottery.id);
                    if (existing) await SupabaseService.updateLottery(lottery.id, lottery);
                    else await SupabaseService.addLottery(lottery);
                }
                return;
            }
            if (this.useLeanCloud) {
                for (const lottery of lotteries) {
                    const existing = await LeanCloudService.getLotteryById(lottery.id);
                    if (existing) await LeanCloudService.updateLottery(lottery.id, lottery);
                    else await LeanCloudService.addLottery(lottery);
                }
                return;
            }
            if (this.useFirebase) {
                for (const lottery of lotteries) {
                    const existing = await FirebaseService.getLotteryById(lottery.id);
                    if (existing) await FirebaseService.updateLottery(lottery.id, lottery);
                    else await FirebaseService.addLottery(lottery);
                }
                return;
            }
        } catch (error) {
            console.warn('Cloud storage saveLotteries failed, falling back to LocalStorage:', error);
        }
        DataStore.saveLotteries(lotteries);
    },
    
    async addLottery(lottery) {
        await this.ensureInit();
        try {
            if (this.useSupabase) return await SupabaseService.addLottery(lottery);
            if (this.useLeanCloud) return await LeanCloudService.addLottery(lottery);
            if (this.useFirebase) return await FirebaseService.addLottery(lottery);
        } catch (error) {
            console.warn('Cloud storage addLottery failed, falling back to LocalStorage:', error);
        }
        return DataStore.addLottery(lottery);
    },
    
    async updateLottery(id, updates) {
        await this.ensureInit();
        try {
            if (this.useSupabase) return await SupabaseService.updateLottery(id, updates);
            if (this.useLeanCloud) return await LeanCloudService.updateLottery(id, updates);
            if (this.useFirebase) return await FirebaseService.updateLottery(id, updates);
        } catch (error) {
            console.warn('Cloud storage updateLottery failed, falling back to LocalStorage:', error);
        }
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
        try {
            if (this.useSupabase) return await SupabaseService.deleteLottery(id);
            if (this.useLeanCloud) return await LeanCloudService.deleteLottery(id);
            if (this.useFirebase) return await FirebaseService.deleteLottery(id);
        } catch (error) {
            console.warn('Cloud storage deleteLottery failed, falling back to LocalStorage:', error);
        }
        const lotteries = await this.getLotteries();
        const filtered = lotteries.filter(l => l.id !== id);
        await this.saveLotteries(filtered);
        return filtered.length < lotteries.length;
    },
    
    async getLotteryRecords() {
        await this.ensureInit();
        try {
            if (this.useSupabase) return await SupabaseService.getLotteryRecords();
            if (this.useLeanCloud) return await LeanCloudService.getLotteryRecords();
            if (this.useFirebase) return await FirebaseService.getLotteryRecords();
        } catch (error) {
            console.warn('Cloud storage getLotteryRecords failed, falling back to LocalStorage:', error);
        }
        return DataStore.getLotteryRecords();
    },
    
    async saveLotteryRecords(records) {
        await this.ensureInit();
        try {
            if (this.useSupabase) {
                for (const record of records) {
                    await SupabaseService.updateLotteryRecord(record);
                }
                return;
            }
            if (this.useLeanCloud) {
                for (const record of records) {
                    await LeanCloudService.updateLotteryRecord(record);
                }
                return;
            }
            if (this.useFirebase) {
                for (const record of records) {
                    await FirebaseService.updateLotteryRecord(record);
                }
                return;
            }
        } catch (error) {
            console.warn('Cloud storage saveLotteryRecords failed, falling back to LocalStorage:', error);
        }
        DataStore.saveLotteryRecords(records);
    },
    
    async addLotteryRecord(record) {
        await this.ensureInit();
        try {
            if (this.useSupabase) return await SupabaseService.addLotteryRecord(record);
            if (this.useLeanCloud) return await LeanCloudService.addLotteryRecord(record);
            if (this.useFirebase) return await FirebaseService.addLotteryRecord(record);
        } catch (error) {
            console.warn('Cloud storage addLotteryRecord failed, falling back to LocalStorage:', error);
        }
        return DataStore.addLotteryRecord(record);
    },
    
    async getActivities() {
        await this.ensureInit();
        
        const normalizeActivity = (activity) => {
            let options = activity.options;
            if (typeof options === 'string') {
                try {
                    options = JSON.parse(options);
                } catch (e) {
                    options = [];
                }
            }
            if (!Array.isArray(options)) {
                options = [];
            }
            return { ...activity, options };
        };
        
        try {
            if (this.useSupabase) {
                const votes = await SupabaseService.getVotes();
                const lotteries = await SupabaseService.getLotteries();
                return [...votes.map(v => ({ ...normalizeActivity(v), type: 'vote' })), ...lotteries.map(l => ({ ...normalizeActivity(l), type: 'lottery' }))];
            }
            if (this.useLeanCloud) {
                const votes = await LeanCloudService.getVotes();
                const lotteries = await LeanCloudService.getLotteries();
                return [...votes.map(v => ({ ...normalizeActivity(v), type: 'vote' })), ...lotteries.map(l => ({ ...normalizeActivity(l), type: 'lottery' }))];
            }
            if (this.useFirebase) {
                const votes = await FirebaseService.getVotes();
                const lotteries = await FirebaseService.getLotteries();
                return [...votes.map(v => ({ ...normalizeActivity(v), type: 'vote' })), ...lotteries.map(l => ({ ...normalizeActivity(l), type: 'lottery' }))];
            }
        } catch (error) {
            console.warn('Cloud storage getActivities failed, falling back to LocalStorage:', error);
        }
        const votes = await this.getVotes();
        const lotteries = await this.getLotteries();
        return [...votes.map(v => ({ ...normalizeActivity(v), type: 'vote' })), ...lotteries.map(l => ({ ...normalizeActivity(l), type: 'lottery' }))];
    },
    
    async getActivityById(id) {
        await this.ensureInit();
        try {
            if (this.useSupabase) {
                const vote = await SupabaseService.getVoteById(id);
                if (vote) return { ...vote, type: 'vote' };
                const lottery = await SupabaseService.getLotteryById(id);
                if (lottery) return { ...lottery, type: 'lottery' };
                return null;
            }
            if (this.useLeanCloud) {
                const vote = await LeanCloudService.getVoteById(id);
                if (vote) return { ...vote, type: 'vote' };
                const lottery = await LeanCloudService.getLotteryById(id);
                if (lottery) return { ...lottery, type: 'lottery' };
                return null;
            }
            if (this.useFirebase) {
                const vote = await FirebaseService.getVoteById(id);
                if (vote) return { ...vote, type: 'vote' };
                const lottery = await FirebaseService.getLotteryById(id);
                if (lottery) return { ...lottery, type: 'lottery' };
                return null;
            }
        } catch (error) {
            console.warn('Cloud storage getActivityById failed, falling back to LocalStorage:', error);
        }
        const votes = await this.getVotes();
        const lotteries = await this.getLotteries();
        const vote = votes.find(v => v.id === id);
        if (vote) return { ...vote, type: 'vote' };
        const lottery = lotteries.find(l => l.id === id);
        if (lottery) return { ...lottery, type: 'lottery' };
        return null;
    },
    
    async vote(activityId, optionIndex) {
        await this.ensureInit();
        try {
            const activity = await this.getActivityById(activityId);
            if (!activity) {
                return { success: false, message: '活动不存在' };
            }

            if (activity.type === 'vote') {
                const votes = activity.votes || {};
                votes[optionIndex] = (votes[optionIndex] || 0) + 1;
                
                if (this.useSupabase) {
                    await SupabaseService.updateVote(activityId, { votes });
                } else if (this.useLeanCloud) {
                    await LeanCloudService.updateVote(activityId, { votes });
                } else if (this.useFirebase) {
                    await FirebaseService.updateVote(activityId, { votes });
                } else {
                    const allVotes = await this.getVotes();
                    const index = allVotes.findIndex(v => v.id === activityId);
                    if (index !== -1) {
                        allVotes[index].votes = votes;
                        await this.saveVotes(allVotes);
                    }
                }
                
                return { success: true };
            } else {
                return { success: false, message: '不是投票活动' };
            }
        } catch (error) {
            console.error('Vote error:', error);
            return { success: false, message: error.message || '投票失败' };
        }
    },
    
    async addActivity(activity) {
        await this.ensureInit();
        const activityData = {
            id: this.generateId(),
            name: activity.name,
            type: activity.type,
            options: activity.options,
            description: activity.description || '',
            votes: activity.type === 'vote' ? {} : undefined,
            createdAt: new Date().toISOString()
        };

        try {
            if (activity.type === 'vote') {
                if (this.useSupabase) return await SupabaseService.addVote(activityData);
                if (this.useLeanCloud) return await LeanCloudService.addVote(activityData);
                if (this.useFirebase) return await FirebaseService.addVote(activityData);
            } else {
                if (this.useSupabase) return await SupabaseService.addLottery(activityData);
                if (this.useLeanCloud) return await LeanCloudService.addLottery(activityData);
                if (this.useFirebase) return await FirebaseService.addLottery(activityData);
            }
        } catch (error) {
            console.warn('Cloud storage addActivity failed, falling back to LocalStorage:', error);
        }
        
        if (activity.type === 'vote') {
            return DataStore.addVote(activityData);
        } else {
            return DataStore.addLottery(activityData);
        }
    },
    
    async createActivity(activity) {
        return await this.addActivity(activity);
    },
    
    async getPasswordResetRequests() {
        await this.ensureInit();
        try {
            if (this.useSupabase) return await SupabaseService.getPasswordResetRequests();
            if (this.useLeanCloud) return await LeanCloudService.getPasswordResetRequests();
            if (this.useFirebase) return await FirebaseService.getPasswordResetRequests();
        } catch (error) {
            console.warn('Cloud storage getPasswordResetRequests failed, falling back to LocalStorage:', error);
        }
        return DataStore.getPasswordResetRequests();
    },
    
    async savePasswordResetRequests(requests) {
        await this.ensureInit();
        try {
            if (this.useSupabase) {
                for (const req of requests) {
                    const existing = await SupabaseService.getPasswordResetRequestById(req.id);
                    if (existing) await SupabaseService.processPasswordResetRequest(req.id, req);
                    else await SupabaseService.addPasswordResetRequest(req);
                }
                return;
            }
            if (this.useLeanCloud) {
                for (const req of requests) {
                    const existing = await LeanCloudService.getPasswordResetRequestById(req.id);
                    if (existing) await LeanCloudService.processPasswordResetRequest(req.id, req);
                    else await LeanCloudService.addPasswordResetRequest(req);
                }
                return;
            }
            if (this.useFirebase) {
                for (const req of requests) {
                    const existing = await FirebaseService.getPasswordResetRequestById(req.id);
                    if (existing) await FirebaseService.processPasswordResetRequest(req.id, req);
                    else await FirebaseService.addPasswordResetRequest(req);
                }
                return;
            }
        } catch (error) {
            console.warn('Cloud storage savePasswordResetRequests failed, falling back to LocalStorage:', error);
        }
        DataStore.savePasswordResetRequests(requests);
    },
    
    async addPasswordResetRequest(request) {
        await this.ensureInit();
        try {
            if (this.useSupabase) return await SupabaseService.addPasswordResetRequest(request);
            if (this.useLeanCloud) return await LeanCloudService.addPasswordResetRequest(request);
            if (this.useFirebase) return await FirebaseService.addPasswordResetRequest(request);
        } catch (error) {
            console.warn('Cloud storage addPasswordResetRequest failed, falling back to LocalStorage:', error);
        }
        return DataStore.addPasswordResetRequest(request);
    },
    
    async processPasswordResetRequest(id, processed) {
        await this.ensureInit();
        try {
            if (this.useSupabase) return await SupabaseService.processPasswordResetRequest(id, processed);
            if (this.useLeanCloud) return await LeanCloudService.processPasswordResetRequest(id, processed);
            if (this.useFirebase) return await FirebaseService.processPasswordResetRequest(id, processed);
        } catch (error) {
            console.warn('Cloud storage processPasswordResetRequest failed, falling back to LocalStorage:', error);
        }
        return DataStore.processPasswordResetRequest(id, processed);
    },
    
    async getNotifications() {
        await this.ensureInit();
        try {
            if (this.useSupabase) return await SupabaseService.getNotifications();
            if (this.useLeanCloud) return await LeanCloudService.getNotifications();
            if (this.useFirebase) return await FirebaseService.getNotifications();
        } catch (error) {
            console.warn('Cloud storage getNotifications failed, falling back to LocalStorage:', error);
        }
        return DataStore.getNotifications();
    },
    
    async saveNotifications(notifications) {
        await this.ensureInit();
        try {
            if (this.useSupabase) {
                for (const n of notifications) {
                    const existing = await SupabaseService.getNotificationById(n.id);
                    if (existing) await SupabaseService.markNotificationRead(n.id);
                    else await SupabaseService.addNotification(n);
                }
                return;
            }
            if (this.useLeanCloud) {
                for (const n of notifications) {
                    const existing = await LeanCloudService.getNotificationById(n.id);
                    if (existing) await LeanCloudService.markNotificationRead(n.id);
                    else await LeanCloudService.addNotification(n);
                }
                return;
            }
            if (this.useFirebase) {
                for (const n of notifications) {
                    const existing = await FirebaseService.getNotificationById(n.id);
                    if (existing) await FirebaseService.markNotificationRead(n.id);
                    else await FirebaseService.addNotification(n);
                }
                return;
            }
        } catch (error) {
            console.warn('Cloud storage saveNotifications failed, falling back to LocalStorage:', error);
        }
        DataStore.saveNotifications(notifications);
    },
    
    async addNotification(notification) {
        await this.ensureInit();
        try {
            if (this.useSupabase) return await SupabaseService.addNotification(notification);
            if (this.useLeanCloud) return await LeanCloudService.addNotification(notification);
            if (this.useFirebase) return await FirebaseService.addNotification(notification);
        } catch (error) {
            console.warn('Cloud storage addNotification failed, falling back to LocalStorage:', error);
        }
        return DataStore.addNotification(notification);
    },
    
    async markNotificationRead(id) {
        await this.ensureInit();
        try {
            if (this.useSupabase) return await SupabaseService.markNotificationRead(id);
            if (this.useLeanCloud) return await LeanCloudService.markNotificationRead(id);
            if (this.useFirebase) return await FirebaseService.markNotificationRead(id);
        } catch (error) {
            console.warn('Cloud storage markNotificationRead failed, falling back to LocalStorage:', error);
        }
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
        try {
            if (this.useSupabase) return await SupabaseService.getQuestionnaires();
            if (this.useLeanCloud) return await LeanCloudService.getQuestionnaires();
            if (this.useFirebase) return await FirebaseService.getQuestionnaires();
        } catch (error) {
            console.warn('Cloud storage getQuestionnaires failed, falling back to LocalStorage:', error);
        }
        return DataStore.getQuestionnaires();
    },
    
    async getQuestionnaireById(id) {
        await this.ensureInit();
        try {
            if (this.useSupabase) return await SupabaseService.getQuestionnaireById(id);
            if (this.useLeanCloud) return await LeanCloudService.getQuestionnaireById(id);
            if (this.useFirebase) return await FirebaseService.getQuestionnaireById(id);
        } catch (error) {
            console.warn('Cloud storage getQuestionnaireById failed, falling back to LocalStorage:', error);
        }
        return DataStore.getQuestionnaireById(id);
    },
    
    async addQuestionnaire(questionnaire) {
        await this.ensureInit();
        try {
            if (this.useSupabase) return await SupabaseService.addQuestionnaire(questionnaire);
            if (this.useLeanCloud) return await LeanCloudService.addQuestionnaire(questionnaire);
            if (this.useFirebase) return await FirebaseService.addQuestionnaire(questionnaire);
        } catch (error) {
            console.warn('Cloud storage addQuestionnaire failed, falling back to LocalStorage:', error);
        }
        return DataStore.addQuestionnaire(questionnaire);
    },
    
    async updateQuestionnaire(id, updates) {
        await this.ensureInit();
        try {
            if (this.useSupabase) return await SupabaseService.updateQuestionnaire(id, updates);
            if (this.useLeanCloud) return await LeanCloudService.updateQuestionnaire(id, updates);
            if (this.useFirebase) return await FirebaseService.updateQuestionnaire(id, updates);
        } catch (error) {
            console.warn('Cloud storage updateQuestionnaire failed, falling back to LocalStorage:', error);
        }
        return DataStore.updateQuestionnaire(id, updates);
    },
    
    async deleteQuestionnaire(id) {
        await this.ensureInit();
        try {
            if (this.useSupabase) return await SupabaseService.deleteQuestionnaire(id);
            if (this.useLeanCloud) return await LeanCloudService.deleteQuestionnaire(id);
            if (this.useFirebase) return await FirebaseService.deleteQuestionnaire(id);
        } catch (error) {
            console.warn('Cloud storage deleteQuestionnaire failed, falling back to LocalStorage:', error);
        }
        return DataStore.deleteQuestionnaire(id);
    },
    
    async getQuestionnaireRecords() {
        await this.ensureInit();
        try {
            if (this.useSupabase) return await SupabaseService.getQuestionnaireRecords();
            if (this.useLeanCloud) return await LeanCloudService.getQuestionnaireRecords();
            if (this.useFirebase) return await FirebaseService.getQuestionnaireRecords();
        } catch (error) {
            console.warn('Cloud storage getQuestionnaireRecords failed, falling back to LocalStorage:', error);
        }
        return DataStore.getQuestionnaireRecords();
    },
    
    async addQuestionnaireRecord(record) {
        await this.ensureInit();
        try {
            if (this.useSupabase) return await SupabaseService.addQuestionnaireRecord(record);
            if (this.useLeanCloud) return await LeanCloudService.addQuestionnaireRecord(record);
            if (this.useFirebase) return await FirebaseService.addQuestionnaireRecord(record);
        } catch (error) {
            console.warn('Cloud storage addQuestionnaireRecord failed, falling back to LocalStorage:', error);
        }
        return DataStore.addQuestionnaireRecord(record);
    },
    
    async getSubjects() {
        await this.ensureInit();
        try {
            if (this.useSupabase) return await SupabaseService.getSubjects();
            if (this.useLeanCloud) return await LeanCloudService.getSubjects();
            if (this.useFirebase) return await FirebaseService.getSubjects();
        } catch (error) {
            console.warn('Cloud storage getSubjects failed, falling back to LocalStorage:', error);
        }
        return DataStore.getSubjects();
    },
    
    async addSubject(subject) {
        await this.ensureInit();
        try {
            if (this.useSupabase) return await SupabaseService.addSubject(subject);
            if (this.useLeanCloud) return await LeanCloudService.addSubject(subject);
            if (this.useFirebase) return await FirebaseService.addSubject(subject);
        } catch (error) {
            console.warn('Cloud storage addSubject failed, falling back to LocalStorage:', error);
        }
        return DataStore.addSubject(subject);
    },
    
    async updateSubject(id, updates) {
        await this.ensureInit();
        try {
            if (this.useSupabase) return await SupabaseService.updateSubject(id, updates);
            if (this.useLeanCloud) return await LeanCloudService.updateSubject(id, updates);
            if (this.useFirebase) return await FirebaseService.updateSubject(id, updates);
        } catch (error) {
            console.warn('Cloud storage updateSubject failed, falling back to LocalStorage:', error);
        }
        return DataStore.updateSubject(id, updates);
    },
    
    async deleteSubject(id) {
        await this.ensureInit();
        try {
            if (this.useSupabase) return await SupabaseService.deleteSubject(id);
            if (this.useLeanCloud) return await LeanCloudService.deleteSubject(id);
            if (this.useFirebase) return await FirebaseService.deleteSubject(id);
        } catch (error) {
            console.warn('Cloud storage deleteSubject failed, falling back to LocalStorage:', error);
        }
        return DataStore.deleteSubject(id);
    },
    
    async getQuestionTypes() {
        await this.ensureInit();
        try {
            if (this.useSupabase) return await SupabaseService.getQuestionTypes();
            if (this.useLeanCloud) return await LeanCloudService.getQuestionTypes();
            if (this.useFirebase) return await FirebaseService.getQuestionTypes();
        } catch (error) {
            console.warn('Cloud storage getQuestionTypes failed, falling back to LocalStorage:', error);
        }
        return DataStore.getQuestionTypes();
    },
    
    async addQuestionType(type) {
        await this.ensureInit();
        try {
            if (this.useSupabase) return await SupabaseService.addQuestionType(type);
            if (this.useLeanCloud) return await LeanCloudService.addQuestionType(type);
            if (this.useFirebase) return await FirebaseService.addQuestionType(type);
        } catch (error) {
            console.warn('Cloud storage addQuestionType failed, falling back to LocalStorage:', error);
        }
        return DataStore.addQuestionType(type);
    },
    
    async updateQuestionType(id, updates) {
        await this.ensureInit();
        try {
            if (this.useSupabase) return await SupabaseService.updateQuestionType(id, updates);
            if (this.useLeanCloud) return await LeanCloudService.updateQuestionType(id, updates);
            if (this.useFirebase) return await FirebaseService.updateQuestionType(id, updates);
        } catch (error) {
            console.warn('Cloud storage updateQuestionType failed, falling back to LocalStorage:', error);
        }
        return DataStore.updateQuestionType(id, updates);
    },
    
    async deleteQuestionType(id) {
        await this.ensureInit();
        try {
            if (this.useSupabase) return await SupabaseService.deleteQuestionType(id);
            if (this.useLeanCloud) return await LeanCloudService.deleteQuestionType(id);
            if (this.useFirebase) return await FirebaseService.deleteQuestionType(id);
        } catch (error) {
            console.warn('Cloud storage deleteQuestionType failed, falling back to LocalStorage:', error);
        }
        return DataStore.deleteQuestionType(id);
    },
    
    async getKnowledgePoints() {
        await this.ensureInit();
        try {
            if (this.useSupabase) return await SupabaseService.getKnowledgePoints();
            if (this.useLeanCloud) return await LeanCloudService.getKnowledgePoints();
            if (this.useFirebase) return await FirebaseService.getKnowledgePoints();
        } catch (error) {
            console.warn('Cloud storage getKnowledgePoints failed, falling back to LocalStorage:', error);
        }
        return DataStore.getKnowledgePoints();
    },
    
    async addKnowledgePoint(kp) {
        await this.ensureInit();
        try {
            if (this.useSupabase) return await SupabaseService.addKnowledgePoint(kp);
            if (this.useLeanCloud) return await LeanCloudService.addKnowledgePoint(kp);
            if (this.useFirebase) return await FirebaseService.addKnowledgePoint(kp);
        } catch (error) {
            console.warn('Cloud storage addKnowledgePoint failed, falling back to LocalStorage:', error);
        }
        return DataStore.addKnowledgePoint(kp);
    },
    
    async updateKnowledgePoint(id, updates) {
        await this.ensureInit();
        try {
            if (this.useSupabase) return await SupabaseService.updateKnowledgePoint(id, updates);
            if (this.useLeanCloud) return await LeanCloudService.updateKnowledgePoint(id, updates);
            if (this.useFirebase) return await FirebaseService.updateKnowledgePoint(id, updates);
        } catch (error) {
            console.warn('Cloud storage updateKnowledgePoint failed, falling back to LocalStorage:', error);
        }
        return DataStore.updateKnowledgePoint(id, updates);
    },
    
    async deleteKnowledgePoint(id) {
        await this.ensureInit();
        try {
            if (this.useSupabase) return await SupabaseService.deleteKnowledgePoint(id);
            if (this.useLeanCloud) return await LeanCloudService.deleteKnowledgePoint(id);
            if (this.useFirebase) return await FirebaseService.deleteKnowledgePoint(id);
        } catch (error) {
            console.warn('Cloud storage deleteKnowledgePoint failed, falling back to LocalStorage:', error);
        }
        return DataStore.deleteKnowledgePoint(id);
    },
    
    async getWrongQuestions() {
        await this.ensureInit();
        try {
            if (this.useSupabase) return await SupabaseService.getWrongQuestions();
            if (this.useLeanCloud) return await LeanCloudService.getWrongQuestions();
            if (this.useFirebase) return await FirebaseService.getWrongQuestions();
        } catch (error) {
            console.warn('Cloud storage getWrongQuestions failed, falling back to LocalStorage:', error);
        }
        return DataStore.getWrongQuestions();
    },
    
    async addWrongQuestion(question) {
        await this.ensureInit();
        try {
            if (this.useSupabase) return await SupabaseService.addWrongQuestion(question);
            if (this.useLeanCloud) return await LeanCloudService.addWrongQuestion(question);
            if (this.useFirebase) return await FirebaseService.addWrongQuestion(question);
        } catch (error) {
            console.warn('Cloud storage addWrongQuestion failed, falling back to LocalStorage:', error);
        }
        return DataStore.addWrongQuestion(question);
    },
    
    async updateWrongQuestion(id, updates) {
        await this.ensureInit();
        try {
            if (this.useSupabase) return await SupabaseService.updateWrongQuestion(id, updates);
            if (this.useLeanCloud) return await LeanCloudService.updateWrongQuestion(id, updates);
            if (this.useFirebase) return await FirebaseService.updateWrongQuestion(id, updates);
        } catch (error) {
            console.warn('Cloud storage updateWrongQuestion failed, falling back to LocalStorage:', error);
        }
        return DataStore.updateWrongQuestion(id, updates);
    },
    
    async deleteWrongQuestion(id) {
        await this.ensureInit();
        try {
            if (this.useSupabase) return await SupabaseService.deleteWrongQuestion(id);
            if (this.useLeanCloud) return await LeanCloudService.deleteWrongQuestion(id);
            if (this.useFirebase) return await FirebaseService.deleteWrongQuestion(id);
        } catch (error) {
            console.warn('Cloud storage deleteWrongQuestion failed, falling back to LocalStorage:', error);
        }
        return DataStore.deleteWrongQuestion(id);
    },

    // 错题集相关方法
    async getWrongQuestionSets() {
        await this.ensureInit();
        try {
            if (this.useSupabase) return await SupabaseService.getWrongQuestionSets();
            if (this.useLeanCloud) return await LeanCloudService.getWrongQuestionSets();
            if (this.useFirebase) return await FirebaseService.getWrongQuestionSets();
        } catch (error) {
            console.warn('Cloud storage getWrongQuestionSets failed, falling back to LocalStorage:', error);
        }
        return DataStore.getWrongQuestionSets();
    },

    async createWrongQuestionSet(set) {
        await this.ensureInit();
        try {
            if (this.useSupabase) return await SupabaseService.createWrongQuestionSet(set);
            if (this.useLeanCloud) return await LeanCloudService.createWrongQuestionSet(set);
            if (this.useFirebase) return await FirebaseService.createWrongQuestionSet(set);
        } catch (error) {
            console.warn('Cloud storage createWrongQuestionSet failed, falling back to LocalStorage:', error);
        }
        return DataStore.createWrongQuestionSet(set);
    },

    async updateWrongQuestionSet(id, updates) {
        await this.ensureInit();
        try {
            if (this.useSupabase) return await SupabaseService.updateWrongQuestionSet(id, updates);
            if (this.useLeanCloud) return await LeanCloudService.updateWrongQuestionSet(id, updates);
            if (this.useFirebase) return await FirebaseService.updateWrongQuestionSet(id, updates);
        } catch (error) {
            console.warn('Cloud storage updateWrongQuestionSet failed, falling back to LocalStorage:', error);
        }
        return DataStore.updateWrongQuestionSet(id, updates);
    },

    async deleteWrongQuestionSet(id) {
        await this.ensureInit();
        try {
            if (this.useSupabase) return await SupabaseService.deleteWrongQuestionSet(id);
            if (this.useLeanCloud) return await LeanCloudService.deleteWrongQuestionSet(id);
            if (this.useFirebase) return await FirebaseService.deleteWrongQuestionSet(id);
        } catch (error) {
            console.warn('Cloud storage deleteWrongQuestionSet failed, falling back to LocalStorage:', error);
        }
        return DataStore.deleteWrongQuestionSet(id);
    },

    async addQuestionToSet(setId, questionId) {
        await this.ensureInit();
        try {
            if (this.useSupabase) return await SupabaseService.addQuestionToSet(setId, questionId);
            if (this.useLeanCloud) return await LeanCloudService.addQuestionToSet(setId, questionId);
            if (this.useFirebase) return await FirebaseService.addQuestionToSet(setId, questionId);
        } catch (error) {
            console.warn('Cloud storage addQuestionToSet failed, falling back to LocalStorage:', error);
        }
        return DataStore.addQuestionToSet(setId, questionId);
    },

    async removeQuestionFromSet(setId, questionId) {
        await this.ensureInit();
        try {
            if (this.useSupabase) return await SupabaseService.removeQuestionFromSet(setId, questionId);
            if (this.useLeanCloud) return await LeanCloudService.removeQuestionFromSet(setId, questionId);
            if (this.useFirebase) return await FirebaseService.removeQuestionFromSet(setId, questionId);
        } catch (error) {
            console.warn('Cloud storage removeQuestionFromSet failed, falling back to LocalStorage:', error);
        }
        return DataStore.removeQuestionFromSet(setId, questionId);
    },

    // 文件相关方法
    async getFiles(userId, path = '') {
        await this.ensureInit();
        try {
            if (this.useSupabase) return await SupabaseService.getFiles(userId, path);
            if (this.useLeanCloud) return await LeanCloudService.getFiles(userId, path);
            if (this.useFirebase) return await FirebaseService.getFiles(userId, path);
        } catch (error) {
            console.warn('Cloud storage getFiles failed, falling back to LocalStorage:', error);
        }
        return DataStore.getFiles(userId, path);
    },

    async createFile(file) {
        await this.ensureInit();
        try {
            if (this.useSupabase) return await SupabaseService.createFile(file);
            if (this.useLeanCloud) return await LeanCloudService.createFile(file);
            if (this.useFirebase) return await FirebaseService.createFile(file);
        } catch (error) {
            console.warn('Cloud storage createFile failed, falling back to LocalStorage:', error);
        }
        return DataStore.createFile(file);
    },

    async deleteFile(id) {
        await this.ensureInit();
        try {
            if (this.useSupabase) return await SupabaseService.deleteFile(id);
            if (this.useLeanCloud) return await LeanCloudService.deleteFile(id);
            if (this.useFirebase) return await FirebaseService.deleteFile(id);
        } catch (error) {
            console.warn('Cloud storage deleteFile failed, falling back to LocalStorage:', error);
        }
        return DataStore.deleteFile(id);
    },
    
    async getMessages() {
        await this.ensureInit();
        try {
            if (window.ChatService) {
                return await ChatService.getMessages(null, {});
            }
        } catch (error) {
            console.warn('ChatService getMessages failed:', error);
        }
        return [];
    },
    
    async sendMessage(content) {
        await this.ensureInit();
        try {
            if (window.ChatService) {
                return await ChatService.sendMessage('global', content);
            }
        } catch (error) {
            console.warn('ChatService sendMessage failed:', error);
        }
        return null;
    }
};

window.DataService = DataService;
