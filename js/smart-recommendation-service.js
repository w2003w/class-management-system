const SmartRecommendationService = {
    initialized: false,
    recommendationEngine: null,
    userProfiles: new Map(),
    itemProfiles: new Map(),
    interactionMatrix: new Map(),
    similarityCache: new Map(),
    lastUpdate: null,

    async init() {
        if (this.initialized) return;

        this.algorithms = {
            collaborative: new CollaborativeFiltering(),
            contentBased: new ContentBasedFiltering(),
            knowledgeBased: new KnowledgeBasedFiltering(),
            hybrid: new HybridRecommender()
        };

        this.recommendationTypes = {
            wrong_questions: { weight: 0.4, freshness: 0.3 },
            study_plans: { weight: 0.3, freshness: 0.2 },
            practice: { weight: 0.2, freshness: 0.4 },
            achievements: { weight: 0.1, freshness: 0.1 }
        };

        this.loadCachedData();
        this.initialized = true;
        console.log('[SmartRecommendationService] 智能推荐服务初始化完成');
    },

    loadCachedData() {
        try {
            const profiles = localStorage.getItem('userProfiles');
            if (profiles) {
                const parsed = JSON.parse(profiles);
                Object.entries(parsed).forEach(([key, value]) => {
                    this.userProfiles.set(key, value);
                });
            }
        } catch (error) {
            console.error('[Recommendation] Failed to load cached data:', error);
        }
    },

    saveUserProfile(userId) {
        const profile = this.userProfiles.get(userId);
        if (profile) {
            const profiles = Object.fromEntries(this.userProfiles);
            localStorage.setItem('userProfiles', JSON.stringify(profiles));
        }
    },

    async getRecommendations(userId, options = {}) {
        const {
            type = 'all',
            limit = 10,
            algorithm = 'hybrid',
            includeReason = true
        } = options;

        const userProfile = await this.getOrCreateUserProfile(userId);

        let recommendations = [];

        switch (algorithm) {
            case 'collaborative':
                recommendations = await this.algorithms.collaborative.getRecommendations(userProfile, limit);
                break;
            case 'contentBased':
                recommendations = await this.algorithms.contentBased.getRecommendations(userProfile, limit);
                break;
            case 'knowledgeBased':
                recommendations = await this.algorithms.knowledgeBased.getRecommendations(userProfile, limit);
                break;
            case 'hybrid':
            default:
                recommendations = await this.algorithms.hybrid.getRecommendations(userProfile, limit);
                break;
        }

        if (includeReason) {
            recommendations = recommendations.map(rec => ({
                ...rec,
                reason: this.generateRecommendationReason(rec, userProfile),
                confidence: rec.confidence || 0.8
            }));
        }

        if (type !== 'all') {
            recommendations = recommendations.filter(rec => rec.type === type);
        }

        return recommendations.slice(0, limit);
    },

    async getOrCreateUserProfile(userId) {
        if (this.userProfiles.has(userId)) {
            return this.userProfiles.get(userId);
        }

        const profile = await this.buildUserProfile(userId);
        this.userProfiles.set(userId, profile);
        return profile;
    },

    async buildUserProfile(userId) {
        const [learningHistory, preferences, performance] = await Promise.all([
            this.getLearningHistory(userId),
            this.getUserPreferences(userId),
            this.getPerformanceData(userId)
        ]);

        return {
            userId,
            interests: this.extractInterests(learningHistory),
            strengths: performance.strengths || [],
            weaknesses: performance.weaknesses || [],
            preferredDifficulty: preferences.difficulty || 'medium',
            preferredStudyTime: preferences.studyTime || 'evening',
            learningStyle: preferences.learningStyle || 'visual',
            goals: preferences.goals || [],
            history: learningHistory,
            statistics: performance,
            lastUpdated: new Date().toISOString()
        };
    },

    async getLearningHistory(userId) {
        return {
            recentSubjects: ['math', 'physics'],
            recentTopics: ['calculus', 'mechanics'],
            completedCourses: 5,
            totalStudyHours: 120,
            streakDays: 7,
            activities: [
                { type: 'wrong_question', subject: 'math', timestamp: Date.now() - 86400000 },
                { type: 'exam', subject: 'physics', score: 85, timestamp: Date.now() - 172800000 }
            ]
        };
    },

    async getUserPreferences(userId) {
        return {
            difficulty: 'medium',
            studyTime: 'evening',
            learningStyle: 'visual',
            goals: ['improve_math', 'prepare_exam']
        };
    },

    async getPerformanceData(userId) {
        return {
            strengths: ['algebra', 'geometry'],
            weaknesses: ['calculus', 'trigonometry'],
            averageScore: 78,
            improvementRate: 5
        };
    },

    extractInterests(history) {
        const interestCounts = {};

        history.recentSubjects?.forEach(subject => {
            interestCounts[subject] = (interestCounts[subject] || 0) + 2;
        });

        history.recentTopics?.forEach(topic => {
            interestCounts[topic] = (interestCounts[topic] || 0) + 1;
        });

        return Object.entries(interestCounts)
            .sort((a, b) => b[1] - a[1])
            .slice(0, 5)
            .map(([name, score]) => ({ name, score }));
    },

    generateRecommendationReason(recommendation, userProfile) {
        if (recommendation.matchReason) {
            return recommendation.matchReason;
        }

        const reasons = [];

        if (recommendation.subject && userProfile.interests?.some(i => i.name === recommendation.subject)) {
            reasons.push('基于你的学习历史');
        }

        if (recommendation.difficulty && userProfile.preferredDifficulty === recommendation.difficulty) {
            reasons.push('符合你的难度偏好');
        }

        if (recommendation.trending) {
            reasons.push('热门内容');
        }

        if (recommendation.friendsLearning) {
            reasons.push('好友正在学习');
        }

        if (reasons.length === 0) {
            reasons.push('为你精选');
        }

        return reasons.join('、');
    },

    async recordInteraction(userId, itemId, itemType, action, metadata = {}) {
        const profile = await this.getOrCreateUserProfile(userId);

        if (!profile.interactions) {
            profile.interactions = [];
        }

        profile.interactions.push({
            itemId,
            itemType,
            action,
            metadata,
            timestamp: new Date().toISOString()
        });

        if (profile.interactions.length > 1000) {
            profile.interactions = profile.interactions.slice(-1000);
        }

        profile.lastUpdated = new Date().toISOString();

        this.saveUserProfile(userId);

        await this.updateItemProfile(itemId, action, metadata);
    },

    async updateItemProfile(itemId, action, metadata) {
        let profile = this.itemProfiles.get(itemId);

        if (!profile) {
            profile = {
                itemId,
                impressions: 0,
                interactions: {},
                avgRating: 0,
                totalRatings: 0
            };
            this.itemProfiles.set(itemId, profile);
        }

        profile.impressions++;

        if (!profile.interactions[action]) {
            profile.interactions[action] = 0;
        }
        profile.interactions[action]++;

        if (action === 'rating') {
            const rating = metadata.rating || 5;
            profile.avgRating = (profile.avgRating * profile.totalRatings + rating) / (profile.totalRatings + 1);
            profile.totalRatings++;
        }
    },

    async getPersonalizedFeed(userId, options = {}) {
        const { limit = 20, refresh = false } = options;

        if (!refresh) {
            const cached = this.getCachedFeed(userId);
            if (cached && Date.now() - cached.timestamp < 300000) {
                return cached.items;
            }
        }

        const [recommendations, trending, forYou] = await Promise.all([
            this.getRecommendations(userId, { limit: 10 }),
            this.getTrendingItems(5),
            this.getForYouItems(userId, 5)
        ]);

        const feed = [
            ...recommendations.map(r => ({ ...r, section: '推荐' })),
            ...trending.map(t => ({ ...t, section: '热门' })),
            ...forYou.map(f => ({ ...f, section: '为你' }))
        ];

        this.cacheFeed(userId, feed);

        return feed.slice(0, limit);
    },

    getCachedFeed(userId) {
        const cacheKey = `feed_${userId}`;
        try {
            const cached = localStorage.getItem(cacheKey);
            if (cached) {
                return JSON.parse(cached);
            }
        } catch (error) {
            console.error('[Recommendation] Failed to get cached feed:', error);
        }
        return null;
    },

    cacheFeed(userId, items) {
        const cacheKey = `feed_${userId}`;
        try {
            localStorage.setItem(cacheKey, JSON.stringify({
                items,
                timestamp: Date.now()
            }));
        } catch (error) {
            console.error('[Recommendation] Failed to cache feed:', error);
        }
    },

    async getTrendingItems(limit = 5) {
        return [
            {
                id: 'trend_1',
                type: 'wrong_question',
                title: '高考数学难题精选',
                description: '历年高考数学压轴题汇总',
                subject: 'math',
                trending: true,
                score: 98,
                interactions: 1234
            },
            {
                id: 'trend_2',
                type: 'practice',
                title: '物理实验专题练习',
                description: '物理实验题专项训练',
                subject: 'physics',
                trending: true,
                score: 95,
                interactions: 987
            }
        ].slice(0, limit);
    },

    async getForYouItems(userId, limit = 5) {
        const profile = await this.getOrCreateUserProfile(userId);

        return profile.weaknesses?.map((weakness, index) => ({
            id: `foryou_${index}`,
            type: 'practice',
            title: `${weakness}专项练习`,
            description: '针对性强化训练',
            matchReason: '根据你的薄弱环节推荐',
            confidence: 0.9 - index * 0.1
        })) || [];
    },

    async getSubjectRecommendations(userId, subject, options = {}) {
        const { limit = 10, level } = options;

        const profile = await this.getOrCreateUserProfile(userId);

        const recommendations = await this.getRecommendations(userId, {
            type: 'all',
            limit: 50,
            algorithm: 'contentBased'
        });

        return recommendations
            .filter(rec => rec.subject === subject)
            .filter(rec => !level || rec.difficulty === level)
            .slice(0, limit);
    },

    async getStudyPlanRecommendations(userId) {
        const profile = await this.getOrCreateUserProfile(userId);

        return [
            {
                id: 'plan_1',
                type: 'study_plan',
                title: '数学能力提升计划',
                description: '针对你的数学薄弱环节定制的学习计划',
                duration: '4周',
                intensity: '中等',
                matchReason: '基于你的学习目标和当前水平',
                confidence: 0.92
            },
            {
                id: 'plan_2',
                type: 'study_plan',
                title: '考前冲刺计划',
                description: '高效复习冲刺方案',
                duration: '2周',
                intensity: '高',
                matchReason: '距离下次考试还有3周',
                confidence: 0.88
            }
        ];
    },

    async getNextQuestionRecommendation(userId, subject) {
        const profile = await this.getOrCreateUserProfile(userId);

        const weaknesses = profile.weaknesses || [];

        if (weaknesses.length > 0) {
            return {
                id: 'next_q_1',
                type: 'wrong_question',
                topic: weaknesses[0],
                title: `${weaknesses[0]}强化练习`,
                difficulty: 'medium',
                estimatedTime: '10分钟',
                matchReason: '这是你的薄弱环节，需要加强练习'
            };
        }

        return {
            id: 'next_q_2',
            type: 'practice',
            topic: '综合复习',
            title: '综合能力测试',
            difficulty: 'medium',
            estimatedTime: '30分钟',
            matchReason: '巩固所学知识'
        };
    },

    async getAchievementRecommendations(userId) {
        const profile = await this.getOrCreateUserProfile(userId);

        const lockedAchievements = [
            {
                id: 'ach_1',
                name: '连续学习7天',
                description: '坚持连续学习一周',
                progress: 3,
                target: 7,
                icon: 'fa-fire'
            },
            {
                id: 'ach_2',
                name: '错题清零',
                description: '掌握所有错题',
                progress: 45,
                target: 100,
                icon: 'fa-trophy'
            }
        ];

        return lockedAchievements.map(ach => ({
            ...ach,
            percentComplete: Math.round((ach.progress / ach.target) * 100),
            recommendation: ach.progress >= ach.target * 0.5
                ? '快要达成了，继续加油！'
                : '开始向这个成就努力吧'
        }));
    },

    async searchRecommendations(userId, query) {
        const recommendations = await this.getRecommendations(userId, { limit: 50 });

        const lowerQuery = query.toLowerCase();

        return recommendations.filter(rec =>
            rec.title.toLowerCase().includes(lowerQuery) ||
            rec.description?.toLowerCase().includes(lowerQuery) ||
            rec.subject?.toLowerCase().includes(lowerQuery)
        );
    },

    async getSimilarUsers(userId, limit = 5) {
        const profile = await this.getOrCreateUserProfile(userId);

        return [
            {
                id: 'similar_1',
                username: '学习达人',
                similarity: 0.92,
                commonInterests: ['math', 'physics'],
                achievements: 15
            },
            {
                id: 'similar_2',
                username: '进步之星',
                similarity: 0.87,
                commonInterests: ['math'],
                achievements: 12
            }
        ].slice(0, limit);
    },

    async dismissRecommendation(userId, itemId, reason = 'not_interested') {
        console.log(`[Recommendation] Dismissing ${itemId} for user ${userId}, reason: ${reason}`);

        const profile = await this.getOrCreateUserProfile(userId);

        if (!profile.dismissedItems) {
            profile.dismissedItems = [];
        }

        profile.dismissedItems.push({
            itemId,
            reason,
            timestamp: new Date().toISOString()
        });

        this.saveUserProfile(userId);

        return { success: true };
    },

    async updatePreferences(userId, preferences) {
        const profile = await this.getOrCreateUserProfile(userId);

        Object.assign(profile, {
            preferredDifficulty: preferences.difficulty || profile.preferredDifficulty,
            preferredStudyTime: preferences.studyTime || profile.preferredStudyTime,
            learningStyle: preferences.learningStyle || profile.learningStyle,
            goals: preferences.goals || profile.goals,
            lastUpdated: new Date().toISOString()
        });

        this.saveUserProfile(userId);

        return profile;
    }
};

