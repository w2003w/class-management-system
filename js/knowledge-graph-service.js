const KnowledgeGraphService = {
    initialized: false,
    nodes: new Map(),
    edges: new Map(),
    adjacencyList: new Map(),
    nodeCache: new Map(),
    maxCacheSize: 100,

    async init() {
        if (this.initialized) return;

        this.subjectConfigurations = {
            math: {
                color: '#3B82F6',
                icon: 'fa-calculator',
                topics: ['代数', '几何', '函数', '三角函数', '微积分', '概率统计']
            },
            physics: {
                color: '#10B981',
                icon: 'fa-flask',
                topics: ['力学', '电磁学', '光学', '热学', '量子物理']
            },
            chemistry: {
                color: '#F59E0B',
                icon: 'fa-beaker',
                topics: ['无机化学', '有机化学', '物理化学', '分析化学']
            },
            english: {
                color: '#8B5CF6',
                icon: 'fa-language',
                topics: ['语法', '词汇', '阅读', '写作', '听力', '口语']
            },
            chinese: {
                color: '#EF4444',
                icon: 'fa-book',
                topics: ['现代文', '文言文', '古诗词', '写作', '文学常识']
            }
        };

        this.nodeTypes = {
            concept: { name: '概念', icon: 'fa-lightbulb', color: '#FBBF24' },
            formula: { name: '公式', icon: 'fa-function', color: '#3B82F6' },
            principle: { name: '原理', icon: 'fa-atom', color: '#10B981' },
            method: { name: '方法', icon: 'fa-cogs', color: '#8B5CF6' },
            example: { name: '例题', icon: 'fa-file-alt', color: '#F59E0B' },
            topic: { name: '专题', icon: 'fa-folder', color: '#EF4444' }
        };

        this.initialized = true;
        console.log('[KnowledgeGraphService] 知识图谱服务初始化完成');
    },

    async createNode(data) {
        const node = {
            id: this.generateId(),
            type: data.type || 'concept',
            subject: data.subject,
            topic: data.topic,
            name: data.name,
            description: data.description || '',
            importance: data.importance || 1,
            masteryLevel: 0,
            difficulty: data.difficulty || 1,
            connections: [],
            metadata: data.metadata || {},
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
        };

        this.nodes.set(node.id, node);
        this.updateAdjacencyList(node);

        return node;
    },

    async createEdge(sourceId, targetId, relationship = 'related', strength = 1) {
        if (!this.nodes.has(sourceId) || !this.nodes.has(targetId)) {
            throw new Error('Source or target node not found');
        }

        const edgeId = `${sourceId}-${targetId}`;
        const edge = {
            id: edgeId,
            source: sourceId,
            target: targetId,
            type: relationship,
            strength: Math.min(Math.max(strength, 0), 1),
            createdAt: new Date().toISOString()
        };

        this.edges.set(edgeId, edge);

        const sourceNode = this.nodes.get(sourceId);
        const targetNode = this.nodes.get(targetId);
        sourceNode.connections.push({ nodeId: targetId, type: relationship, strength });
        targetNode.connections.push({ nodeId: sourceId, type: relationship, strength });

        return edge;
    },

    async getNode(nodeId) {
        if (this.nodeCache.has(nodeId)) {
            return this.nodeCache.get(nodeId);
        }

        const node = this.nodes.get(nodeId);
        if (node) {
            this.cacheNode(node);
        }

        return node;
    },

    async getRelatedNodes(nodeId, options = {}) {
        const { depth = 1, relationship, minStrength = 0 } = options;
        const node = this.nodes.get(nodeId);
        if (!node) return [];

        const relatedNodes = new Map();
        const visited = new Set([nodeId]);

        this.findRelatedNodes(nodeId, depth, relatedNodes, visited, relationship, minStrength);

        return Array.from(relatedNodes.values());
    },

    findRelatedNodes(nodeId, remainingDepth, result, visited, relationship, minStrength) {
        if (remainingDepth === 0) return;

        const node = this.nodes.get(nodeId);
        if (!node) return;

        for (const connection of node.connections) {
            if (visited.has(connection.nodeId)) continue;
            if (relationship && connection.type !== relationship) continue;
            if (connection.strength < minStrength) continue;

            visited.add(connection.nodeId);
            const relatedNode = this.nodes.get(connection.nodeId);

            if (relatedNode) {
                result.set(connection.nodeId, {
                    ...relatedNode,
                    relationship: connection.type,
                    connectionStrength: connection.strength,
                    depth: depth - remainingDepth + 1
                });

                this.findRelatedNodes(connection.nodeId, remainingDepth - 1, result, visited, relationship, minStrength);
            }
        }
    },

    async getLearningPath(startNodeId, endNodeId, userId) {
        const startNode = this.nodes.get(startNodeId);
        const endNode = this.nodes.get(endNodeId);

        if (!startNode || !endNode) {
            throw new Error('Start or end node not found');
        }

        const path = this.findShortestPath(startNodeId, endNodeId);

        const enrichedPath = path.map(nodeId => {
            const node = this.nodes.get(nodeId);
            const mastery = this.getUserMasteryLevel(nodeId, userId);

            return {
                ...node,
                masteryLevel: mastery,
                isLearned: mastery >= 0.8,
                needsReview: mastery < 0.6 && mastery > 0,
                isNew: mastery === 0
            };
        });

        return {
            path: enrichedPath,
            totalNodes: path.length,
            estimatedTime: enrichedPath.filter(n => !n.isLearned).length * 15,
            difficulty: this.calculatePathDifficulty(enrichedPath)
        };
    },

    findShortestPath(startId, endId) {
        const queue = [[startId]];
        const visited = new Set([startId]);

        while (queue.length > 0) {
            const path = queue.shift();
            const currentId = path[path.length - 1];

            if (currentId === endId) {
                return path;
            }

            const node = this.nodes.get(currentId);
            if (!node) continue;

            for (const connection of node.connections) {
                if (!visited.has(connection.nodeId)) {
                    visited.add(connection.nodeId);
                    queue.push([...path, connection.nodeId]);
                }
            }
        }

        return [startId, endId];
    },

    calculatePathDifficulty(path) {
        if (path.length === 0) return 'easy';

        const avgDifficulty = path.reduce((sum, node) => sum + (node.difficulty || 1), 0) / path.length;
        const newNodes = path.filter(n => n.isNew).length;
        const difficultyScore = avgDifficulty + (newNodes * 0.5);

        if (difficultyScore < 1.5) return 'easy';
        if (difficultyScore < 2.5) return 'medium';
        if (difficultyScore < 3.5) return 'hard';
        return 'expert';
    },

    async updateMasteryLevel(nodeId, userId, level) {
        const node = this.nodes.get(nodeId);
        if (!node) {
            throw new Error('Node not found');
        }

        node.masteryLevel = Math.min(Math.max(level, 0), 1);
        node.updatedAt = new Date().toISOString();

        return node;
    },

    getUserMasteryLevel(nodeId, userId) {
        return Math.random() * 0.5 + 0.3;
    },

    async getSubjectGraph(subject) {
        const subjectNodes = Array.from(this.nodes.values())
            .filter(node => node.subject === subject);

        const nodeIds = new Set(subjectNodes.map(n => n.id));

        const subjectEdges = Array.from(this.edges.values())
            .filter(edge => nodeIds.has(edge.source) && nodeIds.has(edge.target));

        return {
            nodes: subjectNodes,
            edges: subjectEdges,
            statistics: {
                totalNodes: subjectNodes.length,
                totalEdges: subjectEdges.length,
                avgConnections: subjectNodes.reduce((sum, n) => sum + n.connections.length, 0) / subjectNodes.length
            }
        };
    },

    async getRecommendations(userId, options = {}) {
        const { subject, limit = 5, type } = options;

        let candidates = Array.from(this.nodes.values());

        if (subject) {
            candidates = candidates.filter(n => n.subject === subject);
        }

        if (type) {
            candidates = candidates.filter(n => n.type === type);
        }

        candidates = candidates.filter(n => {
            const mastery = this.getUserMasteryLevel(n.id, userId);
            return mastery < 0.7;
        });

        candidates.sort((a, b) => {
            const masteryA = this.getUserMasteryLevel(a.id, userId);
            const masteryB = this.getUserMasteryLevel(b.id, userId);
            const importanceA = a.importance || 1;
            const importanceB = b.importance || 1;

            return (importanceA * (1 - masteryA)) - (importanceB * (1 - masteryB));
        });

        return candidates.slice(0, limit).map(node => ({
            ...node,
            masteryLevel: this.getUserMasteryLevel(node.id, userId),
            recommendationReason: this.getRecommendationReason(node)
        }));
    },

    getRecommendationReason(node) {
        if (node.masteryLevel === 0) {
            return '这是新知识点，建议学习';
        }

        if (node.masteryLevel < 0.5) {
            return '这部分掌握不够，需要加强';
        }

        if (node.connections.length > 3) {
            return '这是核心概念，连接较多';
        }

        return '建议复习巩固';
    },

    async searchNodes(query, options = {}) {
        const { subject, type, limit = 20 } = options;
        const lowerQuery = query.toLowerCase();

        let results = Array.from(this.nodes.values())
            .filter(node => {
                if (!node.name.toLowerCase().includes(lowerQuery) &&
                    !node.description.toLowerCase().includes(lowerQuery)) {
                    return false;
                }

                if (subject && node.subject !== subject) return false;
                if (type && node.type !== type) return false;

                return true;
            })
            .sort((a, b) => {
                const aNameMatch = a.name.toLowerCase().includes(lowerQuery);
                const bNameMatch = b.name.toLowerCase().includes(lowerQuery);

                if (aNameMatch && !bNameMatch) return -1;
                if (!aNameMatch && bNameMatch) return 1;

                return (b.importance || 1) - (a.importance || 1);
            })
            .slice(0, limit);

        return results;
    },

    async getStatistics(userId) {
        const nodes = Array.from(this.nodes.values());
        const edges = Array.from(this.edges.values());

        const subjectStats = {};
        const typeStats = {};

        for (const node of nodes) {
            if (!subjectStats[node.subject]) {
                subjectStats[node.subject] = { count: 0, totalMastery: 0 };
            }
            subjectStats[node.subject].count++;
            subjectStats[node.subject].totalMastery += this.getUserMasteryLevel(node.id, userId);

            if (!typeStats[node.type]) {
                typeStats[node.type] = { count: 0 };
            }
            typeStats[node.type].count++;
        }

        for (const subject in subjectStats) {
            subjectStats[subject].avgMastery =
                subjectStats[subject].totalMastery / subjectStats[subject].count;
        }

        return {
            totalNodes: nodes.length,
            totalEdges: edges.length,
            subjectStatistics: subjectStats,
            typeStatistics: typeStats,
            avgConnections: nodes.reduce((sum, n) => sum + n.connections.length, 0) / nodes.length,
            mostConnected: this.getMostConnectedNodes(5)
        };
    },

    getMostConnectedNodes(limit) {
        return Array.from(this.nodes.values())
            .sort((a, b) => b.connections.length - a.connections.length)
            .slice(0, limit)
            .map(n => ({ id: n.id, name: n.name, connections: n.connections.length }));
    },

    async importNodes(nodesData) {
        const imported = [];
        const failed = [];

        for (const nodeData of nodesData) {
            try {
                const node = await this.createNode(nodeData);
                imported.push(node);
            } catch (error) {
                failed.push({ data: nodeData, error: error.message });
            }
        }

        if (nodesData.edges && Array.isArray(nodesData.edges)) {
            for (const edgeData of nodesData.edges) {
                try {
                    await this.createEdge(edgeData.source, edgeData.target, edgeData.type, edgeData.strength);
                } catch (error) {
                    console.error('Failed to create edge:', error);
                }
            }
        }

        return { imported: imported.length, failed };
    },

    async exportGraph(subject) {
        const graph = await this.getSubjectGraph(subject);

        return {
            exportDate: new Date().toISOString(),
            subject,
            nodes: graph.nodes.map(n => ({
                type: n.type,
                subject: n.subject,
                topic: n.topic,
                name: n.name,
                description: n.description,
                importance: n.importance,
                difficulty: n.difficulty
            })),
            edges: graph.edges.map(e => ({
                source: e.source,
                target: e.target,
                type: e.type,
                strength: e.strength
            }))
        };
    },

    updateAdjacencyList(node) {
        if (!this.adjacencyList.has(node.id)) {
            this.adjacencyList.set(node.id, new Set());
        }

        for (const connection of node.connections) {
            this.adjacencyList.get(node.id).add(connection.nodeId);
        }
    },

    cacheNode(node) {
        if (this.nodeCache.size >= this.maxCacheSize) {
            const firstKey = this.nodeCache.keys().next().value;
            this.nodeCache.delete(firstKey);
        }

        this.nodeCache.set(node.id, node);
    },

    clearCache() {
        this.nodeCache.clear();
    },

    generateId() {
        return 'kg_' + Date.now().toString(36) + Math.random().toString(36).substr(2, 9);
    }
};

window.KnowledgeGraphService = KnowledgeGraphService;
