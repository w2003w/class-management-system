const AutomationService = {
    initialized: false,
    automations: [],
    triggers: {},
    actions: {},
    scheduler: null,
    executionHistory: [],

    async init() {
        if (this.initialized) return;

        this.registerBuiltInTriggers();
        this.registerBuiltInActions();
        this.loadAutomations();
        this.startScheduler();

        this.initialized = true;
        console.log('[AutomationService] 自动化服务初始化完成');
    },

    registerBuiltInTriggers() {
        this.triggers = {
            time: {
                name: '定时触发',
                description: '在指定时间自动执行',
                configSchema: {
                    type: 'object',
                    properties: {
                        schedule: { type: 'string', pattern: '^\\d{2}:\\d{2}$' },
                        days: {
                            type: 'array',
                            items: { type: 'number', min: 0, max: 6 }
                        },
                        timezone: { type: 'string', default: 'Asia/Shanghai' }
                    },
                    required: ['schedule']
                },
                handler: this.handleTimeTrigger.bind(this)
            },

            interval: {
                name: '间隔触发',
                description: '按固定时间间隔执行',
                configSchema: {
                    type: 'object',
                    properties: {
                        interval: { type: 'number', minimum: 1 },
                        unit: { type: 'string', enum: ['minutes', 'hours', 'days'] }
                    },
                    required: ['interval', 'unit']
                },
                handler: this.handleIntervalTrigger.bind(this)
            },

            event: {
                name: '事件触发',
                description: '当特定事件发生时执行',
                configSchema: {
                    type: 'object',
                    properties: {
                        eventType: { type: 'string' },
                        conditions: { type: 'array' }
                    },
                    required: ['eventType']
                },
                handler: this.handleEventTrigger.bind(this)
            },

            data_change: {
                name: '数据变更触发',
                description: '当数据满足条件时执行',
                configSchema: {
                    type: 'object',
                    properties: {
                        table: { type: 'string' },
                        condition: { type: 'string' },
                        operation: { type: 'string', enum: ['insert', 'update', 'delete'] }
                    },
                    required: ['table']
                },
                handler: this.handleDataChangeTrigger.bind(this)
            },

            wrong_question_reminder: {
                name: '错题复习提醒',
                description: '根据遗忘曲线提醒复习错题',
                configSchema: {
                    type: 'object',
                    properties: {
                        timing: { type: 'string', enum: ['morning', 'afternoon', 'evening'] },
                        advanceHours: { type: 'number', default: 24 }
                    }
                },
                handler: this.handleWrongQuestionReminder.bind(this)
            },

            study_streak: {
                name: '学习连续提醒',
                description: '保持学习连续性提醒',
                configSchema: {
                    type: 'object',
                    properties: {
                        minStreak: { type: 'number', default: 3 },
                        encourageMessage: { type: 'string' }
                    }
                },
                handler: this.handleStudyStreak.bind(this)
            },

            achievement_unlocked: {
                name: '成就解锁提醒',
                description: '当获得新成就时触发',
                configSchema: {
                    type: 'object',
                    properties: {
                        rarity: { type: 'array', items: { type: 'string' } }
                    }
                },
                handler: this.handleAchievementUnlocked.bind(this)
            },

            exam_deadline: {
                name: '考试截止提醒',
                description: '考试临近截止时提醒',
                configSchema: {
                    type: 'object',
                    properties: {
                        advanceDays: { type: 'number', default: 1 },
                        repeatTimes: { type: 'number', default: 3 }
                    }
                },
                handler: this.handleExamDeadline.bind(this)
            },

            low_performance: {
                name: '低表现提醒',
                description: '当成绩下降时提醒',
                configSchema: {
                    type: 'object',
                    properties: {
                        threshold: { type: 'number', default: 60 },
                        comparePeriod: { type: 'string', default: 'week' }
                    }
                },
                handler: this.handleLowPerformance.bind(this)
            }
        };
    },

    registerBuiltInActions() {
        this.actions = {
            send_notification: {
                name: '发送通知',
                description: '向用户发送通知',
                paramSchema: {
                    type: 'object',
                    properties: {
                        title: { type: 'string' },
                        body: { type: 'string' },
                        type: { type: 'string', enum: ['info', 'success', 'warning', 'error'] },
                        channel: { type: 'string', enum: ['push', 'email', 'sms'] }
                    },
                    required: ['title', 'body']
                },
                handler: this.executeSendNotification.bind(this)
            },

            add_to_calendar: {
                name: '添加到日历',
                description: '创建日历事件',
                paramSchema: {
                    type: 'object',
                    properties: {
                        title: { type: 'string' },
                        description: { type: 'string' },
                        startTime: { type: 'string' },
                        duration: { type: 'number' },
                        reminder: { type: 'boolean' }
                    },
                    required: ['title', 'startTime']
                },
                handler: this.executeAddToCalendar.bind(this)
            },

            create_study_plan: {
                name: '创建学习计划',
                description: '自动创建学习计划',
                paramSchema: {
                    type: 'object',
                    properties: {
                        title: { type: 'string' },
                        subject: { type: 'string' },
                        targetDate: { type: 'string' },
                        targetCount: { type: 'number' },
                        priority: { type: 'string', enum: ['low', 'medium', 'high'] }
                    },
                    required: ['title']
                },
                handler: this.executeCreateStudyPlan.bind(this)
            },

            update_wrong_question: {
                name: '更新错题状态',
                description: '修改错题的复习状态',
                paramSchema: {
                    type: 'object',
                    properties: {
                        questionId: { type: 'string' },
                        mastered: { type: 'boolean' },
                        addTag: { type: 'string' }
                    }
                },
                handler: this.executeUpdateWrongQuestion.bind(this)
            },

            generate_report: {
                name: '生成报告',
                description: '生成学习报告',
                paramSchema: {
                    type: 'object',
                    properties: {
                        type: { type: 'string', enum: ['daily', 'weekly', 'monthly'] },
                        includeCharts: { type: 'boolean', default: true },
                        recipients: { type: 'array', items: { type: 'string' } }
                    },
                    required: ['type']
                },
                handler: this.executeGenerateReport.bind(this)
            },

            send_email: {
                name: '发送邮件',
                description: '发送邮件',
                paramSchema: {
                    type: 'object',
                    properties: {
                        to: { type: 'string' },
                        subject: { type: 'string' },
                        body: { type: 'string' },
                        template: { type: 'string' }
                    },
                    required: ['to', 'subject', 'body']
                },
                handler: this.executeSendEmail.bind(this)
            },

            webhook: {
                name: '触发Webhook',
                description: '发送HTTP请求',
                paramSchema: {
                    type: 'object',
                    properties: {
                        url: { type: 'string', format: 'uri' },
                        method: { type: 'string', enum: ['GET', 'POST', 'PUT', 'DELETE'] },
                        headers: { type: 'object' },
                        body: { type: 'object' }
                    },
                    required: ['url']
                },
                handler: this.executeWebhook.bind(this)
            },

            update_achievement: {
                name: '更新成就进度',
                description: '更新用户成就进度',
                paramSchema: {
                    type: 'object',
                    properties: {
                        achievementCode: { type: 'string' },
                        increment: { type: 'number', default: 1 }
                    },
                    required: ['achievementCode']
                },
                handler: this.executeUpdateAchievement.bind(this)
            },

            send_sms: {
                name: '发送短信',
                description: '发送短信通知',
                paramSchema: {
                    type: 'object',
                    properties: {
                        phone: { type: 'string' },
                        message: { type: 'string' }
                    },
                    required: ['phone', 'message']
                },
                handler: this.executeSendSMS.bind(this)
            },

            trigger_automation: {
                name: '触发其他自动化',
                description: '触发另一个自动化任务',
                paramSchema: {
                    type: 'object',
                    properties: {
                        automationId: { type: 'string' },
                        passContext: { type: 'boolean' }
                    },
                    required: ['automationId']
                },
                handler: this.executeTriggerAutomation.bind(this)
            },

            log_action: {
                name: '记录日志',
                description: '记录操作日志',
                paramSchema: {
                    type: 'object',
                    properties: {
                        message: { type: 'string' },
                        level: { type: 'string', enum: ['info', 'warning', 'error'] },
                        metadata: { type: 'object' }
                    },
                    required: ['message']
                },
                handler: this.executeLogAction.bind(this)
            }
        };
    },

    loadAutomations() {
        try {
            const saved = localStorage.getItem('automations');
            if (saved) {
                this.automations = JSON.parse(saved);
            }
        } catch (error) {
            console.error('[Automation] Failed to load automations:', error);
            this.automations = [];
        }

        this.automations.forEach(automation => {
            if (automation.isEnabled) {
                this.activateAutomation(automation);
            }
        });
    },

    saveAutomations() {
        try {
            localStorage.setItem('automations', JSON.stringify(this.automations));
        } catch (error) {
            console.error('[Automation] Failed to save automations:', error);
        }
    },

    startScheduler() {
        if (this.scheduler) {
            clearInterval(this.scheduler);
        }

        this.scheduler = setInterval(() => {
            this.checkScheduledAutomations();
        }, 60000);
    },

    checkScheduledAutomations() {
        const now = new Date();
        const currentTime = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
        const currentDay = now.getDay();

        this.automations.forEach(automation => {
            if (!automation.isEnabled) return;

            if (automation.trigger.type === 'time') {
                const config = automation.trigger.config || {};
                if (config.schedule === currentTime) {
                    if (!config.days || config.days.length === 0 || config.days.includes(currentDay)) {
                        this.executeAutomation(automation);
                    }
                }
            }
        });
    },

    async createAutomation(data) {
        const automation = {
            id: this.generateId(),
            name: data.name || '新自动化',
            description: data.description || '',
            trigger: {
                type: data.triggerType,
                config: data.triggerConfig || {}
            },
            actions: (data.actions || []).map(action => ({
                type: action.type,
                params: action.params || {}
            })),
            conditions: data.conditions || [],
            isEnabled: data.isEnabled !== false,
            lastExecuted: null,
            executionCount: 0,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
        };

        this.automations.push(automation);
        this.saveAutomations();

        if (automation.isEnabled) {
            this.activateAutomation(automation);
        }

        return automation;
    },

    async updateAutomation(id, data) {
        const index = this.automations.findIndex(a => a.id === id);
        if (index === -1) {
            throw new Error('Automation not found');
        }

        this.deactivateAutomation(this.automations[index]);

        const automation = this.automations[index];
        Object.assign(automation, {
            name: data.name ?? automation.name,
            description: data.description ?? automation.description,
            trigger: data.triggerType ? {
                type: data.triggerType,
                config: data.triggerConfig ?? automation.trigger.config
            } : automation.trigger,
            actions: data.actions ? data.actions.map(action => ({
                type: action.type,
                params: action.params || {}
            })) : automation.actions,
            conditions: data.conditions ?? automation.conditions,
            isEnabled: data.isEnabled ?? automation.isEnabled,
            updatedAt: new Date().toISOString()
        });

        this.saveAutomations();

        if (automation.isEnabled) {
            this.activateAutomation(automation);
        }

        return automation;
    },

    async deleteAutomation(id) {
        const index = this.automations.findIndex(a => a.id === id);
        if (index === -1) {
            throw new Error('Automation not found');
        }

        this.deactivateAutomation(this.automations[index]);
        this.automations.splice(index, 1);
        this.saveAutomations();

        return { success: true };
    },

    async getAutomations(userId) {
        return this.automations.filter(a => a.userId === userId || !a.userId);
    },

    activateAutomation(automation) {
        const trigger = this.triggers[automation.trigger.type];
        if (!trigger) {
            console.warn(`[Automation] Unknown trigger type: ${automation.trigger.type}`);
            return;
        }

        console.log(`[Automation] Activated: ${automation.name}`);
    },

    deactivateAutomation(automation) {
        console.log(`[Automation] Deactivated: ${automation.name}`);
    },

    async executeAutomation(automation, context = {}) {
        console.log(`[Automation] Executing: ${automation.name}`);

        const execution = {
            id: this.generateId(),
            automationId: automation.id,
            automationName: automation.name,
            status: 'running',
            startTime: new Date().toISOString(),
            actions: []
        };

        try {
            for (let i = 0; i < automation.actions.length; i++) {
                const actionConfig = automation.actions[i];
                const action = this.actions[actionConfig.type];

                if (!action) {
                    throw new Error(`Unknown action type: ${actionConfig.type}`);
                }

                const result = await action.handler(actionConfig.params, context);

                execution.actions.push({
                    actionType: actionConfig.type,
                    status: 'success',
                    result
                });
            }

            execution.status = 'completed';
            execution.endTime = new Date().toISOString();

            automation.lastExecuted = execution.endTime;
            automation.executionCount++;
            this.saveAutomations();

        } catch (error) {
            execution.status = 'failed';
            execution.error = error.message;
            execution.endTime = new Date().toISOString();
            console.error(`[Automation] Execution failed: ${automation.name}`, error);
        }

        this.executionHistory.unshift(execution);
        if (this.executionHistory.length > 100) {
            this.executionHistory = this.executionHistory.slice(0, 100);
        }

        return execution;
    },

    async handleTimeTrigger(config, context) {
        console.log('[TimeTrigger] Checking time-based trigger...');
        return { shouldExecute: true };
    },

    async handleIntervalTrigger(config, context) {
        return { shouldExecute: true };
    },

    async handleEventTrigger(config, context) {
        if (config.eventType !== context.eventType) {
            return { shouldExecute: false };
        }

        if (config.conditions && config.conditions.length > 0) {
            return this.evaluateConditions(config.conditions, context);
        }

        return { shouldExecute: true };
    },

    async handleDataChangeTrigger(config, context) {
        return { shouldExecute: true };
    },

    async handleWrongQuestionReminder(config, context) {
        const timing = config.timing || 'morning';
        const currentHour = new Date().getHours();

        const timingHours = {
            morning: { start: 6, end: 10 },
            afternoon: { start: 12, end: 16 },
            evening: { start: 18, end: 22 }
        };

        const range = timingHours[timing];
        return {
            shouldExecute: currentHour >= range.start && currentHour <= range.end
        };
    },

    async handleStudyStreak(config, context) {
        const userId = context.userId || this.getCurrentUserId();
        const streak = await this.getUserStreak(userId);

        return {
            shouldExecute: streak >= (config.minStreak || 3),
            streak,
            message: config.encourageMessage || `你已经连续学习${streak}天了！`
        };
    },

    async handleAchievementUnlocked(config, context) {
        return { shouldExecute: true };
    },

    async handleExamDeadline(config, context) {
        return { shouldExecute: true };
    },

    async handleLowPerformance(config, context) {
        return { shouldExecute: true };
    },

    evaluateConditions(conditions, context) {
        for (const condition of conditions) {
            const value = this.getNestedValue(context, condition.field);
            const operator = condition.operator;
            const expected = condition.value;

            if (!this.evaluateOperator(value, operator, expected)) {
                return { shouldExecute: false };
            }
        }

        return { shouldExecute: true };
    },

    evaluateOperator(value, operator, expected) {
        switch (operator) {
            case 'equals':
                return value === expected;
            case 'not_equals':
                return value !== expected;
            case 'greater_than':
                return value > expected;
            case 'less_than':
                return value < expected;
            case 'contains':
                return String(value).includes(expected);
            case 'in':
                return expected.includes(value);
            case 'not_in':
                return !expected.includes(value);
            default:
                return false;
        }
    },

    getNestedValue(obj, path) {
        return path.split('.').reduce((current, key) => current?.[key], obj);
    },

    async executeSendNotification(params, context) {
        console.log('[NotificationAction] Sending notification:', params);

        if (typeof AdvancedNotificationService !== 'undefined') {
            await AdvancedNotificationService.showNotification({
                title: this.interpolate(params.title, context),
                message: this.interpolate(params.body, context),
                type: params.type || 'info'
            });
        }

        return { success: true };
    },

    async executeAddToCalendar(params, context) {
        console.log('[CalendarAction] Adding to calendar:', params);

        return {
            success: true,
            eventId: this.generateId()
        };
    },

    async executeCreateStudyPlan(params, context) {
        console.log('[StudyPlanAction] Creating study plan:', params);

        return {
            success: true,
            planId: this.generateId()
        };
    },

    async executeUpdateWrongQuestion(params, context) {
        console.log('[WrongQuestionAction] Updating wrong question:', params);

        return { success: true };
    },

    async executeGenerateReport(params, context) {
        console.log('[ReportAction] Generating report:', params);

        return {
            success: true,
            reportId: this.generateId(),
            downloadUrl: '#'
        };
    },

    async executeSendEmail(params, context) {
        console.log('[EmailAction] Sending email:', params);

        return { success: true };
    },

    async executeWebhook(params, context) {
        console.log('[WebhookAction] Triggering webhook:', params);

        try {
            const response = await fetch(params.url, {
                method: params.method || 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    ...params.headers
                },
                body: params.body ? JSON.stringify(this.interpolateObject(params.body, context)) : undefined
            });

            return {
                success: response.ok,
                status: response.status,
                body: await response.text()
            };
        } catch (error) {
            return {
                success: false,
                error: error.message
            };
        }
    },

    async executeUpdateAchievement(params, context) {
        console.log('[AchievementAction] Updating achievement:', params);

        return { success: true };
    },

    async executeSendSMS(params, context) {
        console.log('[SMSAction] Sending SMS:', params);

        return { success: true };
    },

    async executeTriggerAutomation(params, context) {
        const automation = this.automations.find(a => a.id === params.automationId);
        if (!automation) {
            throw new Error('Automation not found');
        }

        const executionContext = params.passContext ? context : {};
        return this.executeAutomation(automation, executionContext);
    },

    async executeLogAction(params, context) {
        const level = params.level || 'info';
        const message = this.interpolate(params.message, context);

        switch (level) {
            case 'info':
                console.log(`[Automation Log] ${message}`, params.metadata);
                break;
            case 'warning':
                console.warn(`[Automation Log] ${message}`, params.metadata);
                break;
            case 'error':
                console.error(`[Automation Log] ${message}`, params.metadata);
                break;
        }

        return { success: true };
    },

    interpolate(text, context) {
        if (!text) return text;

        return text.replace(/\{\{(\w+(?:\.\w+)*)\}\}/g, (match, path) => {
            const value = this.getNestedValue(context, path);
            return value !== undefined ? value : match;
        });
    },

    interpolateObject(obj, context) {
        if (typeof obj === 'string') {
            return this.interpolate(obj, context);
        }

        if (Array.isArray(obj)) {
            return obj.map(item => this.interpolateObject(item, context));
        }

        if (typeof obj === 'object' && obj !== null) {
            const result = {};
            for (const [key, value] of Object.entries(obj)) {
                result[key] = this.interpolateObject(value, context);
            }
            return result;
        }

        return obj;
    },

    async getUserStreak(userId) {
        return 5;
    },

    async getExecutionHistory(automationId, limit = 20) {
        return this.executionHistory
            .filter(e => !automationId || e.automationId === automationId)
            .slice(0, limit);
    },

    async testAutomation(id, testContext = {}) {
        const automation = this.automations.find(a => a.id === id);
        if (!automation) {
            throw new Error('Automation not found');
        }

        return this.executeAutomation(automation, {
            ...testContext,
            isTest: true
        });
    },

    getTriggerTypes() {
        return Object.entries(this.triggers).map(([key, value]) => ({
            type: key,
            name: value.name,
            description: value.description,
            configSchema: value.configSchema
        }));
    },

    getActionTypes() {
        return Object.entries(this.actions).map(([key, value]) => ({
            type: key,
            name: value.name,
            description: value.description,
            paramSchema: value.paramSchema
        }));
    },

    generateId() {
        return 'auto_' + Date.now().toString(36) + Math.random().toString(36).substr(2, 9);
    },

    getCurrentUserId() {
        return localStorage.getItem('userId') || 'anonymous';
    }
};

window.AutomationService = AutomationService;
