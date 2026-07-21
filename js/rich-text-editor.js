const RichTextEditor = {
    initialized: false,
    editors: new Map(),
    toolbarButtons: [
        { id: 'bold', icon: 'fa-bold', title: '粗体', action: 'bold' },
        { id: 'italic', icon: 'fa-italic', title: '斜体', action: 'italic' },
        { id: 'underline', icon: 'fa-underline', title: '下划线', action: 'underline' },
        { id: 'strikethrough', icon: 'fa-strikethrough', title: '删除线', action: 'strikeThrough' },
        { id: 'separator1', type: 'separator' },
        { id: 'heading1', icon: 'fa-header', title: '标题1', action: 'formatBlock', value: 'h1' },
        { id: 'heading2', icon: 'fa-header', title: '标题2', action: 'formatBlock', value: 'h2' },
        { id: 'heading3', icon: 'fa-header', title: '标题3', action: 'formatBlock', value: 'h3' },
        { id: 'separator2', type: 'separator' },
        { id: 'bulletList', icon: 'fa-list-ul', title: '无序列表', action: 'insertUnorderedList' },
        { id: 'numberedList', icon: 'fa-list-ol', title: '有序列表', action: 'insertOrderedList' },
        { id: 'separator3', type: 'separator' },
        { id: 'link', icon: 'fa-link', title: '插入链接', action: 'createLink' },
        { id: 'image', icon: 'fa-image', title: '插入图片', action: 'insertImage' },
        { id: 'video', icon: 'fa-video-camera', title: '插入视频', action: 'insertVideo' },
        { id: 'separator4', type: 'separator' },
        { id: 'alignLeft', icon: 'fa-align-left', title: '左对齐', action: 'justifyLeft' },
        { id: 'alignCenter', icon: 'fa-align-center', title: '居中对齐', action: 'justifyCenter' },
        { id: 'alignRight', icon: 'fa-align-right', title: '右对齐', action: 'justifyRight' },
        { id: 'separator5', type: 'separator' },
        { id: 'undo', icon: 'fa-undo', title: '撤销', action: 'undo' },
        { id: 'redo', icon: 'fa-repeat', title: '重做', action: 'redo' },
        { id: 'separator6', type: 'separator' },
        { id: 'code', icon: 'fa-code', title: '代码块', action: 'codeBlock' },
        { id: 'quote', icon: 'fa-quote-right', title: '引用', action: 'formatBlock', value: 'blockquote' },
        { id: 'hr', icon: 'fa-minus', title: '水平线', action: 'insertHorizontalRule' }
    ],

    init(options = {}) {
        if (this.initialized) return;

        this.defaultOptions = {
            placeholder: '请输入内容...',
            height: 300,
            enableToolbar: true,
            enableImageUpload: true,
            enableAutoSave: true,
            autoSaveInterval: 30000,
            allowedTags: ['p', 'br', 'strong', 'em', 'u', 's', 'h1', 'h2', 'h3', 'ul', 'ol', 'li', 'a', 'img', 'video', 'blockquote', 'pre', 'code', 'hr'],
            ...options
        };

        this.initialized = true;
        console.log('[RichTextEditor] 富文本编辑器初始化完成');
    },

    create(elementId, options = {}) {
        const element = document.getElementById(elementId);
        if (!element) {
            console.error(`[RichTextEditor] 元素不存在: ${elementId}`);
            return null;
        }

        const config = { ...this.defaultOptions, ...options };

        const editorContainer = document.createElement('div');
        editorContainer.className = 'rich-text-editor';
        editorContainer.style.border = '1px solid #e5e7eb';
        editorContainer.style.borderRadius = '0.75rem';
        editorContainer.style.overflow = 'hidden';

        let toolbarHtml = '';
        if (config.enableToolbar) {
            toolbarHtml = this.createToolbar(config);
        }

        const contentEditable = document.createElement('div');
        contentEditable.className = 'rich-text-content';
        contentEditable.contentEditable = true;
        contentEditable.style.minHeight = `${config.height}px`;
        contentEditable.style.padding = '1rem';
        contentEditable.style.outline = 'none';
        contentEditable.style.overflowY = 'auto';

        if (config.placeholder) {
            contentEditable.dataset.placeholder = config.placeholder;
        }

        editorContainer.innerHTML = toolbarHtml;
        editorContainer.appendChild(contentEditable);

        element.innerHTML = '';
        element.appendChild(editorContainer);

        const editor = {
            id: elementId,
            container: editorContainer,
            toolbar: editorContainer.querySelector('.rich-text-toolbar'),
            content: contentEditable,
            config,
            history: [],
            historyIndex: -1
        };

        this.setupEventListeners(editor);
        this.editors.set(elementId, editor);

        return editor;
    },

    createToolbar(config) {
        let html = '<div class="rich-text-toolbar flex flex-wrap items-center gap-1 p-2 bg-gray-50 border-b border-gray-200">';

        this.toolbarButtons.forEach(btn => {
            if (btn.type === 'separator') {
                html += '<div class="w-px h-6 bg-gray-300 mx-1"></div>';
            } else {
                html += `
                    <button type="button"
                        class="rich-text-btn px-2 py-1.5 rounded hover:bg-gray-200 transition-colors"
                        data-action="${btn.action}"
                        data-value="${btn.value || ''}"
                        title="${btn.title}">
                        <i class="fa ${btn.icon} text-gray-600"></i>
                    </button>
                `;
            }
        });

        html += '</div>';
        return html;
    },

    setupEventListeners(editor) {
        editor.content.addEventListener('input', () => {
            this.saveHistory(editor);
            this.updatePlaceholder(editor);
        });

        editor.content.addEventListener('keydown', (e) => {
            if (e.ctrlKey || e.metaKey) {
                switch (e.key.toLowerCase()) {
                    case 'b':
                        e.preventDefault();
                        this.execCommand(editor, 'bold');
                        break;
                    case 'i':
                        e.preventDefault();
                        this.execCommand(editor, 'italic');
                        break;
                    case 'u':
                        e.preventDefault();
                        this.execCommand(editor, 'underline');
                        break;
                }
            }
        });

        editor.content.addEventListener('paste', (e) => {
            e.preventDefault();
            const text = e.clipboardData.getData('text/plain');
            document.execCommand('insertText', false, text);
        });

        if (editor.toolbar) {
            editor.toolbar.querySelectorAll('.rich-text-btn').forEach(btn => {
                btn.addEventListener('click', (e) => {
                    e.preventDefault();
                    const action = btn.dataset.action;
                    const value = btn.dataset.value || '';
                    this.execCommand(editor, action, value);
                });
            });
        }
    },

    execCommand(editor, command, value = '') {
        editor.content.focus();

        switch (command) {
            case 'bold':
                document.execCommand('bold', false, null);
                break;
            case 'italic':
                document.execCommand('italic', false, null);
                break;
            case 'underline':
                document.execCommand('underline', false, null);
                break;
            case 'strikeThrough':
                document.execCommand('strikeThrough', false, null);
                break;
            case 'insertUnorderedList':
                document.execCommand('insertUnorderedList', false, null);
                break;
            case 'insertOrderedList':
                document.execCommand('insertOrderedList', false, null);
                break;
            case 'justifyLeft':
                document.execCommand('justifyLeft', false, null);
                break;
            case 'justifyCenter':
                document.execCommand('justifyCenter', false, null);
                break;
            case 'justifyRight':
                document.execCommand('justifyRight', false, null);
                break;
            case 'formatBlock':
                document.execCommand('formatBlock', false, value);
                break;
            case 'createLink':
                const url = prompt('请输入链接地址:');
                if (url) {
                    document.execCommand('createLink', false, url);
                }
                break;
            case 'insertImage':
                const imgUrl = prompt('请输入图片地址:');
                if (imgUrl) {
                    document.execCommand('insertImage', false, imgUrl);
                }
                break;
            case 'insertVideo':
                const videoUrl = prompt('请输入视频地址:');
                if (videoUrl) {
                    this.insertVideo(editor, videoUrl);
                }
                break;
            case 'undo':
                document.execCommand('undo', false, null);
                break;
            case 'redo':
                document.execCommand('redo', false, null);
                break;
            case 'codeBlock':
                const pre = document.createElement('pre');
                pre.style.background = '#f5f5f5';
                pre.style.padding = '1rem';
                pre.style.borderRadius = '0.5rem';
                pre.style.overflowX = 'auto';
                const code = document.createElement('code');
                code.textContent = editor.content.innerText;
                pre.appendChild(code);
                document.execCommand('insertHTML', false, pre.outerHTML);
                break;
            case 'insertHorizontalRule':
                document.execCommand('insertHorizontalRule', false, null);
                break;
        }

        this.saveHistory(editor);
    },

    insertVideo(editor, url) {
        const video = document.createElement('div');
        video.contentEditable = false;
        video.innerHTML = `
            <video controls style="max-width: 100%; border-radius: 0.5rem;">
                <source src="${url}" type="video/mp4">
                您的浏览器不支持视频播放
            </video>
        `;

        editor.content.appendChild(video);
    },

    saveHistory(editor) {
        const html = editor.content.innerHTML;

        if (editor.historyIndex < editor.history.length - 1) {
            editor.history = editor.history.slice(0, editor.historyIndex + 1);
        }

        editor.history.push(html);

        if (editor.history.length > 50) {
            editor.history.shift();
        } else {
            editor.historyIndex++;
        }
    },

    undo(editor) {
        if (editor.historyIndex > 0) {
            editor.historyIndex--;
            editor.content.innerHTML = editor.history[editor.historyIndex];
        }
    },

    redo(editor) {
        if (editor.historyIndex < editor.history.length - 1) {
            editor.historyIndex++;
            editor.content.innerHTML = editor.history[editor.historyIndex];
        }
    },

    getContent(editorId) {
        const editor = this.editors.get(editorId);
        if (!editor) return '';

        return editor.content.innerHTML;
    },

    setContent(editorId, content) {
        const editor = this.editors.get(editorId);
        if (!editor) return;

        editor.content.innerHTML = content;
        this.saveHistory(editor);
    },

    clearContent(editorId) {
        const editor = this.editors.get(editorId);
        if (!editor) return;

        editor.content.innerHTML = '';
        this.saveHistory(editor);
    },

    updatePlaceholder(editor) {
        if (editor.content.innerHTML.trim() === '') {
            editor.content.classList.add('has-placeholder');
        } else {
            editor.content.classList.remove('has-placeholder');
        }
    },

    enableReadOnly(editorId) {
        const editor = this.editors.get(editorId);
        if (!editor) return;

        editor.content.contentEditable = false;
        editor.content.style.backgroundColor = '#f9fafb';
    },

    disableReadOnly(editorId) {
        const editor = this.editors.get(editorId);
        if (!editor) return;

        editor.content.contentEditable = true;
        editor.content.style.backgroundColor = '';
    },

    destroy(editorId) {
        const editor = this.editors.get(editorId);
        if (!editor) return;

        editor.container.remove();
        this.editors.delete(editorId);
    },

    getWordCount(editorId) {
        const editor = this.editors.get(editorId);
        if (!editor) return 0;

        const text = editor.content.innerText.trim();
        return text ? text.split(/\s+/).length : 0;
    },

    getCharCount(editorId) {
        const editor = this.editors.get(editorId);
        if (!editor) return 0;

        return editor.content.innerText.trim().length;
    },

    insertTable(editorId, rows, cols) {
        const editor = this.editors.get(editorId);
        if (!editor) return;

        let tableHtml = '<table class="rich-text-table" style="border-collapse: collapse; width: 100%; margin: 1rem 0;">';

        for (let i = 0; i < rows; i++) {
            tableHtml += '<tr>';
            for (let j = 0; j < cols; j++) {
                const style = i === 0
                    ? 'border: 1px solid #ddd; padding: 8px; background: #f5f5f5; font-weight: bold;'
                    : 'border: 1px solid #ddd; padding: 8px;';
                tableHtml += `<td contenteditable="true" style="${style}">单元格</td>`;
            }
            tableHtml += '</tr>';
        }

        tableHtml += '</table>';

        document.execCommand('insertHTML', false, tableHtml);
    },

    insertMathFormula(editorId, formula) {
        const editor = this.editors.get(editorId);
        if (!editor) return;

        const mathDiv = document.createElement('div');
        mathDiv.className = 'math-formula';
        mathDiv.contentEditable = false;
        mathDiv.innerHTML = formula;
        mathDiv.style.display = 'inline-block';
        mathDiv.style.padding = '0.5rem 1rem';
        mathDiv.style.background = '#f5f5f5';
        mathDiv.style.borderRadius = '0.5rem';
        mathDiv.style.margin = '0 0.25rem';

        editor.content.appendChild(mathDiv);
    }
};