class CollaborativeFiltering {
    async getRecommendations(userProfile, limit) {
        return [
            {
                id: 'cf_rec_1',
                type: 'wrong_question',
                title: '协作过滤推荐题目',
                description: '与你相似的用户都在做这道题',
                subject: 'math',
                confidence: 0.85
            }
        ].slice(0, limit);
    }
}

class ContentBasedFiltering {
    async getRecommendations(userProfile, limit) {
        const interests = userProfile.interests || [];

        return interests.map((interest, index) => ({
            id: `cb_rec_${index}`,
            type: 'practice',
            title: `基于"${interest.name}"的练习`,
            description: '根据你的学习历史推荐',
            subject: interest.name,
            confidence: Math.min(interest.score / 10, 0.95)
        })).slice(0, limit);
    }
}

class KnowledgeBasedFiltering {
    async getRecommendations(userProfile, limit) {
        const weaknesses = userProfile.weaknesses || [];

        return weaknesses.map((weakness, index) => ({
            id: `kb_rec_${index}`,
            type: 'wrong_question',
            title: `${weakness}知识点讲解`,
            description: '针对薄弱环节的知识巩固',
            matchReason: '你的薄弱环节',
            confidence: 0.95 - index * 0.05
        })).slice(0, limit);
    }
}

class HybridRecommender {
    async getRecommendations(userProfile, limit) {
        const [collaborative, contentBased, knowledgeBased] = await Promise.all([
            new CollaborativeFiltering().getRecommendations(userProfile, limit * 2),
            new ContentBasedFiltering().getRecommendations(userProfile, limit * 2),
            new KnowledgeBasedFiltering().getRecommendations(userProfile, limit * 2)
        ]);

        const allRecommendations = [...collaborative, ...contentBased, ...knowledgeBased];

        const scored = allRecommendations.map(rec => {
            let score = rec.confidence || 0.5;

            if (rec.matchReason) {
                score += 0.1;
            }

            if (rec.subject && userProfile.interests?.some(i => i.name === rec.subject)) {
                score += 0.15;
            }

            if (!userProfile.weaknesses?.includes(rec.topic)) {
                score += 0.05;
            }

            return { ...rec, score };
        });

        scored.sort((a, b) => b.score - a.score);

        const seen = new Set();
        const unique = scored.filter(rec => {
            if (seen.has(rec.id)) return false;
            seen.add(rec.id);
            return true;
        });

        return unique.slice(0, limit);
    }
}

window.SmartRecommendationService = SmartRecommendationService;
