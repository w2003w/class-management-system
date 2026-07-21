const AdvancedAnalyticsService = {
    initialized: false,
    analyticsCache: new Map(),
    cacheTimeout: 5 * 60 * 1000,

    async init() {
        if (this.initialized) return;

        this.analyticsModules = {
            learning: new LearningAnalytics(),
            performance: new PerformanceAnalytics(),
            engagement: new EngagementAnalytics(),
            progress: new ProgressAnalytics()
        };

        this.realTimeMetrics = {
            activeUsers: 0,
            currentSessions: 0,
            requestsPerMinute: 0
        };

        this.historicalData = {
            daily: [],
            weekly: [],
            monthly: []
        };

        this.setupRealTimeTracking();
        this.initialized = true;
        console.log('[AdvancedAnalyticsService] 高级分析服务初始化完成');
    },

    setupRealTimeTracking() {
        this.startTime = Date.now();
        this.eventQueue = [];
        this.batchSize = 10;
        this.batchInterval = 5000;

        setInterval(() => this.processEventBatch(), this.batchInterval);
    },

    async trackEvent(eventType, eventData, userId = null) {
        const event = {
            id: this.generateEventId(),
            type: eventType,
            data: eventData,
            userId: userId || this.getCurrentUserId(),
            timestamp: new Date(),
            sessionId: this.getSessionId()
        };

        this.eventQueue.push(event);

        if (this.eventQueue.length >= this.batchSize) {
            this.processEventBatch();
        }

        this.updateRealTimeMetrics(eventType);
    },

    async processEventBatch() {
        if (this.eventQueue.length === 0) return;

        const batch = this.eventQueue.splice(0, this.batchSize);

        try {
            await this.sendToServer('/api/analytics/batch', { events: batch });
        } catch (error) {
            this.eventQueue.unshift(...batch);
            console.error('[Analytics] Failed to send event batch:', error);
        }
    },

    updateRealTimeMetrics(eventType) {
        const metrics = this.realTimeMetrics;

        switch (eventType) {
            case 'page_view':
            case 'action':
                metrics.requestsPerMinute++;
                break;
            case 'session_start':
                metrics.activeUsers++;
                metrics.currentSessions++;
                break;
            case 'session_end':
                metrics.currentSessions = Math.max(0, metrics.currentSessions - 1);
                break;
        }
    },

    async getDashboardData(options = {}) {
        const { period = 'week', userId = null } = options;
        const cacheKey = `dashboard_${period}_${userId || 'all'}`;

        if (this.analyticsCache.has(cacheKey)) {
            const cached = this.analyticsCache.get(cacheKey);
            if (Date.now() - cached.timestamp < this.cacheTimeout) {
                return cached.data;
            }
        }

        const data = {
            overview: await this.getOverviewMetrics(period, userId),
            trends: await this.getTrendData(period, userId),
            topPerformers: await this.getTopPerformers(5, userId),
            recentActivity: await this.getRecentActivity(10, userId),
            predictions: await this.getPredictions(period, userId),
            recommendations: await this.getRecommendations(userId)
        };

        this.analyticsCache.set(cacheKey, {
            data,
            timestamp: Date.now()
        });

        return data;
    },

    async getOverviewMetrics(period, userId) {
        const startDate = this.getStartDate(period);
        const endDate = new Date();

        const [
            totalUsers,
            activeUsers,
            totalSessions,
            avgSessionDuration,
            totalPageViews,
            bounceRate
        ] = await Promise.all([
            this.getTotalUsers(userId),
            this.getActiveUsers(startDate, endDate, userId),
            this.getTotalSessions(startDate, endDate, userId),
            this.getAverageSessionDuration(startDate, endDate, userId),
            this.getTotalPageViews(startDate, endDate, userId),
            this.getBounceRate(startDate, endDate, userId)
        ]);

        return {
            period,
            startDate,
            endDate,
            metrics: {
                totalUsers,
                activeUsers,
                totalSessions,
                avgSessionDuration,
                totalPageViews,
                bounceRate
            },
            comparisons: await this.getPeriodComparisons(period, userId)
        };
    },

    async getTrendData(period, userId) {
        const intervals = this.getTimeIntervals(period);
        const trends = [];

        for (const interval of intervals) {
            const intervalData = {
                date: interval.label,
                users: await this.getActiveUsers(interval.start, interval.end, userId),
                sessions: await this.getTotalSessions(interval.start, interval.end, userId),
                pageViews: await this.getTotalPageViews(interval.start, interval.end, userId)
            };

            trends.push(intervalData);
        }

        return {
            period,
            intervals: trends,
            overallTrend: this.calculateTrend(trends)
        };
    },

    async getTopPerformers(limit = 5, userId = null) {
        const performers = [];

        const learningData = await this.analyticsModules.learning.getTopLearners(limit, userId);

        learningData.forEach((user, index) => {
            performers.push({
                rank: index + 1,
                userId: user.id,
                username: user.username,
                avatar: user.avatar,
                score: user.totalScore,
                trend: user.trend,
                metrics: {
                    questionsAnswered: user.questionsAnswered,
                    accuracy: user.accuracy,
                    streakDays: user.streakDays
                }
            });
        });

        return performers;
    },

    async getRecentActivity(limit = 10, userId = null) {
        const activities = [];
        const attendanceRecords = JSON.parse(localStorage.getItem('attendanceRecords') || '[]');
        const exams = JSON.parse(localStorage.getItem('exams') || '[]');
        const votes = JSON.parse(localStorage.getItem('votes') || '[]');
        const users = JSON.parse(localStorage.getItem('users') || '[]');

        attendanceRecords.forEach(record => {
            const user = users.find(u => u.id === record.userId);
            if (user) {
                activities.push({
                    id: record.id.toString(),
                    type: 'attendance',
                    user: { id: user.id.toString(), username: user.name, avatar: user.avatar },
                    description: '完成了签到',
                    timestamp: new Date(record.createdAt),
                    metadata: {}
                });
            }
        });

        exams.forEach(exam => {
            const user = users.find(u => u.id === exam.createdBy);
            activities.push({
                id: exam.id.toString(),
                type: 'exam_created',
                user: { id: (user ? user.id : 'admin').toString(), username: user ? user.name : '管理员', avatar: null },
                description: '创建了考试: ' + exam.title,
                timestamp: new Date(exam.createdAt),
                metadata: {}
            });
        });

        votes.forEach(vote => {
            const user = users.find(u => u.id === vote.createdBy);
            activities.push({
                id: vote.id.toString(),
                type: 'vote_created',
                user: { id: (user ? user.id : 'admin').toString(), username: user ? user.name : '管理员', avatar: null },
                description: '创建了投票: ' + vote.title,
                timestamp: new Date(vote.createdAt),
                metadata: {}
            });
        });

        activities.sort((a, b) => b.timestamp - a.timestamp);
        return activities.slice(0, limit);
    },

    async getPredictions(period, userId) {
        const historicalData = await this.getHistoricalData(period, userId);

        return {
            userGrowth: this.predictUserGrowth(historicalData.users),
            engagementRate: this.predictEngagementRate(historicalData.engagement),
            performanceTrend: this.predictPerformanceTrend(historicalData.performance),
            confidence: 0.75,
            model: 'linear_regression',
            lastUpdated: new Date()
        };
    },

    async getRecommendations(userId) {
        const recommendations = [];

        const weakAreas = await this.identifyWeakAreas(userId);
        if (weakAreas.length > 0) {
            recommendations.push({
                type: 'improvement',
                priority: 'high',
                title: '加强薄弱环节',
                description: `我们在${weakAreas.join('、')}等方面发现你有提升空间`,
                actions: weakAreas.map(area => ({
                    label: `练习${area}`,
                    action: `practice_${area}`,
                    icon: 'fa-pencil'
                }))
            });
        }

        const studyStreak = await this.getStudyStreak(userId);
        if (studyStreak < 3) {
            recommendations.push({
                type: 'motivation',
                priority: 'medium',
                title: '保持学习节奏',
                description: `你已经连续学习${studyStreak}天了，继续坚持！`,
                actions: [
                    { label: '开始今日学习', action: 'start_learning', icon: 'fa-play' }
                ]
            });
        }

        const performance = await this.getRecentPerformance(userId);
        if (performance.improvement > 10) {
            recommendations.push({
                type: 'achievement',
                priority: 'low',
                title: '表现优秀！',
                description: '你的成绩相比上周提升了10%以上',
                actions: []
            });
        }

        return recommendations;
    },

    async identifyWeakAreas(userId) {
        return ['代数', '几何'];
    },

    async getStudyStreak(userId) {
        return 5;
    },

    async getRecentPerformance(userId) {
        return {
            current: 78,
            previous: 68,
            improvement: 10
        };
    },

    predictUserGrowth(data) {
        if (data.length < 2) return { value: 0, trend: 'stable' };

        const recent = data.slice(-7);
        const avgGrowth = recent.reduce((sum, d, i) => {
            if (i === 0) return sum;
            return sum + (d.value - recent[i - 1].value);
        }, 0) / (recent.length - 1);

        return {
            value: Math.round(avgGrowth * 7),
            trend: avgGrowth > 0 ? 'increasing' : avgGrowth < 0 ? 'decreasing' : 'stable'
        };
    },

    predictEngagementRate(data) {
        const avg = data.reduce((sum, d) => sum + d.value, 0) / data.length;
        return {
            value: Math.round(avg),
            trend: 'stable',
            confidence: 0.8
        };
    },

    predictPerformanceTrend(data) {
        const recent = data.slice(-5);
        const trend = this.calculateTrend(recent);

        return {
            direction: trend,
            confidence: 0.7
        };
    },

    calculateTrend(data) {
        if (data.length < 2) return 'stable';

        const values = data.map(d => d.users || d.value || 0);
        const firstHalf = values.slice(0, Math.floor(values.length / 2));
        const secondHalf = values.slice(Math.floor(values.length / 2));

        const firstAvg = firstHalf.reduce((a, b) => a + b, 0) / firstHalf.length;
        const secondAvg = secondHalf.reduce((a, b) => a + b, 0) / secondHalf.length;

        if (secondAvg > firstAvg * 1.05) return 'increasing';
        if (secondAvg < firstAvg * 0.95) return 'decreasing';
        return 'stable';
    },

    async getPeriodComparisons(period, userId) {
        const current = await this.getOverviewMetrics(period, userId);
        const previous = await this.getOverviewMetrics(this.getPreviousPeriod(period), userId);

        return {
            usersChange: this.calculatePercentChange(current.metrics.totalUsers, previous.metrics.totalUsers),
            sessionsChange: this.calculatePercentChange(current.metrics.totalSessions, previous.metrics.totalSessions),
            engagementChange: this.calculatePercentChange(current.metrics.activeUsers, previous.metrics.activeUsers)
        };
    },

    calculatePercentChange(current, previous) {
        if (previous === 0) return current > 0 ? 100 : 0;
        return Math.round(((current - previous) / previous) * 100);
    },

    getStartDate(period) {
        const date = new Date();
        switch (period) {
            case 'day':
                date.setDate(date.getDate() - 1);
                break;
            case 'week':
                date.setDate(date.getDate() - 7);
                break;
            case 'month':
                date.setMonth(date.getMonth() - 1);
                break;
            case 'quarter':
                date.setMonth(date.getMonth() - 3);
                break;
            case 'year':
                date.setFullYear(date.getFullYear() - 1);
                break;
        }
        return date;
    },

    getPreviousPeriod(period) {
        switch (period) {
            case 'day': return 'day';
            case 'week': return 'day';
            case 'month': return 'week';
            case 'quarter': return 'month';
            case 'year': return 'quarter';
            default: return 'week';
        }
    },

    getTimeIntervals(period) {
        const intervals = [];
        const now = new Date();
        let count, labelFormat, substractFn;

        switch (period) {
            case 'day':
                count = 24;
                labelFormat = 'hour';
                substractFn = (d) => d.setHours(d.getHours() - 1);
                break;
            case 'week':
                count = 7;
                labelFormat = 'day';
                substractFn = (d) => d.setDate(d.getDate() - 1);
                break;
            case 'month':
                count = 30;
                labelFormat = 'day';
                substractFn = (d) => d.setDate(d.getDate() - 1);
                break;
            case 'quarter':
                count = 12;
                labelFormat = 'week';
                substractFn = (d) => d.setDate(d.getDate() - 7);
                break;
            case 'year':
                count = 12;
                labelFormat = 'month';
                substractFn = (d) => d.setMonth(d.getMonth() - 1);
                break;
            default:
                count = 7;
                labelFormat = 'day';
                substractFn = (d) => d.setDate(d.getDate() - 1);
        }

        for (let i = 0; i < count; i++) {
            const start = new Date(now);
            substractFn(start);
            const end = new Date(now);

            intervals.push({
                start,
                end,
                label: this.formatIntervalLabel(start, labelFormat)
            });
        }

        return intervals.reverse();
    },

    formatIntervalLabel(date, format) {
        switch (format) {
            case 'hour':
                return `${date.getHours()}时`;
            case 'day':
                return `${date.getMonth() + 1}/${date.getDate()}`;
            case 'week':
                return `第${Math.ceil(date.getDate() / 7)}周`;
            case 'month':
                return `${date.getMonth() + 1}月`;
            default:
                return date.toLocaleDateString();
        }
    },

    async getTotalUsers(userId) {
        return 156;
    },

    async getActiveUsers(startDate, endDate, userId) {
        return Math.floor(Math.random() * 50) + 30;
    },

    async getTotalSessions(startDate, endDate, userId) {
        return Math.floor(Math.random() * 200) + 100;
    },

    async getAverageSessionDuration(startDate, endDate, userId) {
        return Math.floor(Math.random() * 600) + 300;
    },

    async getTotalPageViews(startDate, endDate, userId) {
        return Math.floor(Math.random() * 1000) + 500;
    },

    async getBounceRate(startDate, endDate, userId) {
        return Math.round((Math.random() * 20) + 30);
    },

    async getHistoricalData(period, userId) {
        return {
            users: Array.from({ length: 7 }, (_, i) => ({
                date: new Date(Date.now() - i * 86400000).toLocaleDateString(),
                value: Math.floor(Math.random() * 50) + 30
            })).reverse(),
            engagement: Array.from({ length: 7 }, (_, i) => ({
                date: new Date(Date.now() - i * 86400000).toLocaleDateString(),
                value: Math.floor(Math.random() * 30) + 60
            })).reverse(),
            performance: Array.from({ length: 7 }, (_, i) => ({
                date: new Date(Date.now() - i * 86400000).toLocaleDateString(),
                value: Math.floor(Math.random() * 20) + 70
            })).reverse()
        };
    },

    async sendToServer(endpoint, data) {
        console.log(`[Analytics] Sending to ${endpoint}:`, data);
        return { success: true };
    },

    generateEventId() {
        return 'evt_' + Date.now().toString(36) + Math.random().toString(36).substr(2, 9);
    },

    getCurrentUserId() {
        return localStorage.getItem('userId') || 'anonymous';
    },

    getSessionId() {
        let sessionId = sessionStorage.getItem('analyticsSessionId');
        if (!sessionId) {
            sessionId = 'sess_' + Date.now().toString(36) + Math.random().toString(36).substr(2, 9);
            sessionStorage.setItem('analyticsSessionId', sessionId);
        }
        return sessionId;
    },

    getRealTimeMetrics() {
        return { ...this.realTimeMetrics };
    },

    clearCache() {
        this.analyticsCache.clear();
    }
};