window.RichTextEditor = RichTextEditor;

const StudyPlanService = {
    initialized: false,
    plans: new Map(),

    async init() {
        if (this.initialized) return;
        this.initialized = true;
        console.log('[StudyPlanService] 学习计划服务初始化完成');
    },

    async createPlan(planData) {
        const plan = {
            id: this.generateId(),
            userId: planData.userId,
            title: planData.title,
            description: planData.description || '',
            subjectId: planData.subjectId || null,
            targetDate: planData.targetDate,
            targetCount: planData.targetCount || 0,
            completedCount: 0,
            status: 'active',
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
        };

        try {
            const { supabase } = await this.getSupabase();
            if (supabase) {
                const { data, error } = await supabase
                    .from('study_plans')
                    .insert([this.convertToSnakeCase(plan)])
                    .select()
                    .single();

                if (error) throw error;
                this.plans.set(plan.id, this.convertToCamelCase(data));
                return this.convertToCamelCase(data);
            }
        } catch (error) {
            console.error('[StudyPlanService] 创建学习计划失败:', error);
        }

        this.plans.set(plan.id, plan);
        this.saveToLocal(plan);
        return plan;
    },

    async getPlans(userId) {
        try {
            const { supabase } = await this.getSupabase();
            if (supabase) {
                const { data, error } = await supabase
                    .from('study_plans')
                    .select('*')
                    .eq('user_id', userId)
                    .order('target_date', { ascending: true });

                if (error) throw error;

                const plans = (data || []).map(this.convertToCamelCase);
                plans.forEach(p => this.plans.set(p.id, p));
                return plans;
            }
        } catch (error) {
            console.error('[StudyPlanService] 获取学习计划失败:', error);
        }

        return this.getFromLocal(userId);
    },

    async updatePlan(planId, updates) {
        const updatedData = {
            ...updates,
            updatedAt: new Date().toISOString()
        };

        try {
            const { supabase } = await this.getSupabase();
            if (supabase) {
                const { data, error } = await supabase
                    .from('study_plans')
                    .update(this.convertToSnakeCase(updatedData))
                    .eq('id', planId)
                    .select()
                    .single();

                if (error) throw error;
                this.plans.set(planId, this.convertToCamelCase(data));
                return this.convertToCamelCase(data);
            }
        } catch (error) {
            console.error('[StudyPlanService] 更新学习计划失败:', error);
        }

        const plan = this.plans.get(planId);
        if (plan) {
            const updatedPlan = { ...plan, ...updatedData };
            this.plans.set(planId, updatedPlan);
            this.saveToLocal(updatedPlan);
            return updatedPlan;
        }

        return null;
    },

    async deletePlan(planId) {
        try {
            const { supabase } = await this.getSupabase();
            if (supabase) {
                const { error } = await supabase
                    .from('study_plans')
                    .delete()
                    .eq('id', planId);

                if (error) throw error;
            }
        } catch (error) {
            console.error('[StudyPlanService] 删除学习计划失败:', error);
        }

        this.plans.delete(planId);
        this.deleteFromLocal(planId);
    },

    async recordProgress(planId, completedCount) {
        const plan = this.plans.get(planId);
        if (!plan) return null;

        const updates = {
            completedCount: plan.completedCount + completedCount
        };

        if (plan.completedCount >= plan.targetCount) {
            updates.status = 'completed';
        }

        return await this.updatePlan(planId, updates);
    },

    async getStudyStats(userId) {
        const plans = await this.getPlans(userId);

        const totalPlans = plans.length;
        const completedPlans = plans.filter(p => p.status === 'completed').length;
        const activePlans = plans.filter(p => p.status === 'active').length;
        const totalTarget = plans.reduce((sum, p) => sum + p.targetCount, 0);
        const totalCompleted = plans.reduce((sum, p) => sum + p.completedCount, 0);

        return {
            totalPlans,
            completedPlans,
            activePlans,
            totalTarget,
            totalCompleted,
            completionRate: totalTarget > 0 ? Math.round((totalCompleted / totalTarget) * 100) : 0
        };
    },

    saveToLocal(plan) {
        const plans = this.getLocalPlans();
        const index = plans.findIndex(p => p.id === plan.id);
        if (index >= 0) {
            plans[index] = plan;
        } else {
            plans.push(plan);
        }
        localStorage.setItem('study_plans', JSON.stringify(plans));
    },

    getLocalPlans() {
        const data = localStorage.getItem('study_plans');
        return data ? JSON.parse(data) : [];
    },

    getFromLocal(userId) {
        return this.getLocalPlans().filter(p => p.userId === userId);
    },

    deleteFromLocal(planId) {
        const plans = this.getLocalPlans().filter(p => p.id !== planId);
        localStorage.setItem('study_plans', JSON.stringify(plans));
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

    generateId() {
        return 'sp-xxxx-xxxx-xxxx'.replace(/x/g, () =>
            Math.floor(Math.random() * 16).toString(16)
        );
    },

    convertToCamelCase(obj) {
        if (obj === null || obj === undefined) return obj;
        if (Array.isArray(obj)) {
            return obj.map(item => this.convertToCamelCase(item));
        }
        if (typeof obj === 'object') {
            const result = {};
            for (const key in obj) {
                if (obj.hasOwnProperty(key)) {
                    const camelKey = key.replace(/_([a-z])/g, (_, letter) => letter.toUpperCase());
                    result[camelKey] = this.convertToCamelCase(obj[key]);
                }
            }
            return result;
        }
        return obj;
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
    }
};

window.StudyPlanService = StudyPlanService;

const AchievementService = {
    initialized: false,
    achievements: new Map(),
    userAchievements: new Map(),

    defaultAchievements: [
        {
            id: 'first_sign',
            name: '首次签到',
            description: '完成第一次签到',
            icon: 'fa-calendar-check',
            type: 'attendance',
            condition: { type: 'attendance_count', value: 1 },
            reward: 10
        },
        {
            id: 'sign_master',
            name: '签到达人',
            description: '累计完成50次签到',
            icon: 'fa-calendar',
            type: 'attendance',
            condition: { type: 'attendance_count', value: 50 },
            reward: 100
        },
        {
            id: 'first_exam',
            name: '初次考试',
            description: '完成第一次考试',
            icon: 'fa-file-text',
            type: 'exam',
            condition: { type: 'exam_count', value: 1 },
            reward: 10
        },
        {
            id: 'perfect_score',
            name: '满分达成',
            description: '考试获得满分',
            icon: 'fa-star',
            type: 'exam',
            condition: { type: 'perfect_score', value: 1 },
            reward: 50
        },
        {
            id: 'study_streak_7',
            name: '连续学习一周',
            description: '连续7天学习',
            icon: 'fa-fire',
            type: 'study',
            condition: { type: 'study_streak', value: 7 },
            reward: 70
        },
        {
            id: 'wrong_question_master',
            name: '错题终结者',
            description: '掌握100道错题',
            icon: 'fa-check-circle',
            type: 'study',
            condition: { type: 'mastered_wrong_questions', value: 100 },
            reward: 200
        },
        {
            id: 'socialButterfly',
            name: '社交达人',
            description: '发送100条消息',
            icon: 'fa-comments',
            type: 'social',
            condition: { type: 'message_count', value: 100 },
            reward: 50
        }
    ],

    async init() {
        if (this.initialized) return;

        await this.loadAchievements();
        this.initialized = true;
        console.log('[AchievementService] 成就服务初始化完成');
    },

    async loadAchievements() {
        try {
            const { supabase } = await this.getSupabase();
            if (supabase) {
                const { data, error } = await supabase
                    .from('achievements')
                    .select('*');

                if (error) throw error;

                (data || []).forEach(a => {
                    this.achievements.set(a.id, this.convertToCamelCase(a));
                });
            }
        } catch (error) {
            console.error('[AchievementService] 加载成就失败:', error);
        }

        if (this.achievements.size === 0) {
            this.defaultAchievements.forEach(a => {
                this.achievements.set(a.id, a);
            });
        }
    },

    async checkAndAwardAchievements(userId) {
        const newAchievements = [];

        try {
            const stats = await this.getUserStats(userId);

            for (const [id, achievement] of this.achievements) {
                if (await this.hasAchievement(userId, id)) continue;

                if (this.checkCondition(achievement.condition, stats)) {
                    await this.awardAchievement(userId, id);
                    newAchievements.push(achievement);
                }
            }
        } catch (error) {
            console.error('[AchievementService] 检查成就失败:', error);
        }

        return newAchievements;
    },

    checkCondition(condition, stats) {
        switch (condition.type) {
            case 'attendance_count':
                return stats.attendanceCount >= condition.value;
            case 'exam_count':
                return stats.examCount >= condition.value;
            case 'perfect_score':
                return stats.perfectScoreCount >= condition.value;
            case 'study_streak':
                return stats.studyStreak >= condition.value;
            case 'mastered_wrong_questions':
                return stats.masteredWrongQuestions >= condition.value;
            case 'message_count':
                return stats.messageCount >= condition.value;
            default:
                return false;
        }
    },

    async getUserStats(userId) {
        const attendanceRecords = await DataService.getAttendanceRecords() || [];
        const examRecords = await DataService.getExamRecords() || [];
        const wrongQuestions = await DataService.getWrongQuestions() || [];

        const attendanceCount = attendanceRecords.filter(r => r.userId === userId).length;
        const examCount = examRecords.filter(r => r.userId === userId).length;
        const perfectScoreCount = examRecords.filter(r => r.userId === userId && r.score === 100).length;
        const masteredWrongQuestions = wrongQuestions.filter(r => r.userId === userId && r.mastered).length;

        return {
            attendanceCount,
            examCount,
            perfectScoreCount,
            studyStreak: 0,
            masteredWrongQuestions,
            messageCount: 0
        };
    },

    async hasAchievement(userId, achievementId) {
        try {
            const { supabase } = await this.getSupabase();
            if (supabase) {
                const { data, error } = await supabase
                    .from('user_achievements')
                    .select('*')
                    .eq('user_id', userId)
                    .eq('achievement_id', achievementId)
                    .single();

                if (data) return true;
            }
        } catch (error) {
            console.error('[AchievementService] 检查成就失败:', error);
        }

        return false;
    },

    async awardAchievement(userId, achievementId) {
        const achievement = this.achievements.get(achievementId);
        if (!achievement) return null;

        try {
            const { supabase } = await this.getSupabase();
            if (supabase) {
                const { data, error } = await supabase
                    .from('user_achievements')
                    .insert([{
                        user_id: userId,
                        achievement_id: achievementId,
                        earned_at: new Date().toISOString()
                    }])
                    .select()
                    .single();

                if (error) throw error;

                const userAchievement = this.convertToCamelCase(data);
                const key = `${userId}_${achievementId}`;
                this.userAchievements.set(key, userAchievement);

                return userAchievement;
            }
        } catch (error) {
            console.error('[AchievementService] 授予成就失败:', error);
        }

        return null;
    },

    async getUserAchievements(userId) {
        const result = [];

        try {
            const { supabase } = await this.getSupabase();
            if (supabase) {
                const { data, error } = await supabase
                    .from('user_achievements')
                    .select('*')
                    .eq('user_id', userId);

                if (error) throw error;

                for (const ua of (data || [])) {
                    const achievement = this.achievements.get(ua.achievement_id);
                    if (achievement) {
                        result.push({
                            ...achievement,
                            earnedAt: ua.earned_at
                        });
                    }
                }
            }
        } catch (error) {
            console.error('[AchievementService] 获取用户成就失败:', error);
        }

        return result;
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

    convertToCamelCase(obj) {
        if (obj === null || obj === undefined) return obj;
        if (Array.isArray(obj)) {
            return obj.map(item => this.convertToCamelCase(item));
        }
        if (typeof obj === 'object') {
            const result = {};
            for (const key in obj) {
                if (obj.hasOwnProperty(key)) {
                    const camelKey = key.replace(/_([a-z])/g, (_, letter) => letter.toUpperCase());
                    result[camelKey] = this.convertToCamelCase(obj[key]);
                }
            }
            return result;
        }
        return obj;
    }
};

window.AchievementService = AchievementService;
