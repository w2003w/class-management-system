const AdvancedDataService = {
    initialized: false,
    supabase: null,
    
    async init() {
        if (this.initialized) return;
        
        try {
            this.supabase = window.supabase;
            this.initialized = true;
            console.log('[AdvancedDataService] 高级数据服务初始化完成');
        } catch (error) {
            console.error('[AdvancedDataService] 初始化失败:', error);
            throw error;
        }
    },

    async retryWithBackoff(operation, maxRetries = 5, baseDelay = 1000) {
        let retries = 0;
        let delay = baseDelay;
        
        while (retries < maxRetries) {
            try {
                return await operation();
            } catch (error) {
                retries++;
                if (retries >= maxRetries) {
                    console.error(`[AdvancedDataService] 操作失败，已重试 ${maxRetries} 次`, error);
                    throw error;
                }
                
                console.warn(`[AdvancedDataService] 操作失败，第 ${retries} 次重试，等待 ${delay}ms`);
                await new Promise(resolve => setTimeout(resolve, delay));
                delay *= 2;
            }
        }
    },

    async logOperation(operationName, operation) {
        const startTime = Date.now();
        console.log(`[AdvancedDataService] 开始操作: ${operationName}`);
        
        try {
            const result = await operation();
            const duration = Date.now() - startTime;
            console.log(`[AdvancedDataService] 操作完成: ${operationName}, 耗时: ${duration}ms`);
            return result;
        } catch (error) {
            const duration = Date.now() - startTime;
            console.error(`[AdvancedDataService] 操作失败: ${operationName}, 耗时: ${duration}ms, 错误:`, error);
            throw error;
        }
    },

    // ========== 用户管理 ==========
    async getUsers(filters = {}) {
        return await this.logOperation('getUsers', async () => {
            return await this.retryWithBackoff(async () => {
                let query = this.supabase.from('users').select('*');
                
                if (filters.role) {
                    query = query.eq('role', filters.role);
                }
                if (filters.status) {
                    query = query.eq('status', filters.status);
                }
                if (filters.search) {
                    query = query.or(`username.ilike.%${filters.search}%,email.ilike.%${filters.search}%`);
                }
                
                const { data, error } = await query.order('created_at', { ascending: false });
                if (error) throw error;
                return data || [];
            });
        });
    },

    async getUserById(userId) {
        return await this.logOperation('getUserById', async () => {
            return await this.retryWithBackoff(async () => {
                const { data, error } = await this.supabase
                    .from('users')
                    .select('*')
                    .eq('id', userId)
                    .maybeSingle();
                if (error) throw error;
                return data;
            });
        });
    },

    async getUserByEmail(email) {
        return await this.logOperation('getUserByEmail', async () => {
            return await this.retryWithBackoff(async () => {
                const { data, error } = await this.supabase
                    .from('users')
                    .select('*')
                    .eq('email', email)
                    .maybeSingle();
                if (error) throw error;
                return data;
            });
        });
    },

    async createUser(userData) {
        return await this.logOperation('createUser', async () => {
            return await this.retryWithBackoff(async () => {
                const { data, error } = await this.supabase
                    .from('users')
                    .insert({
                        id: userData.id || crypto.randomUUID(),
                        username: userData.username,
                        email: userData.email,
                        password: userData.password,
                        role: userData.role || 'member',
                        status: userData.status || 'active',
                        department: userData.department,
                        class_name: userData.class_name,
                        created_at: new Date().toISOString()
                    })
                    .select()
                    .maybeSingle();
                if (error) throw error;
                return data;
            });
        });
    },

    async updateUser(userId, updates) {
        return await this.logOperation('updateUser', async () => {
            return await this.retryWithBackoff(async () => {
                const { data, error } = await this.supabase
                    .from('users')
                    .update(updates)
                    .eq('id', userId)
                    .select()
                    .maybeSingle();
                if (error) throw error;
                return data;
            });
        });
    },

    async deleteUser(userId) {
        return await this.logOperation('deleteUser', async () => {
            return await this.retryWithBackoff(async () => {
                const { error } = await this.supabase
                    .from('users')
                    .delete()
                    .eq('id', userId);
                if (error) throw error;
                return true;
            });
        });
    },

    async getUserStats() {
        return await this.logOperation('getUserStats', async () => {
            return await this.retryWithBackoff(async () => {
                const [total, active, admins, members] = await Promise.all([
                    this.supabase.from('users').select('id', { count: 'exact', head: true }),
                    this.supabase.from('users').select('id', { count: 'exact', head: true }).eq('status', 'active'),
                    this.supabase.from('users').select('id', { count: 'exact', head: true }).eq('role', 'admin'),
                    this.supabase.from('users').select('id', { count: 'exact', head: true }).eq('role', 'member')
                ]);
                
                return {
                    total: total.count || 0,
                    active: active.count || 0,
                    admins: admins.count || 0,
                    members: members.count || 0
                };
            });
        });
    },

    // ========== 签到管理 ==========
    async getAttendances(filters = {}) {
        return await this.logOperation('getAttendances', async () => {
            return await this.retryWithBackoff(async () => {
                let query = this.supabase.from('attendances').select('*');
                
                if (filters.type) {
                    query = query.eq('type', filters.type);
                }
                if (filters.status) {
                    const now = new Date().toISOString();
                    if (filters.status === 'active') {
                        query = query.lte('start_time', now).gte('end_time', now);
                    } else if (filters.status === 'upcoming') {
                        query = query.gt('start_time', now);
                    } else if (filters.status === 'ended') {
                        query = query.lt('end_time', now);
                    }
                }
                
                const { data, error } = await query.order('start_time', { ascending: false });
                if (error) throw error;
                return data || [];
            });
        });
    },

    async getAttendanceById(attendanceId) {
        return await this.logOperation('getAttendanceById', async () => {
            return await this.retryWithBackoff(async () => {
                const { data, error } = await this.supabase
                    .from('attendances')
                    .select('*')
                    .eq('id', attendanceId)
                    .maybeSingle();
                if (error) throw error;
                return data;
            });
        });
    },

    async createAttendance(attendanceData) {
        return await this.logOperation('createAttendance', async () => {
            return await this.retryWithBackoff(async () => {
                const { data, error } = await this.supabase
                    .from('attendances')
                    .insert({
                        id: attendanceData.id || crypto.randomUUID(),
                        name: attendanceData.name,
                        type: attendanceData.type || 'normal',
                        scope: attendanceData.scope || 'all',
                        location_name: attendanceData.locationName,
                        latitude: attendanceData.latitude,
                        longitude: attendanceData.longitude,
                        range_meters: attendanceData.rangeMeters || 50,
                        group_id: attendanceData.groupId,
                        member_ids: attendanceData.memberIds || [],
                        start_time: attendanceData.startTime,
                        end_time: attendanceData.endTime,
                        repeat_type: attendanceData.repeatType,
                        daily_start_time: attendanceData.dailyStartTime,
                        daily_end_time: attendanceData.dailyEndTime,
                        weekdays: attendanceData.weekDays || [],
                        created_at: new Date().toISOString(),
                        created_by: attendanceData.createdBy
                    })
                    .select()
                    .maybeSingle();
                if (error) throw error;
                return data;
            });
        });
    },

    async updateAttendance(attendanceId, updates) {
        return await this.logOperation('updateAttendance', async () => {
            return await this.retryWithBackoff(async () => {
                const { data, error } = await this.supabase
                    .from('attendances')
                    .update(updates)
                    .eq('id', attendanceId)
                    .select()
                    .maybeSingle();
                if (error) throw error;
                return data;
            });
        });
    },

    async deleteAttendance(attendanceId) {
        return await this.logOperation('deleteAttendance', async () => {
            return await this.retryWithBackoff(async () => {
                const { error } = await this.supabase
                    .from('attendances')
                    .delete()
                    .eq('id', attendanceId);
                if (error) throw error;
                return true;
            });
        });
    },

    async getAttendanceRecords(filters = {}) {
        return await this.logOperation('getAttendanceRecords', async () => {
            return await this.retryWithBackoff(async () => {
                let query = this.supabase.from('attendance_records').select('*');
                
                if (filters.userId) {
                    query = query.eq('user_id', filters.userId);
                }
                if (filters.attendanceId) {
                    query = query.eq('attendance_id', filters.attendanceId);
                }
                if (filters.status) {
                    query = query.eq('status', filters.status);
                }
                
                const { data, error } = await query.order('created_at', { ascending: false });
                if (error) throw error;
                return data || [];
            });
        });
    },

    async createAttendanceRecord(recordData) {
        return await this.logOperation('createAttendanceRecord', async () => {
            return await this.retryWithBackoff(async () => {
                const { data, error } = await this.supabase
                    .from('attendance_records')
                    .insert({
                        id: recordData.id || crypto.randomUUID(),
                        attendance_id: recordData.attendanceId,
                        user_id: recordData.userId,
                        latitude: recordData.latitude,
                        longitude: recordData.longitude,
                        accuracy: recordData.accuracy,
                        provider: recordData.provider,
                        address: recordData.address,
                        status: recordData.status || 'success',
                        created_at: new Date().toISOString()
                    })
                    .select()
                    .maybeSingle();
                if (error) throw error;
                return data;
            });
        });
    },

    // ========== 错题管理 ==========
    async getSubjects() {
        return await this.logOperation('getSubjects', async () => {
            return await this.retryWithBackoff(async () => {
                const { data, error } = await this.supabase
                    .from('subjects')
                    .select('*')
                    .order('name');
                if (error) throw error;
                return data || [];
            });
        });
    },

    async createSubject(subjectData) {
        return await this.logOperation('createSubject', async () => {
            return await this.retryWithBackoff(async () => {
                const { data, error } = await this.supabase
                    .from('subjects')
                    .insert({
                        id: subjectData.id || crypto.randomUUID(),
                        name: subjectData.name,
                        color: subjectData.color || '#3B82F6',
                        created_at: new Date().toISOString()
                    })
                    .select()
                    .maybeSingle();
                if (error) throw error;
                return data;
            });
        });
    },

    async updateSubject(subjectId, updates) {
        return await this.logOperation('updateSubject', async () => {
            return await this.retryWithBackoff(async () => {
                const { data, error } = await this.supabase
                    .from('subjects')
                    .update(updates)
                    .eq('id', subjectId)
                    .select();
                if (error) throw error;
                return data && data.length > 0 ? data[0] : null;
            });
        });
    },

    async deleteSubject(subjectId) {
        return await this.logOperation('deleteSubject', async () => {
            return await this.retryWithBackoff(async () => {
                await this.supabase.from('knowledge_points').delete().eq('subject_id', subjectId);
                await this.supabase.from('wrong_questions').delete().eq('subject_id', subjectId);
                
                const { error } = await this.supabase
                    .from('subjects')
                    .delete()
                    .eq('id', subjectId);
                if (error) throw error;
                return true;
            });
        });
    },

    async getQuestionTypes() {
        return await this.logOperation('getQuestionTypes', async () => {
            return await this.retryWithBackoff(async () => {
                const { data, error } = await this.supabase
                    .from('question_types')
                    .select('*')
                    .order('name');
                if (error) throw error;
                return data || [];
            });
        });
    },

    async createQuestionType(typeData) {
        return await this.logOperation('createQuestionType', async () => {
            return await this.retryWithBackoff(async () => {
                const { data, error } = await this.supabase
                    .from('question_types')
                    .insert({
                        id: typeData.id || crypto.randomUUID(),
                        name: typeData.name,
                        created_at: new Date().toISOString()
                    })
                    .select()
                    .maybeSingle();
                if (error) throw error;
                return data;
            });
        });
    },

    async updateQuestionType(typeId, updates) {
        return await this.logOperation('updateQuestionType', async () => {
            return await this.retryWithBackoff(async () => {
                const { data, error } = await this.supabase
                    .from('question_types')
                    .update(updates)
                    .eq('id', typeId)
                    .select();
                if (error) throw error;
                return data && data.length > 0 ? data[0] : null;
            });
        });
    },

    async deleteQuestionType(typeId) {
        return await this.logOperation('deleteQuestionType', async () => {
            return await this.retryWithBackoff(async () => {
                await this.supabase.from('wrong_questions').delete().eq('type_id', typeId);
                
                const { error } = await this.supabase
                    .from('question_types')
                    .delete()
                    .eq('id', typeId);
                if (error) throw error;
                return true;
            });
        });
    },

    async getKnowledgePoints(filters = {}) {
        return await this.logOperation('getKnowledgePoints', async () => {
            return await this.retryWithBackoff(async () => {
                let query = this.supabase.from('knowledge_points').select('*');
                
                if (filters.subjectId) {
                    query = query.eq('subject_id', filters.subjectId);
                }
                
                const { data, error } = await query.order('name');
                if (error) throw error;
                return data || [];
            });
        });
    },

    async createKnowledgePoint(pointData) {
        return await this.logOperation('createKnowledgePoint', async () => {
            return await this.retryWithBackoff(async () => {
                const { data, error } = await this.supabase
                    .from('knowledge_points')
                    .insert({
                        id: pointData.id || crypto.randomUUID(),
                        name: pointData.name,
                        subject_id: pointData.subject_id,
                        created_at: new Date().toISOString()
                    })
                    .select()
                    .maybeSingle();
                if (error) throw error;
                return data;
            });
        });
    },

    async updateKnowledgePoint(pointId, updates) {
        return await this.logOperation('updateKnowledgePoint', async () => {
            return await this.retryWithBackoff(async () => {
                const { data, error } = await this.supabase
                    .from('knowledge_points')
                    .update(updates)
                    .eq('id', pointId)
                    .select();
                if (error) throw error;
                return data && data.length > 0 ? data[0] : null;
            });
        });
    },

    async deleteKnowledgePoint(pointId) {
        return await this.logOperation('deleteKnowledgePoint', async () => {
            return await this.retryWithBackoff(async () => {
                await this.supabase.from('wrong_questions').delete().eq('knowledge_id', pointId);
                
                const { error } = await this.supabase
                    .from('knowledge_points')
                    .delete()
                    .eq('id', pointId);
                if (error) throw error;
                return true;
            });
        });
    },

    async getWrongQuestions(filters = {}) {
        return await this.logOperation('getWrongQuestions', async () => {
            return await this.retryWithBackoff(async () => {
                let query = this.supabase.from('wrong_questions').select('*');
                
                if (filters.userId) {
                    query = query.eq('user_id', filters.userId);
                }
                if (filters.subjectId) {
                    query = query.eq('subject_id', filters.subjectId);
                }
                if (filters.typeId) {
                    query = query.eq('type_id', filters.typeId);
                }
                if (filters.knowledgeId) {
                    query = query.eq('knowledge_id', filters.knowledgeId);
                }
                if (filters.mastered !== undefined) {
                    query = query.eq('mastered', filters.mastered);
                }
                
                const { data, error } = await query.order('created_at', { ascending: false });
                if (error) throw error;
                return data || [];
            });
        });
    },

    async getWrongQuestionById(questionId) {
        return await this.logOperation('getWrongQuestionById', async () => {
            return await this.retryWithBackoff(async () => {
                const { data, error } = await this.supabase
                    .from('wrong_questions')
                    .select('*')
                    .eq('id', questionId)
                    .maybeSingle();
                if (error) throw error;
                return data;
            });
        });
    },

    async createWrongQuestion(questionData) {
        return await this.logOperation('createWrongQuestion', async () => {
            return await this.retryWithBackoff(async () => {
                const { data, error } = await this.supabase
                    .from('wrong_questions')
                    .insert({
                        id: questionData.id || crypto.randomUUID(),
                        subject_id: questionData.subjectId,
                        type_id: questionData.typeId,
                        knowledge_id: questionData.knowledgeId,
                        content: questionData.content,
                        image_data: questionData.imageData,
                        options: questionData.options || [],
                        answer: questionData.answer,
                        my_answer: questionData.myAnswer,
                        analysis: questionData.analysis,
                        wrong_count: questionData.wrongCount || 1,
                        user_id: questionData.userId,
                        created_at: new Date().toISOString(),
                        last_reviewed_at: null,
                        next_review_at: this.calculateNextReviewDate(1),
                        mastered: false
                    })
                    .select()
                    .maybeSingle();
                if (error) throw error;
                return data;
            });
        });
    },

    async updateWrongQuestion(questionId, updates) {
        return await this.logOperation('updateWrongQuestion', async () => {
            return await this.retryWithBackoff(async () => {
                const { data, error } = await this.supabase
                    .from('wrong_questions')
                    .update(updates)
                    .eq('id', questionId)
                    .select();
                if (error) throw error;
                return data && data.length > 0 ? data[0] : null;
            });
        });
    },

    async deleteWrongQuestion(questionId) {
        return await this.logOperation('deleteWrongQuestion', async () => {
            return await this.retryWithBackoff(async () => {
                const { error } = await this.supabase
                    .from('wrong_questions')
                    .delete()
                    .eq('id', questionId);
                if (error) throw error;
                return true;
            });
        });
    },

    calculateNextReviewDate(wrongCount) {
        const intervals = [1, 2, 4, 7, 14, 21, 30, 45, 60];
        const index = Math.min(wrongCount - 1, intervals.length - 1);
        const daysToAdd = intervals[index];
        const nextDate = new Date();
        nextDate.setDate(nextDate.getDate() + daysToAdd);
        return nextDate.toISOString();
    },

    // ========== 词汇管理 ==========
    async getVocabulary(filters = {}) {
        return await this.logOperation('getVocabulary', async () => {
            return await this.retryWithBackoff(async () => {
                let query = this.supabase.from('vocabulary').select('*');
                
                if (filters.userId) {
                    query = query.eq('user_id', filters.userId);
                }
                if (filters.mastered !== undefined) {
                    query = query.eq('mastered', filters.mastered);
                }
                
                const { data, error } = await query.order('created_at', { ascending: false });
                if (error) throw error;
                return data || [];
            });
        });
    },

    async createVocabulary(vocabData) {
        return await this.logOperation('createVocabulary', async () => {
            return await this.retryWithBackoff(async () => {
                const { data, error } = await this.supabase
                    .from('vocabulary')
                    .insert({
                        id: vocabData.id || crypto.randomUUID(),
                        word: vocabData.word,
                        phonetic: vocabData.phonetic,
                        meaning: vocabData.meaning,
                        example: vocabData.example,
                        user_id: vocabData.userId,
                        wrong_count: 0,
                        last_reviewed_at: null,
                        next_review_at: new Date().toISOString(),
                        mastered: false,
                        created_at: new Date().toISOString()
                    })
                    .select()
                    .maybeSingle();
                if (error) throw error;
                return data;
            });
        });
    },

    async updateVocabulary(vocabId, updates) {
        return await this.logOperation('updateVocabulary', async () => {
            return await this.retryWithBackoff(async () => {
                const { data, error } = await this.supabase
                    .from('vocabulary')
                    .update(updates)
                    .eq('id', vocabId)
                    .select();
                if (error) throw error;
                return data && data.length > 0 ? data[0] : null;
            });
        });
    },

    async deleteVocabulary(vocabId) {
        return await this.logOperation('deleteVocabulary', async () => {
            return await this.retryWithBackoff(async () => {
                const { error } = await this.supabase
                    .from('vocabulary')
                    .delete()
                    .eq('id', vocabId);
                if (error) throw error;
                return true;
            });
        });
    },

    // ========== 考试管理 ==========
    async getExams(filters = {}) {
        return await this.logOperation('getExams', async () => {
            return await this.retryWithBackoff(async () => {
                let query = this.supabase.from('exams').select('*');
                
                if (filters.userId) {
                    query = query.eq('created_by', filters.userId);
                }
                
                const { data, error } = await query.order('created_at', { ascending: false });
                if (error) throw error;
                return data || [];
            });
        });
    },

    async createExam(examData) {
        return await this.logOperation('createExam', async () => {
            return await this.retryWithBackoff(async () => {
                const { data, error } = await this.supabase
                    .from('exams')
                    .insert({
                        id: examData.id || crypto.randomUUID(),
                        name: examData.name,
                        subject_id: examData.subjectId,
                        questions: examData.questions || [],
                        total_score: examData.totalScore || 100,
                        duration: examData.duration || 60,
                        created_by: examData.createdBy,
                        created_at: new Date().toISOString()
                    })
                    .select()
                    .maybeSingle();
                if (error) throw error;
                return data;
            });
        });
    },

    // ========== 文件管理 ==========
    async getFiles(filters = {}) {
        return await this.logOperation('getFiles', async () => {
            return await this.retryWithBackoff(async () => {
                let query = this.supabase.from('files').select('*');
                
                if (filters.userId) {
                    query = query.eq('user_id', filters.userId);
                }
                if (filters.folderId) {
                    query = query.eq('folder_id', filters.folderId);
                }
                
                const { data, error } = await query.order('created_at', { ascending: false });
                if (error) throw error;
                return data || [];
            });
        });
    },

    async createFile(fileData) {
        return await this.logOperation('createFile', async () => {
            return await this.retryWithBackoff(async () => {
                const { data, error } = await this.supabase
                    .from('files')
                    .insert({
                        id: fileData.id || crypto.randomUUID(),
                        name: fileData.name,
                        url: fileData.url,
                        size: fileData.size,
                        type: fileData.type,
                        folder_id: fileData.folderId,
                        user_id: fileData.userId,
                        created_at: new Date().toISOString()
                    })
                    .select()
                    .maybeSingle();
                if (error) throw error;
                return data;
            });
        });
    },

    async deleteFile(fileId) {
        return await this.logOperation('deleteFile', async () => {
            return await this.retryWithBackoff(async () => {
                const { error } = await this.supabase
                    .from('files')
                    .delete()
                    .eq('id', fileId);
                if (error) throw error;
                return true;
            });
        });
    },

    // ========== 统计数据 ==========
    async getDashboardStats(userId = null) {
        return await this.logOperation('getDashboardStats', async () => {
            return await this.retryWithBackoff(async () => {
                const now = new Date();
                const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate()).toISOString();
                const todayEnd = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1).toISOString();
                
                const [userStats, attendanceStats, examStats, voteStats, todayCheckIns] = await Promise.all([
                    this.getUserStats(),
                    this.supabase.from('attendances').select('id', { count: 'exact', head: true }),
                    this.supabase.from('exams').select('id', { count: 'exact', head: true }),
                    this.supabase.from('votes').select('id', { count: 'exact', head: true }).catch(() => ({ count: 0 })),
                    this.supabase.from('attendance_records').select('id', { count: 'exact', head: true })
                        .gte('created_at', todayStart)
                        .lte('created_at', todayEnd)
                ]);
                
                return {
                    users: userStats,
                    totalAttendances: attendanceStats.count || 0,
                    totalExams: examStats.count || 0,
                    totalVotes: voteStats.count || 0,
                    todayCheckIns: todayCheckIns.count || 0
                };
            });
        });
    },

    async getAttendanceChartData(days = 7) {
        return await this.logOperation('getAttendanceChartData', async () => {
            return await this.retryWithBackoff(async () => {
                const result = [];
                const today = new Date();
                
                for (let i = days - 1; i >= 0; i--) {
                    const date = new Date(today);
                    date.setDate(date.getDate() - i);
                    const dateStr = date.toISOString().split('T')[0];
                    
                    const { count } = await this.supabase
                        .from('attendance_records')
                        .select('id', { count: 'exact', head: true })
                        .gte('created_at', `${dateStr}T00:00:00`)
                        .lte('created_at', `${dateStr}T23:59:59`);
                    
                    result.push({
                        date: `${date.getMonth() + 1}/${date.getDate()}`,
                        count: count || 0
                    });
                }
                
                return result;
            });
        });
    },

    // ========== 工具方法 ==========
    cleanData(data) {
        const cleaned = {};
        for (const [key, value] of Object.entries(data)) {
            if (value !== undefined && value !== null && value !== '') {
                cleaned[key] = value;
            }
        }
        return cleaned;
    },

    formatDate(dateStr) {
        if (!dateStr) return '-';
        const date = new Date(dateStr);
        return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
    },

    formatDateTime(dateStr) {
        if (!dateStr) return '-';
        const date = new Date(dateStr);
        return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')} ${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`;
    }
};

window.AdvancedDataService = AdvancedDataService;