class LearningAnalytics {
    constructor() {
        this.metrics = [];
    }

    async getTopLearners(limit, userId) {
        const users = JSON.parse(localStorage.getItem('users') || '[]');
        const attendanceRecords = JSON.parse(localStorage.getItem('attendanceRecords') || '[]');
        const examRecords = JSON.parse(localStorage.getItem('examRecords') || '[]');

        const learnerData = users.map(user => {
            const userAttendances = attendanceRecords.filter(r => r.userId === user.id);
            const userExamRecords = examRecords.filter(r => r.userId === user.id);
            
            const totalScore = userAttendances.length * 100 + userExamRecords.reduce((sum, r) => sum + (r.score || 0), 0);
            const questionsAnswered = userExamRecords.reduce((sum, r) => sum + (r.answers ? Object.keys(r.answers).length : 0), 0);
            const accuracy = userExamRecords.length > 0 
                ? Math.round((userExamRecords.reduce((sum, r) => sum + (r.score || 0), 0) / (userExamRecords.length * 100)) * 100)
                : 0;
            const streakDays = userAttendances.length > 0 ? Math.min(userAttendances.length, 30) : 0;
            const trend = streakDays >= 7 ? 'up' : streakDays >= 3 ? 'stable' : 'down';

            return {
                id: user.id.toString(),
                username: user.name,
                totalScore,
                trend,
                questionsAnswered,
                accuracy,
                streakDays
            };
        });

        learnerData.sort((a, b) => b.totalScore - a.totalScore);
        return learnerData.slice(0, limit);
    }

