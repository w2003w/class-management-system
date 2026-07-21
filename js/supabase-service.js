const SupabaseService = {
    initialized: false,
    supabase: null,

    toSnakeCase(str) {
        if (str === null || str === undefined) return str;
        if (typeof str !== 'string') return str;
        return str.replace(/[A-Z]/g, letter => `_${letter.toLowerCase()}`);
    },

    toCamelCase(str) {
        if (str === null || str === undefined) return str;
        if (typeof str !== 'string') return str;
        return str.replace(/_([a-z])/g, (_, letter) => letter.toUpperCase());
    },

    convertKeysToSnakeCase(obj) {
        if (obj === null || obj === undefined) return obj;
        if (Array.isArray(obj)) {
            return obj.map(item => this.convertKeysToSnakeCase(item));
        }
        if (typeof obj === 'object') {
            const result = {};
            for (const key in obj) {
                if (obj.hasOwnProperty(key)) {
                    const snakeKey = this.toSnakeCase(key);
                    let value = obj[key];
                    if (value && typeof value === 'object' && !Array.isArray(value)) {
                        value = this.convertKeysToSnakeCase(value);
                    }
                    result[snakeKey] = value;
                }
            }
            return result;
        }
        return obj;
    },

    convertKeysToCamelCase(obj) {
        if (obj === null || obj === undefined) return obj;
        if (Array.isArray(obj)) {
            return obj.map(item => this.convertKeysToCamelCase(item));
        }
        if (typeof obj === 'object') {
            const result = {};
            for (const key in obj) {
                if (obj.hasOwnProperty(key)) {
                    const camelKey = this.toCamelCase(key);
                    let value = obj[key];
                    if (value && typeof value === 'object' && !Array.isArray(value)) {
                        value = this.convertKeysToCamelCase(value);
                    }
                    result[camelKey] = value;
                }
            }
            return result;
        }
        return obj;
    },

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
            if (!config || !config.url || config.url === 'YOUR_SUPABASE_URL' || config.url === '') {
                console.log('Supabase URL not configured');
                return false;
            }
            
            if (!config.anonKey || config.anonKey === 'YOUR_SUPABASE_ANON_KEY' || config.anonKey === '') {
                console.log('Supabase API key not configured');
                return false;
            }
            
            console.log('Initializing Supabase with URL:', config.url);
            console.log('API key provided:', config.anonKey ? 'Yes' : 'No');
            
            let createClient;
            if (window.supabase && typeof window.supabase.createClient === 'function') {
                createClient = window.supabase.createClient;
            } else if (window.createClient) {
                createClient = window.createClient;
            } else if (window.SupabaseClient && typeof window.SupabaseClient.createClient === 'function') {
                createClient = window.SupabaseClient.createClient;
            }
            
            if (!createClient) {
                console.error('supabase library not loaded properly');
                console.error('Available globals:', Object.keys(window).filter(k => k.toLowerCase().includes('supabase') || k === 'createClient'));
                return false;
            }
            
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

    getCurrentUserFromStorage() {
        return this.getCurrentUser();
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
    
    async getUserByUsername(username) {
        if (!await this.ensureInit()) return null;
        
        try {
            const { data, error } = await this.supabase
                .from('users')
                .select('*')
                .eq('username', username)
                .maybeSingle();
            
            if (error) throw error;
            return data;
        } catch (error) {
            console.error('Get user by username error:', error);
            return null;
        }
    },
    
    async getUserById(id) {
        if (!await this.ensureInit()) return null;
        
        try {
            const { data, error } = await this.supabase
                .from('users')
                .select('*')
                .eq('id', id)
                .maybeSingle();
            
            if (error) throw error;
            return data;
        } catch (error) {
            console.error('Get user by id error:', error);
            return null;
        }
    },
    
    async addUser(userData) {
        if (!await this.ensureInit()) return null;
        
        try {
            const { data, error } = await this.supabase
                .from('users')
                .insert([this.cleanData(userData)])
                .select()
                .maybeSingle();
            
            if (error) throw error;
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
                .maybeSingle();
            
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
    
    async getGroupById(id) {
        if (!await this.ensureInit()) return null;
        
        try {
            const { data, error } = await this.supabase
                .from('groups')
                .select('*')
                .eq('id', id)
                .maybeSingle();
            
            if (error) throw error;
            return data;
        } catch (error) {
            console.error('Get group by id error:', error);
            return null;
        }
    },
    
    async addGroup(groupData) {
        if (!await this.ensureInit()) return null;
        
        try {
            const { data, error } = await this.supabase
                .from('groups')
                .insert([this.cleanData(groupData)])
                .select()
                .maybeSingle();
            
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
                .maybeSingle();
            
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
    
    async getAttendances() {
        if (!await this.ensureInit()) return [];

        try {
            const { data, error } = await this.supabase
                .from('attendances')
                .select('*')
                .order('created_at', { ascending: false });

            if (error) throw error;
            return this.convertKeysToCamelCase(data || []);
        } catch (error) {
            console.error('Get attendances error:', error);
            return [];
        }
    },
    
    async getAttendanceById(id) {
        if (!await this.ensureInit()) return null;
        
        try {
            const { data, error } = await this.supabase
                .from('attendances')
                .select('*')
                .eq('id', id)
                .maybeSingle();
            
            if (error) throw error;
            return data;
        } catch (error) {
            console.error('Get attendance by id error:', error);
            return null;
        }
    },
    
    async addAttendance(attendance) {
        if (!await this.ensureInit()) return null;

        try {
            const dataWithSnakeKeys = this.convertKeysToSnakeCase(attendance);
            const { data, error } = await this.supabase
                .from('attendances')
                .insert([this.cleanData(dataWithSnakeKeys)])
                .select()
                .maybeSingle();

            if (error) throw error;
            return this.convertKeysToCamelCase(data);
        } catch (error) {
            console.error('Add attendance error:', error);
            throw error;
        }
    },
    
    async updateAttendance(id, updates) {
        if (!await this.ensureInit()) return null;

        try {
            const dataWithSnakeKeys = this.convertKeysToSnakeCase(updates);
            const { data, error } = await this.supabase
                .from('attendances')
                .update(this.cleanData(dataWithSnakeKeys))
                .eq('id', id)
                .select()
                .maybeSingle();

            if (error) throw error;
            return this.convertKeysToCamelCase(data);
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
                .select('*')
                .order('created_at', { ascending: false });

            if (error) throw error;
            return this.convertKeysToCamelCase(data || []);
        } catch (error) {
            console.error('Get attendance records error:', error);
            return [];
        }
    },
    
    async addAttendanceRecord(record) {
        if (!await this.ensureInit()) return null;

        try {
            const dataWithSnakeKeys = this.convertKeysToSnakeCase(record);
            const { data, error } = await this.supabase
                .from('attendance_records')
                .insert([this.cleanData(dataWithSnakeKeys)])
                .select()
                .maybeSingle();

            if (error) throw error;
            return this.convertKeysToCamelCase(data);
        } catch (error) {
            console.error('Add attendance record error:', error);
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
    
    async getQuestionById(id) {
        if (!await this.ensureInit()) return null;
        
        try {
            const { data, error } = await this.supabase
                .from('questions')
                .select('*')
                .eq('id', id)
                .maybeSingle();
            
            if (error) throw error;
            return data;
        } catch (error) {
            console.error('Get question by id error:', error);
            return null;
        }
    },
    
    async addQuestion(question) {
        if (!await this.ensureInit()) return null;
        
        try {
            const { data, error } = await this.supabase
                .from('questions')
                .insert([this.cleanData(question)])
                .select()
                .maybeSingle();
            
            if (error) throw error;
            return data;
        } catch (error) {
            console.error('Add question error:', error);
            throw error;
        }
    },
    
    async updateQuestion(id, updates) {
        if (!await this.ensureInit()) return null;
        
        try {
            const { data, error } = await this.supabase
                .from('questions')
                .update(this.cleanData(updates))
                .eq('id', id)
                .select()
                .maybeSingle();
            
            if (error) throw error;
            return data;
        } catch (error) {
            console.error('Update question error:', error);
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
    
    async getExams() {
        if (!await this.ensureInit()) return [];
        
        try {
            const { data, error } = await this.supabase
                .from('exams')
                .select('*')
                .order('created_at', { ascending: false });
            
            if (error) throw error;
            return data || [];
        } catch (error) {
            console.error('Get exams error:', error);
            return [];
        }
    },
    
    async getExamById(id) {
        if (!await this.ensureInit()) return null;
        
        try {
            const { data, error } = await this.supabase
                .from('exams')
                .select('*')
                .eq('id', id)
                .maybeSingle();
            
            if (error) throw error;
            return data;
        } catch (error) {
            console.error('Get exam by id error:', error);
            return null;
        }
    },
    
    async addExam(exam) {
        if (!await this.ensureInit()) return null;
        
        try {
            const { data, error } = await this.supabase
                .from('exams')
                .insert([this.cleanData(exam)])
                .select()
                .maybeSingle();
            
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
                .maybeSingle();
            
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
    
    async addExamRecord(record) {
        if (!await this.ensureInit()) return null;
        
        try {
            const { data, error } = await this.supabase
                .from('exam_records')
                .insert([this.cleanData(record)])
                .select()
                .maybeSingle();
            
            if (error) throw error;
            return data;
        } catch (error) {
            console.error('Add exam record error:', error);
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
    
    async addVoteRecord(record) {
        if (!await this.ensureInit()) return null;
        
        try {
            const { data, error } = await this.supabase
                .from('vote_records')
                .insert([this.cleanData(record)])
                .select()
                .maybeSingle();
            
            if (error) throw error;
            return data;
        } catch (error) {
            console.error('Add vote record error:', error);
            throw error;
        }
    },
    
    async getSubjects() {
        if (!await this.ensureInit()) return [];
        
        try {
            const { data, error } = await this.supabase
                .from('subjects')
                .select('*');
            
            if (error) throw error;
            return data || [];
        } catch (error) {
            console.error('Get subjects error:', error);
            return [];
        }
    },
    
    async addSubject(subject) {
        if (!await this.ensureInit()) return null;
        
        try {
            const { data, error } = await this.supabase
                .from('subjects')
                .insert([this.cleanData(subject)])
                .select()
                .maybeSingle();
            
            if (error) throw error;
            return data;
        } catch (error) {
            console.error('Add subject error:', error);
            throw error;
        }
    },
    
    async updateSubject(id, updates) {
        if (!await this.ensureInit()) return null;
        
        try {
            console.log('Updating subject in database:', { id, updates });
            const { data, error } = await this.supabase
                .from('subjects')
                .update(this.cleanData(updates))
                .eq('id', id)
                .select();
            
            if (error) {
                console.error('Supabase update error:', error);
                throw error;
            }
            console.log('Update result array:', data);
            const result = data && data.length > 0 ? data[0] : null;
            if (!result) {
                console.warn('Update returned no data - check RLS policies or ensure the record exists');
            }
            return result;
        } catch (error) {
            console.error('Update subject error:', error);
            throw error;
        }
    },
    
    async deleteSubject(id) {
        if (!await this.ensureInit()) return false;
        
        try {
            console.log('Deleting subject:', id);
            
            const { error: deleteKnowledgeError } = await this.supabase
                .from('knowledge_points')
                .delete()
                .eq('subject_id', id);
            
            if (deleteKnowledgeError) {
                console.warn('Error deleting knowledge points:', deleteKnowledgeError);
            }
            
            const { error } = await this.supabase
                .from('subjects')
                .delete()
                .eq('id', id);
            
            if (error) throw error;
            console.log('Subject deleted successfully:', id);
            return true;
        } catch (error) {
            console.error('Delete subject error:', error);
            throw error;
        }
    },
    
    async getQuestionTypes() {
        if (!await this.ensureInit()) return [];
        
        try {
            const { data, error } = await this.supabase
                .from('question_types')
                .select('*');
            
            if (error) throw error;
            return data || [];
        } catch (error) {
            console.error('Get question types error:', error);
            return [];
        }
    },
    
    async addQuestionType(questionType) {
        if (!await this.ensureInit()) return null;
        
        try {
            const { data, error } = await this.supabase
                .from('question_types')
                .insert([this.cleanData(questionType)])
                .select()
                .maybeSingle();
            
            if (error) throw error;
            return data;
        } catch (error) {
            console.error('Add question type error:', error);
            throw error;
        }
    },
    
    async updateQuestionType(id, updates) {
        if (!await this.ensureInit()) return null;
        
        try {
            const { data, error } = await this.supabase
                .from('question_types')
                .update(this.cleanData(updates))
                .eq('id', id)
                .select()
                .maybeSingle();
            
            if (error) throw error;
            return data;
        } catch (error) {
            console.error('Update question type error:', error);
            throw error;
        }
    },
    
    async deleteQuestionType(id) {
        if (!await this.ensureInit()) return false;
        
        try {
            const { error } = await this.supabase
                .from('question_types')
                .delete()
                .eq('id', id);
            
            if (error) throw error;
            return true;
        } catch (error) {
            console.error('Delete question type error:', error);
            throw error;
        }
    },
    
    async getKnowledgePoints() {
        if (!await this.ensureInit()) return [];
        
        try {
            const { data, error } = await this.supabase
                .from('knowledge_points')
                .select('*');
            
            if (error) throw error;
            return data || [];
        } catch (error) {
            console.error('Get knowledge points error:', error);
            return [];
        }
    },
    
    async addKnowledgePoint(knowledgePoint) {
        if (!await this.ensureInit()) return null;
        
        try {
            const { data, error } = await this.supabase
                .from('knowledge_points')
                .insert([this.cleanData(knowledgePoint)])
                .select()
                .maybeSingle();
            
            if (error) throw error;
            return data;
        } catch (error) {
            console.error('Add knowledge point error:', error);
            throw error;
        }
    },
    
    async updateKnowledgePoint(id, updates) {
        if (!await this.ensureInit()) return null;
        
        try {
            const { data, error } = await this.supabase
                .from('knowledge_points')
                .update(this.cleanData(updates))
                .eq('id', id)
                .select()
                .maybeSingle();
            
            if (error) throw error;
            return data;
        } catch (error) {
            console.error('Update knowledge point error:', error);
            throw error;
        }
    },
    
    async deleteKnowledgePoint(id) {
        if (!await this.ensureInit()) return false;
        
        try {
            const { error } = await this.supabase
                .from('knowledge_points')
                .delete()
                .eq('id', id);
            
            if (error) throw error;
            return true;
        } catch (error) {
            console.error('Delete knowledge point error:', error);
            throw error;
        }
    },
    
    async getWrongQuestions() {
        if (!await this.ensureInit()) return [];
        
        try {
            const { data, error } = await this.supabase
                .from('wrong_questions')
                .select('*');
            
            if (error) throw error;
            return data || [];
        } catch (error) {
            console.error('Get wrong questions error:', error);
            return [];
        }
    },
    
    async addWrongQuestion(question) {
        if (!await this.ensureInit()) return null;
        
        try {
            const { data, error } = await this.supabase
                .from('wrong_questions')
                .insert([this.cleanData(question)])
                .select()
                .maybeSingle();
            
            if (error) throw error;
            return data;
        } catch (error) {
            console.error('Add wrong question error:', error);
            throw error;
        }
    },
    
    async updateWrongQuestion(id, updates) {
        if (!await this.ensureInit()) return null;
        
        try {
            const { data, error } = await this.supabase
                .from('wrong_questions')
                .update(this.cleanData(updates))
                .eq('id', id)
                .select()
                .maybeSingle();
            
            if (error) throw error;
            return data;
        } catch (error) {
            console.error('Update wrong question error:', error);
            throw error;
        }
    },
    
    async deleteWrongQuestion(id) {
        if (!await this.ensureInit()) return false;
        
        try {
            const { error } = await this.supabase
                .from('wrong_questions')
                .delete()
                .eq('id', id);
            
            if (error) throw error;
            return true;
        } catch (error) {
            console.error('Delete wrong question error:', error);
            throw error;
        }
    },
    
    async getVocabulary() {
        if (!await this.ensureInit()) return [];
        
        try {
            const { data, error } = await this.supabase
                .from('vocabulary')
                .select('*');
            
            if (error) throw error;
            return data || [];
        } catch (error) {
            console.error('Get vocabulary error:', error);
            return [];
        }
    },
    
    async addVocabulary(word) {
        if (!await this.ensureInit()) return null;
        
        try {
            const { data, error } = await this.supabase
                .from('vocabulary')
                .insert([this.cleanData(word)])
                .select()
                .maybeSingle();
            
            if (error) throw error;
            return data;
        } catch (error) {
            console.error('Add vocabulary error:', error);
            throw error;
        }
    },
    
    async updateVocabulary(id, updates) {
        if (!await this.ensureInit()) return null;
        
        try {
            const { data, error } = await this.supabase
                .from('vocabulary')
                .update(this.cleanData(updates))
                .eq('id', id)
                .select()
                .maybeSingle();
            
            if (error) throw error;
            return data;
        } catch (error) {
            console.error('Update vocabulary error:', error);
            throw error;
        }
    },
    
    async deleteVocabulary(id) {
        if (!await this.ensureInit()) return false;
        
        try {
            const { error } = await this.supabase
                .from('vocabulary')
                .delete()
                .eq('id', id);
            
            if (error) throw error;
            return true;
        } catch (error) {
            console.error('Delete vocabulary error:', error);
            throw error;
        }
    },
    
    async getFileRecords() {
        if (!await this.ensureInit()) return [];
        
        try {
            const { data, error } = await this.supabase
                .from('file_records')
                .select('*');
            
            if (error) throw error;
            return data || [];
        } catch (error) {
            console.error('Get file records error:', error);
            return [];
        }
    },
    
    async addFileRecord(record) {
        if (!await this.ensureInit()) return null;
        
        try {
            const { data, error } = await this.supabase
                .from('file_records')
                .insert([this.cleanData(record)])
                .select()
                .maybeSingle();
            
            if (error) throw error;
            return data;
        } catch (error) {
            console.error('Add file record error:', error);
            throw error;
        }
    },
    
    async updateFileRecord(id, updates) {
        if (!await this.ensureInit()) return null;
        
        try {
            const { data, error } = await this.supabase
                .from('file_records')
                .update(this.cleanData(updates))
                .eq('id', id)
                .select()
                .maybeSingle();
            
            if (error) throw error;
            return data;
        } catch (error) {
            console.error('Update file record error:', error);
            throw error;
        }
    },
    
    async deleteFileRecord(id) {
        if (!await this.ensureInit()) return false;

        try {
            const { error } = await this.supabase
                .from('file_records')
                .delete()
                .eq('id', id);

            if (error) throw error;
            return true;
        } catch (error) {
            console.error('Delete file record error:', error);
            throw error;
        }
    },

    async getVotes() {
        if (!await this.ensureInit()) return [];

        try {
            const { data, error } = await this.supabase
                .from('votes')
                .select('*')
                .order('created_at', { ascending: false });

            if (error) throw error;
            return data || [];
        } catch (error) {
            console.error('Get votes error:', error);
            return [];
        }
    },

    async getVoteById(id) {
        if (!await this.ensureInit()) return null;

        try {
            const { data, error } = await this.supabase
                .from('votes')
                .select('*')
                .eq('id', id)
                .maybeSingle();

            if (error) throw error;
            return data;
        } catch (error) {
            console.error('Get vote by id error:', error);
            return null;
        }
    },

    async addVote(vote) {
        if (!await this.ensureInit()) return null;

        try {
            const { data, error } = await this.supabase
                .from('votes')
                .insert([this.cleanData(vote)])
                .select()
                .maybeSingle();

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
                .maybeSingle();

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

    async getNotifications() {
        if (!await this.ensureInit()) return [];

        try {
            const { data, error } = await this.supabase
                .from('notifications')
                .select('*')
                .order('created_at', { ascending: false });

            if (error) throw error;
            return this.convertKeysToCamelCase(data || []);
        } catch (error) {
            console.error('Get notifications error:', error);
            return [];
        }
    },

    async getNotificationById(id) {
        if (!await this.ensureInit()) return null;

        try {
            const { data, error } = await this.supabase
                .from('notifications')
                .select('*')
                .eq('id', id)
                .maybeSingle();

            if (error) throw error;
            return this.convertKeysToCamelCase(data);
        } catch (error) {
            console.error('Get notification by id error:', error);
            return null;
        }
    },

    async addNotification(notification) {
        if (!await this.ensureInit()) return null;

        try {
            const dataWithSnakeKeys = this.convertKeysToSnakeCase(notification);
            const { data, error } = await this.supabase
                .from('notifications')
                .insert([this.cleanData(dataWithSnakeKeys)])
                .select()
                .maybeSingle();

            if (error) throw error;
            return this.convertKeysToCamelCase(data);
        } catch (error) {
            console.error('Add notification error:', error);
            throw error;
        }
    },

    async updateNotification(id, updates) {
        if (!await this.ensureInit()) return null;

        try {
            const dataWithSnakeKeys = this.convertKeysToSnakeCase(updates);
            const { data, error } = await this.supabase
                .from('notifications')
                .update(this.cleanData(dataWithSnakeKeys))
                .eq('id', id)
                .select()
                .maybeSingle();

            if (error) throw error;
            return this.convertKeysToCamelCase(data);
        } catch (error) {
            console.error('Update notification error:', error);
            throw error;
        }
    },

    async deleteNotification(id) {
        if (!await this.ensureInit()) return false;

        try {
            const { error } = await this.supabase
                .from('notifications')
                .delete()
                .eq('id', id);

            if (error) throw error;
            return true;
        } catch (error) {
            console.error('Delete notification error:', error);
            throw error;
        }
    },

    async markNotificationAsRead(id) {
        if (!await this.ensureInit()) return null;

        try {
            const { data, error } = await this.supabase
                .from('notifications')
                .update({ read: true })
                .eq('id', id)
                .select()
                .maybeSingle();

            if (error) throw error;
            return this.convertKeysToCamelCase(data);
        } catch (error) {
            console.error('Mark notification as read error:', error);
            throw error;
        }
    },

    // 错题集相关方法
    async getWrongQuestionSets() {
        if (!await this.ensureInit()) return [];

        try {
            const { data, error } = await this.supabase
                .from('wrong_question_sets')
                .select('*')
                .order('created_at', { ascending: false });

            if (error) throw error;
            return this.convertKeysToCamelCase(data || []);
        } catch (error) {
            console.error('Get wrong question sets error:', error);
            return [];
        }
    },

    async createWrongQuestionSet(set) {
        if (!await this.ensureInit()) return null;

        try {
            const dataWithSnakeKeys = this.convertKeysToSnakeCase(set);
            const { data, error } = await this.supabase
                .from('wrong_question_sets')
                .insert([this.cleanData(dataWithSnakeKeys)])
                .select()
                .maybeSingle();

            if (error) throw error;
            return this.convertKeysToCamelCase(data);
        } catch (error) {
            console.error('Create wrong question set error:', error);
            throw error;
        }
    },

    async updateWrongQuestionSet(id, updates) {
        if (!await this.ensureInit()) return null;

        try {
            const dataWithSnakeKeys = this.convertKeysToSnakeCase(updates);
            const { data, error } = await this.supabase
                .from('wrong_question_sets')
                .update(this.cleanData(dataWithSnakeKeys))
                .eq('id', id)
                .select()
                .maybeSingle();

            if (error) throw error;
            return this.convertKeysToCamelCase(data);
        } catch (error) {
            console.error('Update wrong question set error:', error);
            throw error;
        }
    },

    async deleteWrongQuestionSet(id) {
        if (!await this.ensureInit()) return false;

        try {
            const { error } = await this.supabase
                .from('wrong_question_sets')
                .delete()
                .eq('id', id);

            if (error) throw error;
            return true;
        } catch (error) {
            console.error('Delete wrong question set error:', error);
            throw error;
        }
    },

    async addQuestionToSet(setId, questionId) {
        if (!await this.ensureInit()) return false;

        try {
            const { error } = await this.supabase
                .from('wrong_question_set_items')
                .insert([{
                    set_id: setId,
                    question_id: questionId
                }]);

            if (error) throw error;
            return true;
        } catch (error) {
            console.error('Add question to set error:', error);
            throw error;
        }
    },

    async removeQuestionFromSet(setId, questionId) {
        if (!await this.ensureInit()) return false;

        try {
            const { error } = await this.supabase
                .from('wrong_question_set_items')
                .delete()
                .eq('set_id', setId)
                .eq('question_id', questionId);

            if (error) throw error;
            return true;
        } catch (error) {
            console.error('Remove question from set error:', error);
            throw error;
        }
    },

    // 文件相关方法
    async getFiles(userId, path = '') {
        if (!await this.ensureInit()) return { folders: [], files: [] };

        try {
            let query = this.supabase
                .from('file_records')
                .select('*')
                .eq('user_id', userId);

            if (path) {
                query = query.eq('folder_path', path);
            }

            const { data, error } = await query.order('created_at', { ascending: false });

            if (error) throw error;

            const files = this.convertKeysToCamelCase(data || []);
            const folders = [];
            const regularFiles = [];

            files.forEach(file => {
                if (file.isFolder) {
                    folders.push(file);
                } else {
                    regularFiles.push(file);
                }
            });

            return { folders, files: regularFiles };
        } catch (error) {
            console.error('Get files error:', error);
            return { folders: [], files: [] };
        }
    },

    async createFile(file) {
        if (!await this.ensureInit()) return null;

        try {
            const dataWithSnakeKeys = this.convertKeysToSnakeCase(file);
            const { data, error } = await this.supabase
                .from('file_records')
                .insert([this.cleanData(dataWithSnakeKeys)])
                .select()
                .maybeSingle();

            if (error) throw error;
            return this.convertKeysToCamelCase(data);
        } catch (error) {
            console.error('Create file error:', error);
            throw error;
        }
    },

    async deleteFile(id) {
        if (!await this.ensureInit()) return false;

        try {
            const { error } = await this.supabase
                .from('file_records')
                .delete()
                .eq('id', id);

            if (error) throw error;
            return true;
        } catch (error) {
            console.error('Delete file error:', error);
            throw error;
        }
    },

    async getLotteries() {
        if (!await this.ensureInit()) return [];

        try {
            const { data, error } = await this.supabase
                .from('lotteries')
                .select('*')
                .order('created_at', { ascending: false });

            if (error) throw error;
            return data || [];
        } catch (error) {
            console.error('Get lotteries error:', error);
            return [];
        }
    },

    async getLotteryById(id) {
        if (!await this.ensureInit()) return null;

        try {
            const { data, error } = await this.supabase
                .from('lotteries')
                .select('*')
                .eq('id', id)
                .maybeSingle();

            if (error) throw error;
            return data;
        } catch (error) {
            console.error('Get lottery by id error:', error);
            return null;
        }
    },

    async addLottery(lottery) {
        if (!await this.ensureInit()) return null;

        try {
            const { data, error } = await this.supabase
                .from('lotteries')
                .insert([this.cleanData(lottery)])
                .select()
                .maybeSingle();

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
                .maybeSingle();

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

    async addLotteryRecord(record) {
        if (!await this.ensureInit()) return null;

        try {
            const { data, error } = await this.supabase
                .from('lottery_records')
                .insert([this.cleanData(record)])
                .select()
                .maybeSingle();

            if (error) throw error;
            return data;
        } catch (error) {
            console.error('Add lottery record error:', error);
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

    async addPasswordResetRequest(request) {
        if (!await this.ensureInit()) return null;

        try {
            const { data, error } = await this.supabase
                .from('password_reset_requests')
                .insert([this.cleanData(request)])
                .select()
                .maybeSingle();

            if (error) throw error;
            return data;
        } catch (error) {
            console.error('Add password reset request error:', error);
            throw error;
        }
    },

    async processPasswordResetRequest(id, processed) {
        if (!await this.ensureInit()) return null;

        try {
            const { data, error } = await this.supabase
                .from('password_reset_requests')
                .update({ status: processed ? 'processed' : 'rejected', processed_at: new Date().toISOString() })
                .eq('id', id)
                .select()
                .maybeSingle();

            if (error) throw error;
            return data;
        } catch (error) {
            console.error('Process password reset request error:', error);
            throw error;
        }
    },

    async getPermissionSettings() {
        if (!await this.ensureInit()) return {};

        try {
            const { data, error } = await this.supabase
                .from('permission_settings')
                .select('*')
                .maybeSingle();

            if (error) throw error;
            return data || {};
        } catch (error) {
            console.error('Get permission settings error:', error);
            return {};
        }
    },

    async savePermissionSettings(settings) {
        if (!await this.ensureInit()) return null;

        try {
            const existing = await this.getPermissionSettings();
            if (existing && existing.id) {
                const { data, error } = await this.supabase
                    .from('permission_settings')
                    .update(this.cleanData(settings))
                    .eq('id', existing.id)
                    .select()
                    .maybeSingle();
                if (error) throw error;
                return data;
            } else {
                const { data, error } = await this.supabase
                    .from('permission_settings')
                    .insert([this.cleanData(settings)])
                    .select()
                    .maybeSingle();
                if (error) throw error;
                return data;
            }
        } catch (error) {
            console.error('Save permission settings error:', error);
            throw error;
        }
    },

    async canView(module, permission) {
        const user = this.getCurrentUser();
        if (!user) return false;
        if (user.role === 'admin' || user.role === 'subAdmin') return true;
        const settings = await this.getPermissionSettings();
        if (settings[module] && settings[module][permission] !== undefined) {
            return settings[module][permission];
        }
        return false;
    },

    async getQuestionnaires() {
        if (!await this.ensureInit()) return [];

        try {
            const { data, error } = await this.supabase
                .from('questionnaires')
                .select('*')
                .order('created_at', { ascending: false });

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
                .maybeSingle();

            if (error) throw error;
            return data;
        } catch (error) {
            console.error('Get questionnaire by id error:', error);
            return null;
        }
    },

    async addQuestionnaire(questionnaire) {
        if (!await this.ensureInit()) return null;

        try {
            const { data, error } = await this.supabase
                .from('questionnaires')
                .insert([this.cleanData(questionnaire)])
                .select()
                .maybeSingle();

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
                .maybeSingle();

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
                .select('*');

            if (error) throw error;
            return data || [];
        } catch (error) {
            console.error('Get questionnaire records error:', error);
            return [];
        }
    },

    async addQuestionnaireRecord(record) {
        if (!await this.ensureInit()) return null;

        try {
            const { data, error } = await this.supabase
                .from('questionnaire_records')
                .insert([this.cleanData(record)])
                .select()
                .maybeSingle();

            if (error) throw error;
            return data;
        } catch (error) {
            console.error('Add questionnaire record error:', error);
            throw error;
        }
    },

    async getSettings() {
        if (!await this.ensureInit()) return {};

        try {
            const { data, error } = await this.supabase
                .from('settings')
                .select('*')
                .maybeSingle();

            if (error) throw error;
            return data || {};
        } catch (error) {
            console.error('Get settings error:', error);
            return {};
        }
    },

    async saveSettings(settings) {
        if (!await this.ensureInit()) return null;

        try {
            const existing = await this.getSettings();
            if (existing && existing.id) {
                const { data, error } = await this.supabase
                    .from('settings')
                    .update(this.cleanData(settings))
                    .eq('id', existing.id)
                    .select()
                    .maybeSingle();
                if (error) throw error;
                return data;
            } else {
                const { data, error } = await this.supabase
                    .from('settings')
                    .insert([this.cleanData(settings)])
                    .select()
                    .maybeSingle();
                if (error) throw error;
                return data;
            }
        } catch (error) {
            console.error('Save settings error:', error);
            throw error;
        }
    },

    async markNotificationRead(id) {
        if (!await this.ensureInit()) return null;

        try {
            const { data, error } = await this.supabase
                .from('notifications')
                .update({ read: true })
                .eq('id', id)
                .select()
                .maybeSingle();

            if (error) throw error;
            return data;
        } catch (error) {
            console.error('Mark notification read error:', error);
            throw error;
        }
    },

    async getWrongQuestions() {
        if (!await this.ensureInit()) return [];

        try {
            const { data, error } = await this.supabase
                .from('wrong_questions')
                .select('*');

            if (error) throw error;
            return data || [];
        } catch (error) {
            console.error('Get wrong questions error:', error);
            return [];
        }
    },

    async addWrongQuestion(question) {
        if (!await this.ensureInit()) return null;

        try {
            const { data, error } = await this.supabase
                .from('wrong_questions')
                .insert([this.cleanData(question)])
                .select()
                .maybeSingle();

            if (error) throw error;
            return data;
        } catch (error) {
            console.error('Add wrong question error:', error);
            throw error;
        }
    },

    async updateWrongQuestion(id, updates) {
        if (!await this.ensureInit()) return null;

        try {
            const { data, error } = await this.supabase
                .from('wrong_questions')
                .update(this.cleanData(updates))
                .eq('id', id)
                .select()
                .maybeSingle();

            if (error) throw error;
            return data;
        } catch (error) {
            console.error('Update wrong question error:', error);
            throw error;
        }
    },

    async deleteWrongQuestion(id) {
        if (!await this.ensureInit()) return false;

        try {
            const { error } = await this.supabase
                .from('wrong_questions')
                .delete()
                .eq('id', id);

            if (error) throw error;
            return true;
        } catch (error) {
            console.error('Delete wrong question error:', error);
            throw error;
        }
    },

    async getWrongQuestionSets() {
        if (!await this.ensureInit()) return [];

        try {
            const { data, error } = await this.supabase
                .from('wrong_question_sets')
                .select('*')
                .order('created_at', { ascending: false });

            if (error) throw error;
            return data || [];
        } catch (error) {
            console.error('Get wrong question sets error:', error);
            return [];
        }
    },

    async createWrongQuestionSet(set) {
        if (!await this.ensureInit()) return null;

        try {
            const { data, error } = await this.supabase
                .from('wrong_question_sets')
                .insert([this.cleanData(set)])
                .select()
                .maybeSingle();

            if (error) throw error;
            return data;
        } catch (error) {
            console.error('Create wrong question set error:', error);
            throw error;
        }
    },

    async updateWrongQuestionSet(id, updates) {
        if (!await this.ensureInit()) return null;

        try {
            const { data, error } = await this.supabase
                .from('wrong_question_sets')
                .update(this.cleanData(updates))
                .eq('id', id)
                .select()
                .maybeSingle();

            if (error) throw error;
            return data;
        } catch (error) {
            console.error('Update wrong question set error:', error);
            throw error;
        }
    },

    async deleteWrongQuestionSet(id) {
        if (!await this.ensureInit()) return false;

        try {
            const { error } = await this.supabase
                .from('wrong_question_sets')
                .delete()
                .eq('id', id);

            if (error) throw error;
            return true;
        } catch (error) {
            console.error('Delete wrong question set error:', error);
            throw error;
        }
    },

    async addQuestionToSet(setId, questionId) {
        if (!await this.ensureInit()) return false;

        try {
            const { error } = await this.supabase
                .from('wrong_question_set_items')
                .insert([{ set_id: setId, question_id: questionId }]);

            if (error) throw error;
            return true;
        } catch (error) {
            console.error('Add question to set error:', error);
            throw error;
        }
    },

    async removeQuestionFromSet(setId, questionId) {
        if (!await this.ensureInit()) return false;

        try {
            const { error } = await this.supabase
                .from('wrong_question_set_items')
                .delete()
                .eq('set_id', setId)
                .eq('question_id', questionId);

            if (error) throw error;
            return true;
        } catch (error) {
            console.error('Remove question from set error:', error);
            throw error;
        }
    },

    async getQuestionTypes() {
        if (!await this.ensureInit()) return [];

        try {
            const { data, error } = await this.supabase
                .from('question_types')
                .select('*');

            if (error) throw error;
            return data || [];
        } catch (error) {
            console.error('Get question types error:', error);
            return [];
        }
    },

    async addQuestionType(type) {
        if (!await this.ensureInit()) return null;

        try {
            const { data, error } = await this.supabase
                .from('question_types')
                .insert([this.cleanData(type)])
                .select()
                .maybeSingle();

            if (error) throw error;
            return data;
        } catch (error) {
            console.error('Add question type error:', error);
            throw error;
        }
    },

    async updateQuestionType(id, updates) {
        if (!await this.ensureInit()) return null;

        try {
            const { data, error } = await this.supabase
                .from('question_types')
                .update(this.cleanData(updates))
                .eq('id', id)
                .select()
                .maybeSingle();

            if (error) throw error;
            return data;
        } catch (error) {
            console.error('Update question type error:', error);
            throw error;
        }
    },

    async deleteQuestionType(id) {
        if (!await this.ensureInit()) return false;

        try {
            const { error } = await this.supabase
                .from('question_types')
                .delete()
                .eq('id', id);

            if (error) throw error;
            return true;
        } catch (error) {
            console.error('Delete question type error:', error);
            throw error;
        }
    },

    async getKnowledgePoints() {
        if (!await this.ensureInit()) return [];

        try {
            const { data, error } = await this.supabase
                .from('knowledge_points')
                .select('*');

            if (error) throw error;
            return data || [];
        } catch (error) {
            console.error('Get knowledge points error:', error);
            return [];
        }
    },

    async addKnowledgePoint(kp) {
        if (!await this.ensureInit()) return null;

        try {
            const { data, error } = await this.supabase
                .from('knowledge_points')
                .insert([this.cleanData(kp)])
                .select()
                .maybeSingle();

            if (error) throw error;
            return data;
        } catch (error) {
            console.error('Add knowledge point error:', error);
            throw error;
        }
    },

    async updateKnowledgePoint(id, updates) {
        if (!await this.ensureInit()) return null;

        try {
            const { data, error } = await this.supabase
                .from('knowledge_points')
                .update(this.cleanData(updates))
                .eq('id', id)
                .select()
                .maybeSingle();

            if (error) throw error;
            return data;
        } catch (error) {
            console.error('Update knowledge point error:', error);
            throw error;
        }
    },

    async deleteKnowledgePoint(id) {
        if (!await this.ensureInit()) return false;

        try {
            const { error } = await this.supabase
                .from('knowledge_points')
                .delete()
                .eq('id', id);

            if (error) throw error;
            return true;
        } catch (error) {
            console.error('Delete knowledge point error:', error);
            throw error;
        }
    },

    async getVocabulary() {
        if (!await this.ensureInit()) return [];

        try {
            const { data, error } = await this.supabase
                .from('vocabulary')
                .select('*');

            if (error) throw error;
            return data || [];
        } catch (error) {
            console.error('Get vocabulary error:', error);
            return [];
        }
    },

    async addVocabulary(word) {
        if (!await this.ensureInit()) return null;

        try {
            const { data, error } = await this.supabase
                .from('vocabulary')
                .insert([this.cleanData(word)])
                .select()
                .maybeSingle();

            if (error) throw error;
            return data;
        } catch (error) {
            console.error('Add vocabulary error:', error);
            throw error;
        }
    },

    async updateVocabulary(id, updates) {
        if (!await this.ensureInit()) return null;

        try {
            const { data, error } = await this.supabase
                .from('vocabulary')
                .update(this.cleanData(updates))
                .eq('id', id)
                .select()
                .maybeSingle();

            if (error) throw error;
            return data;
        } catch (error) {
            console.error('Update vocabulary error:', error);
            throw error;
        }
    },

    async deleteVocabulary(id) {
        if (!await this.ensureInit()) return false;

        try {
            const { error } = await this.supabase
                .from('vocabulary')
                .delete()
                .eq('id', id);

            if (error) throw error;
            return true;
        } catch (error) {
            console.error('Delete vocabulary error:', error);
            throw error;
        }
    },

    async getFileRecords() {
        if (!await this.ensureInit()) return [];

        try {
            const { data, error } = await this.supabase
                .from('file_records')
                .select('*');

            if (error) throw error;
            return data || [];
        } catch (error) {
            console.error('Get file records error:', error);
            return [];
        }
    },

    async addFileRecord(record) {
        if (!await this.ensureInit()) return null;

        try {
            const { data, error } = await this.supabase
                .from('file_records')
                .insert([this.cleanData(record)])
                .select()
                .maybeSingle();

            if (error) throw error;
            return data;
        } catch (error) {
            console.error('Add file record error:', error);
            throw error;
        }
    },

    async updateFileRecord(id, updates) {
        if (!await this.ensureInit()) return null;

        try {
            const { data, error } = await this.supabase
                .from('file_records')
                .update(this.cleanData(updates))
                .eq('id', id)
                .select()
                .maybeSingle();

            if (error) throw error;
            return data;
        } catch (error) {
            console.error('Update file record error:', error);
            throw error;
        }
    },

    async deleteFileRecord(id) {
        if (!await this.ensureInit()) return false;

        try {
            const { error } = await this.supabase
                .from('file_records')
                .delete()
                .eq('id', id);

            if (error) throw error;
            return true;
        } catch (error) {
            console.error('Delete file record error:', error);
            throw error;
        }
    }
};