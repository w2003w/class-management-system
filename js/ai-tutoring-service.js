const AITutoringService = {
    initialized: false,
    sessionHistory: [],
    contextWindow: 10,
    maxTokens: 2000,

    async init() {
        if (this.initialized) return;

        this.supportedSubjects = {
            math: {
                name: '数学',
                keywords: ['计算', '方程', '函数', '几何', '代数', '微积分', '概率', '统计'],
                learningLevels: ['基础', '进阶', '高级']
            },
            physics: {
                name: '物理',
                keywords: ['力学', '电磁学', '光学', '热学', '量子', '相对论'],
                learningLevels: ['基础', '进阶', '高级']
            },
            chemistry: {
                name: '化学',
                keywords: ['元素', '反应', '方程式', '有机', '无机', '分析'],
                learningLevels: ['基础', '进阶', '高级']
            },
            english: {
                name: '英语',
                keywords: ['语法', '词汇', '阅读', '写作', '口语', '听力'],
                learningLevels: ['基础', '进阶', '高级']
            },
            chinese: {
                name: '语文',
                keywords: ['阅读', '写作', '文言文', '古诗', '现代文'],
                learningLevels: ['基础', '进阶', '高级']
            }
        };

        this.tutoringModes = {
            concept: {
                name: '概念讲解',
                description: '详细解释概念和原理',
                responseStyle: '详细、逐步讲解'
            },
            problem: {
                name: '解题辅导',
                description: '帮助解决具体问题',
                responseStyle: '分析思路、给出解答'
            },
            practice: {
                name: '练习巩固',
                description: '提供练习题并讲解',
                responseStyle: '出题、验证、讲解'
            },
            review: {
                name: '复习总结',
                description: '帮助复习和总结知识点',
                responseStyle: '归纳、整理、强调重点'
            }
        };

        this.knowledgeGraph = new Map();
        this.conceptCache = new Map();

        this.initialized = true;
        console.log('[AITutoringService] AI辅导服务初始化完成');
    },

    async createSession(userId, sessionType = 'tutoring', context = {}) {
        const session = {
            id: this.generateId(),
            userId: userId,
            type: sessionType,
            mode: 'concept',
            context: {
                subject: context.subject || null,
                topic: context.topic || null,
                level: context.level || '基础',
                preferences: context.preferences || {}
            },
            messages: [],
            createdAt: new Date(),
            lastActivity: new Date(),
            status: 'active'
        };

        this.sessionHistory.push(session);
        return session;
    },

    async sendMessage(sessionId, message, options = {}) {
        const session = this.sessionHistory.find(s => s.id === sessionId);
        if (!session) {
            throw new Error('Session not found');
        }

        const userMessage = {
            id: this.generateId(),
            type: 'user',
            content: message,
            timestamp: new Date(),
            metadata: options.metadata || {}
        };

        session.messages.push(userMessage);
        session.lastActivity = new Date();

        const aiResponse = await this.generateResponse(session, message, options);

        const assistantMessage = {
            id: this.generateId(),
            type: 'ai',
            content: aiResponse.content,
            timestamp: new Date(),
            metadata: {
                mode: session.mode,
                suggestions: aiResponse.suggestions || [],
                resources: aiResponse.resources || [],
                confidence: aiResponse.confidence || 0.8
            }
        };

        session.messages.push(assistantMessage);

        if (session.messages.length > this.contextWindow * 2) {
            session.messages = session.messages.slice(-this.contextWindow * 2);
        }

        return {
            session,
            userMessage,
            assistantMessage
        };
    },

    async generateResponse(session, userMessage, options = {}) {
        const { mode = session.mode, subject, topic } = options;

        const contextMessages = session.messages.slice(-this.contextWindow * 2);
        const conversationHistory = contextMessages.map(m => ({
            role: m.type === 'user' ? 'user' : 'assistant',
            content: m.content
        }));

        const systemPrompt = this.buildSystemPrompt(session, mode);

        let responseContent = '';
        let suggestions = [];
        let resources = [];

        const lowerMessage = userMessage.toLowerCase();

        if (this.containsKeywords(lowerMessage, ['什么是', '解释', '概念', '定义', '原理'])) {
            responseContent = this.generateConceptExplanation(userMessage, subject, topic);
            suggestions = this.generateRelatedConcepts(subject, topic);
            resources = this.findLearningResources(subject, topic);
        } else if (this.containsKeywords(lowerMessage, ['怎么算', '解题', '解答', '计算', '步骤'])) {
            responseContent = this.generateProblemSolution(userMessage, subject, topic);
            suggestions = this.generateSimilarProblems(subject, topic);
            resources = this.findPracticeResources(subject, topic);
        } else if (this.containsKeywords(lowerMessage, ['为什么', '为什么', '原因', '解释原因'])) {
            responseContent = this.generateExplanation(userMessage, subject, topic);
            suggestions = this.generateDeeperExplorations(subject, topic);
        } else if (this.containsKeywords(lowerMessage, ['练习', '做题', '测试', '巩固'])) {
            responseContent = this.generatePracticeQuestions(subject, topic);
            suggestions = ['开始练习', '查看答案', '请求提示'];
        } else if (this.containsKeywords(lowerMessage, ['总结', '复习', '归纳'])) {
            responseContent = this.generateSummary(subject, topic);
            suggestions = ['详细复习', '开始练习', '查看相关知识点'];
        } else if (this.containsKeywords(lowerMessage, ['help', '帮助', '怎么用'])) {
            responseContent = this.generateHelpGuide();
            suggestions = ['开始辅导', '查看功能', '联系支持'];
        } else {
            responseContent = this.generateGeneralResponse(userMessage, session);
            suggestions = this.generateContextualSuggestions(session);
        }

        return {
            content: responseContent,
            suggestions,
            resources,
            confidence: 0.85
        };
    },

    buildSystemPrompt(session, mode) {
        const modeConfig = this.tutoringModes[mode] || this.tutoringModes.concept;
        const subjectContext = session.context.subject
            ? `当前科目：${this.supportedSubjects[session.context.subject]?.name || session.context.subject}`
            : '未指定科目';

        return `你是班级管理系统的AI学习助手，名为"小助教"。

角色定位：
- 专业知识丰富，能够讲解各个学科的知识
- 耐心细致，适合不同学习水平的学生
- 善于引导思考，不直接给答案而是帮助学生自己找到答案

当前设置：
- 模式：${modeConfig.name} (${modeConfig.description})
- ${subjectContext}
- 学习水平：${session.context.level || '基础'}
- 响应风格：${modeConfig.responseStyle}

指导原则：
1. 用通俗易懂的语言解释复杂概念
2. 适当使用例子和类比帮助理解
3. 鼓励学生思考，主动提问
4. 不直接给完整答案，而是引导思考过程
5. 适时总结重点和难点
6. 提供延伸学习建议

请用中文回答，语气友好专业。`;
    },

    generateConceptExplanation(question, subject, topic) {
        const baseExplanation = `
同学你好！让我来帮你理解这个问题。

## 概念解析

根据你的问题，我来详细解释一下相关的概念：

### 1. 基本定义
（这里应该根据具体问题填充内容）
**核心要点：**
• 要点一：这是关于...的基本定义
• 要点二：它主要特点是...
• 要点三：在实际应用中...

### 2. 理解要点
- **重点**：需要特别记住的关键点
- **难点**：通常容易混淆或出错的地方
- **联系**：与其他知识点的关联

### 3. 示例说明
假设我们有一个例子：...

### 4. 记忆技巧
使用口诀或形象记忆法：...

### 5. 延伸思考
- 这个概念在生活中有哪些应用？
- 与之前学的哪些知识有联系？

如果你有具体的问题想要深入了解，欢迎继续提问！我会针对你的疑问进行更详细的解答。
        `.trim();

        return baseExplanation;
    },

    generateProblemSolution(problem, subject, topic) {
        return `
收到你的问题！让我们一起来分析这道题。

## 题目分析

首先，仔细审题：
- 这是关于**${topic || '数学'}**的问题
- 关键信息：...

## 解题思路

### 第一步：理解题意
我们需要明确：...

### 第二步：寻找方法
常用的方法有：
1. 方法一：...
2. 方法二：...

### 第三步：逐步解答
**解答过程：**

解：
1. 首先，...
2. 然后，...
3. 最后，...

### 第四步：验证结果
将结果代入原题验证：...

## 总结
这道题的关键是：
• 掌握基本概念
• 熟练运用方法
• 仔细认真计算

## 举一反三
试着做一下类似的题目：
1. ...
2. ...

遇到不懂的地方随时问我！
        `.trim();
    },

    generateExplanation(question, subject, topic) {
        return `
好问题！让我来解释一下为什么。

## 原因分析

这个问题涉及到以下核心原理：

### 1. 根本原因
之所以...，主要是因为...

### 2. 详细解释
- **第一个原因**：...
- **第二个原因**：...
- **第三个原因**：...

### 3. 生活中的例子
就像生活中常见的情况：...

### 4. 图示说明
（如果有配图会更好理解）

### 5. 相关知识链接
这个原理与以下知识相关：
• ...
• ...

如果还有不明白的地方，欢迎继续提问！
        `.trim();
    },

    generatePracticeQuestions(subject, topic) {
        const questionTypes = ['选择题', '填空题', '解答题'];
        const randomType = questionTypes[Math.floor(Math.random() * questionTypes.length)];

        return `
太好了！让我们来做一些练习巩固一下。

## 练习题目

### ${randomType}

**第1题**
${this.generateRandomQuestion(subject, topic, 'easy')}

**第2题**
${this.generateRandomQuestion(subject, topic, 'medium')}

**第3题**
${this.generateRandomQuestion(subject, topic, 'hard')}

## 答题提示
1. 先认真读题，弄清题意
2. 回顾相关知识点
3. 应用正确的方法解题
4. 仔细检查答案

完成后来找我核对答案，我会为你详细讲解！

想要什么类型的练习？基础题、提高题还是综合题？
        `.trim();
    },

    generateRandomQuestion(subject, topic, difficulty) {
        const patterns = {
            easy: [
                `1 + 1 = ?`,
                `已知 x = 2，求 2x + 3 = ?`,
                `三角形的内角和是多少度？`
            ],
            medium: [
                `解方程：2x + 5 = 15`,
                `已知圆的半径为3cm，求圆的面积（π取3.14）`,
                `化简：√18`
            ],
            hard: [
                `求函数 y = x² - 4x + 3 的顶点坐标`,
                `证明：等腰三角形两底角相等`,
                `计算：∫(0到1) x² dx`
            ]
        };

        const questions = patterns[difficulty] || patterns.medium;
        return questions[Math.floor(Math.random() * questions.length)];
    },

    generateSummary(subject, topic) {
        return `
## 知识点总结

### ${topic || subject} 核心要点

#### 一、本章重点
1. **核心概念1**：...（简要说明）
2. **核心概念2**：...（简要说明）
3. **核心概念3**：...（简要说明）

#### 二、常用公式
• 公式一：...
• 公式二：...
• 公式三：...

#### 三、解题方法
| 方法 | 适用情况 | 关键步骤 |
|------|----------|----------|
| 方法1 | ... | ①... ②... |
| 方法2 | ... | ①... ②... |

#### 四、易错点提醒
⚠️ **注意**：以下地方容易出错
• ...
• ...

#### 五、经典例题
（可选：附上1-2道典型例题）

#### 六、学习建议
1. 先理解概念，再记忆公式
2. 多做练习，总结规律
3. 及时复习，避免遗忘

---

需要我详细讲解哪个部分吗？或者想做些练习题巩固一下？
        `.trim();
    },

    generateHelpGuide() {
        return `
## 📚 小助教使用指南

你好！我是小助教，你的AI学习伙伴。

### 🎯 我能做什么？

#### 1. 概念讲解
如果你不明白某个概念或定义，问我"什么是XXX"或"解释一下XXX"，我会给你详细讲解。

#### 2. 解题辅导
遇到不会做的题目？发给我，我会引导你一步步找到答案，而不是直接给你答案哦！

#### 3. 练习巩固
想要做题练习？告诉我"出几道题"或"我想练习"，我会给你适合难度的题目。

#### 4. 复习总结
考试前想要复习？告诉我想要复习的科目，我会帮你梳理重点知识。

#### 5. 答疑解惑
有任何学习上的问题都可以问我！

### 💡 小技巧

• **具体提问**：问题越具体，解答越精准
  ✅ "一元二次方程的求根公式是什么？"
  ❌ "方程怎么解？"

• **指定科目**：告诉我你在学什么科目
  ✅ "数学：函数的概念"
  ❌ "这个怎么算？"

• **分步提问**：复杂问题分成小问题问
  ✅ "先问基础概念，再问应用"

### 🎮 使用示例

```
用户：什么是勾股定理？
小助教：勾股定理是直角三角形中的一条重要性质...

用户：帮我解这道题：已知直角三角形两直角边为3和4...
小助教：好的！让我们一步步来分析这道题...

用户：给我出几道二元一次方程的练习题
小助教：当然！以下是你要的练习题...
```

### 🚀 开始使用

直接输入你的问题开始吧！例如：
• "解释一下三角函数"
• "这道数学题怎么做..."
• "我想练习代数"
• "帮我总结一下这章的重点"

祝你学习愉快！💪
        `.trim();
    },

    generateGeneralResponse(message, session) {
        const responses = [
            `我理解你的问题。让我来帮你分析一下：\n\n首先，...这说明...\n\n基于这个理解，我可以给你以下建议：\n\n1. ...\n2. ...\n3. ...\n\n还有什么具体想了解的吗？`,
            `这是个很好的问题！让我思考一下...\n\n根据我的分析，这个问题涉及到...方面的知识。\n\n建议你：\n• 首先...了解基础\n• 然后...深入学习\n• 最后...实践应用\n\n需要我详细解释哪个方面吗？`,
            `好的，让我帮你理清思路。\n\n这个问题可以分解为以下几个部分：\n\n**第一部分**：...\n**第二部分**：...\n**第三部分**：...\n\n每个部分都有对应的解决方法，我们可以逐一攻克。\n\n从哪里开始？告诉我你的想法！`
        ];

        return responses[Math.floor(Math.random() * responses.length)];
    },

    generateRelatedConcepts(subject, topic) {
        return [
            '查看相关公式',
            '了解应用场景',
            '做练习题',
            '联系实际问题'
        ];
    },

    generateSimilarProblems(subject, topic) {
        return [
            '查看解题技巧',
            '练习同类型题目',
            '挑战更高难度'
        ];
    },

    generateDeeperExplorations(subject, topic) {
        return [
            '深入了解原理',
            '查看证明过程',
            '探索更多应用'
        ];
    },

    generateContextualSuggestions(session) {
        const suggestions = [];

        if (session.context.subject) {
            suggestions.push(`练习${this.supportedSubjects[session.context.subject]?.name || ''}题目`);
        }

        suggestions.push('讲解某个知识点');
        suggestions.push('总结学习方法');
        suggestions.push('出一些练习题');

        return suggestions;
    },

    findLearningResources(subject, topic) {
        return [
            { type: 'article', title: '相关知识点讲解', url: '#' },
            { type: 'video', title: '视频教程', url: '#' },
            { type: 'practice', title: '在线练习', url: '#' }
        ];
    },

    findPracticeResources(subject, topic) {
        return [
            { type: 'worksheet', title: '练习题下载', url: '#' },
            { type: 'quiz', title: '在线测验', url: '#' }
        ];
    },

    containsKeywords(text, keywords) {
        return keywords.some(keyword => text.includes(keyword));
    },

    async analyzeQuestion(questionText) {
        const analysis = {
            subject: null,
            topic: null,
            difficulty: 'medium',
            questionType: 'unknown',
            keywords: []
        };

        const subjectIndicators = {
            math: ['计算', '方程', '函数', '几何', '代数', '微积分', '概率', '数字', '图形', '面积', '体积'],
            physics: ['力', '速度', '能量', '电磁', '光', '热', '运动', '质量', '密度'],
            chemistry: ['反应', '元素', '分子', '原子', '化学式', '方程式', '酸碱', '氧化'],
            english: ['english', '单词', '语法', '句子', '阅读', '写作', '翻译'],
            chinese: ['文章', '阅读', '写作', '古诗', '文言文', '中心思想', '段落']
        };

        const lowerQuestion = questionText.toLowerCase();

        for (const [subject, indicators] of Object.entries(subjectIndicators)) {
            if (indicators.some(ind => lowerQuestion.includes(ind))) {
                analysis.subject = subject;
                break;
            }
        }

        if (questionText.includes('？') || questionText.includes('?') || questionText.includes('计算')) {
            analysis.questionType = 'problem';
        } else if (questionText.includes('什么是') || questionText.includes('解释')) {
            analysis.questionType = 'concept';
        } else if (questionText.includes('为什么')) {
            analysis.questionType = 'explanation';
        }

        const difficultyIndicators = {
            easy: ['简单', '基础', '基本'],
            hard: ['困难', '很难', '复杂', '竞赛']
        };

        for (const [level, indicators] of Object.entries(difficultyIndicators)) {
            if (indicators.some(ind => lowerQuestion.includes(ind))) {
                analysis.difficulty = level;
                break;
            }
        }

        return analysis;
    },

    async updateSessionMode(sessionId, newMode) {
        const session = this.sessionHistory.find(s => s.id === sessionId);
        if (session && this.tutoringModes[newMode]) {
            session.mode = newMode;
            return session;
        }
        throw new Error('Invalid mode or session not found');
    },

    async archiveSession(sessionId) {
        const session = this.sessionHistory.find(s => s.id === sessionId);
        if (session) {
            session.status = 'archived';
            session.archivedAt = new Date();
            return session;
        }
        throw new Error('Session not found');
    },

    async getSessionHistory(userId, options = {}) {
        const { limit = 10, offset = 0, status = 'all' } = options;

        let filtered = this.sessionHistory.filter(s => s.userId === userId);

        if (status !== 'all') {
            filtered = filtered.filter(s => s.status === status);
        }

        filtered.sort((a, b) => new Date(b.lastActivity) - new Date(a.lastActivity));

        return {
            sessions: filtered.slice(offset, offset + limit),
            total: filtered.length,
            hasMore: offset + limit < filtered.length
        };
    },

    async getLearningInsights(userId) {
        const userSessions = this.sessionHistory.filter(s => s.userId === userId);
        const totalMessages = userSessions.reduce((sum, s) => sum + s.messages.length, 0);

        const subjectCounts = {};
        userSessions.forEach(s => {
            if (s.context.subject) {
                subjectCounts[s.context.subject] = (subjectCounts[s.context.subject] || 0) + 1;
            }
        });

        const mostStudiedSubject = Object.entries(subjectCounts)
            .sort((a, b) => b[1] - a[1])[0]?.[0] || null;

        return {
            totalSessions: userSessions.length,
            totalMessages,
            activeDays: new Set(userSessions.map(s =>
                new Date(s.lastActivity).toDateString()
            )).size,
            mostStudiedSubject,
            subjectDistribution: subjectCounts,
            averageSessionLength: totalMessages / (userSessions.length || 1)
        };
    },

    buildKnowledgeGraph(subject, topic) {
        const nodeId = `${subject}-${topic}`;

        if (this.knowledgeGraph.has(nodeId)) {
            return this.knowledgeGraph.get(nodeId);
        }

        const node = {
            id: nodeId,
            subject,
            topic,
            connections: [],
            relatedTopics: [],
            masteryLevel: 0,
            lastReviewed: null,
            learningPath: []
        };

        const topicConnections = {
            '函数': ['方程', '不等式', '图像'],
            '三角函数': ['三角恒等式', '解三角形'],
            '几何': ['三角形', '圆', '多边形'],
            '代数': ['多项式', '因式分解'],
            '概率': ['统计', '排列组合']
        };

        if (topicConnections[topic]) {
            node.relatedTopics = topicConnections[topic];
            node.connections = topicConnections[topic].map(t => ({
                topic: t,
                strength: Math.random() * 0.5 + 0.5
            }));
        }

        this.knowledgeGraph.set(nodeId, node);

        return node;
    },

    async getRecommendedTopic(userId, subject) {
        const userSessions = this.sessionHistory.filter(
            s => s.userId === userId && s.context.subject === subject
        );

        const studiedTopics = new Set(userSessions.map(s => s.context.topic));

        const allTopics = {
            math: ['函数', '三角函数', '几何', '代数', '概率', '统计'],
            physics: ['力学', '电磁学', '光学', '热学'],
            chemistry: ['元素周期表', '化学反应', '有机化学'],
            english: ['语法', '词汇', '阅读理解', '写作'],
            chinese: ['现代文阅读', '文言文', '古诗词', '写作']
        };

        const subjectTopics = allTopics[subject] || [];
        const unstudiedTopics = subjectTopics.filter(t => !studiedTopics.has(t));

        if (unstudiedTopics.length === 0) {
            return {
                topic: subjectTopics[Math.floor(Math.random() * subjectTopics.length)],
                reason: '你已经学完了所有话题，这是随机推荐'
            };
        }

        return {
            topic: unstudiedTopics[0],
            reason: '根据你的学习进度，推荐从这个话题开始'
        };
    },

    generateLearningPath(subject, targetLevel = 'intermediate') {
        const paths = {
            math: {
                beginner: ['基础运算', '简单方程', '基础几何', '初等函数'],
                intermediate: ['代数基础', '三角函数', '数列', '不等式'],
                advanced: ['高等代数', '微积分入门', '解析几何']
            },
            physics: {
                beginner: ['运动基础', '力学入门', '简单热学'],
                intermediate: ['牛顿定律', '能量守恒', '电磁学基础'],
                advanced: ['波动光学', '量子物理', '相对论']
            },
            chemistry: {
                beginner: ['物质结构', '元素周期表', '化学用语'],
                intermediate: ['化学反应类型', '物质的量', '元素化合物'],
                advanced: ['有机化学', '化学平衡', '电化学']
            }
        };

        const subjectPaths = paths[subject] || paths.math;
        return subjectPaths[targetLevel] || subjectPaths.intermediate;
    },

    generateId() {
        return 'ai_' + Date.now().toString(36) + Math.random().toString(36).substr(2, 9);
    }
};

window.AITutoringService = AITutoringService;