    async getLearningPatterns(userId) {
        return {
            peakHours: ['9:00-11:00', '14:00-16:00', '19:00-21:00'],
            preferredDays: ['周一', '周三', '周五'],
            averageSessionLength: 45,
            mostUsedResource: '视频教程'
        };
    }

    async getSubjectPerformance(userId) {
        return [
            { subject: '数学', score: 85, trend: 5, questions: 120, accuracy: 82 },
            { subject: '物理', score: 78, trend: -2, questions: 95, accuracy: 75 },
            { subject: '化学', score: 88, trend: 8, questions: 80, accuracy: 86 },
            { subject: '英语', score: 72, trend: 3, questions: 150, accuracy: 70 }
        ];
    }

    calculateMasteryScore(performanceData) {
        const weights = {
            accuracy: 0.4,
            consistency: 0.3,
            improvement: 0.2,
            engagement: 0.1
        };

        return Math.round(
            performanceData.accuracy * weights.accuracy +
            performanceData.consistency * weights.consistency +
            performanceData.improvement * weights.improvement +
            performanceData.engagement * weights.engagement
        );
    }
}

class PerformanceAnalytics {
    async getResponseTimes() {
        return {
            average: 120,
            p50: 100,
            p95: 250,
            p99: 400
        };
    }

    async getErrorRates() {
        return {
            total: 12,
            byType: {
                validation: 5,
                network: 4,
                server: 2,
                auth: 1
            },
            rate: 0.02
        };
    }

    async getResourceUsage() {
        return {
            cpu: Math.round(Math.random() * 30) + 20,
            memory: Math.round(Math.random() * 40) + 30,
            network: Math.round(Math.random() * 20) + 10
        };
    }
}

class EngagementAnalytics {
    async getUserEngagement(userId) {
        return {
            dailyActiveUsers: 156,
            weeklyActiveUsers: 423,
            monthlyActiveUsers: 892,
            retention: {
                daily: 0.68,
                weekly: 0.45,
                monthly: 0.28
            }
        };
    }

    async getFeatureUsage() {
        return [
            { feature: '错题整理', usageCount: 1523, uniqueUsers: 234, trend: 15 },
            { feature: '签到管理', usageCount: 892, uniqueUsers: 189, trend: -5 },
            { feature: '考试系统', usageCount: 678, uniqueUsers: 156, trend: 8 },
            { feature: '聊天', usageCount: 2341, uniqueUsers: 298, trend: 22 },
            { feature: '文件管理', usageCount: 445, uniqueUsers: 123, trend: 3 }
        ];
    }

    async getDropOffPoints() {
        return [
            { step: '注册', dropOffRate: 0.15 },
            { step: '首次签到', dropOffRate: 0.08 },
            { step: '添加第一个错题', dropOffRate: 0.12 },
            { step: '完成第一次考试', dropOffRate: 0.25 }
        ];
    }
}

class ProgressAnalytics {
    async getCompletionRates() {
        return {
            overall: 0.72,
            byFeature: {
                wrongQuestions: 0.85,
                studyPlans: 0.65,
                exams: 0.78,
                achievements: 0.55
            }
        };
    }

    async getProgressTrends(userId) {
        return {
            weekly: this.generateTrendData(7),
            monthly: this.generateTrendData(30)
        };
    }

    generateTrendData(points) {
        return Array.from({ length: points }, (_, i) => ({
            date: new Date(Date.now() - (points - i) * 86400000).toLocaleDateString(),
            value: Math.floor(Math.random() * 30) + 60
        }));
    }
}

window.AdvancedAnalyticsService = AdvancedAnalyticsService;
