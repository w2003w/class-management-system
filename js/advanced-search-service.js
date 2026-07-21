const AdvancedSearchService = {
    initialized: false,
    searchIndex: new Map(),
    fuzzySearch: {
        enabled: true,
        threshold: 0.6,
        maxResults: 100
    },
    filters: new Map(),
    sortOptions: {
        field: null,
        order: 'asc'
    },
    
    async init() {
        if (this.initialized) return;
        
        this.initialized = true;
        console.log('[AdvancedSearchService] 搜索服务初始化完成');
    },
    
    indexCollection(name, items, options = {}) {
        const { keyField = 'id', searchableFields = [], weightMap = {} } = options;
        
        console.log(`[AdvancedSearchService] 索引集合: ${name}, 项目数: ${items.length}`);
        
        const index = {
            items: new Map(),
            invertedIndex: new Map(),
            keyField,
            searchableFields
        };
        
        items.forEach(item => {
            const key = item[keyField];
            index.items.set(key, item);
            
            searchableFields.forEach(field => {
                const value = this.getNestedValue(item, field);
                if (value !== undefined && value !== null) {
                    const tokens = this.tokenize(String(value));
                    
                    tokens.forEach(token => {
                        if (!index.invertedIndex.has(token)) {
                            index.invertedIndex.set(token, new Set());
                        }
                        index.invertedIndex.get(token).add(key);
                    });
                }
            });
        });
        
        this.searchIndex.set(name, index);
        console.log(`[AdvancedSearchService] 集合 ${name} 索引完成，倒排索引条目: ${index.invertedIndex.size}`);
        
        return index;
    },
    
    tokenize(text) {
        if (!text) return [];
        
        return text
            .toLowerCase()
            .replace(/[^\w\s\u4e00-\u9fa5]/g, ' ')
            .split(/\s+/)
            .filter(token => token.length > 0);
    },
    
    getNestedValue(obj, path) {
        if (!path) return undefined;
        
        return path.split('.').reduce((current, key) => {
            return current && current[key] !== undefined ? current[key] : undefined;
        }, obj);
    },
    
    search(collectionName, query, options = {}) {
        const {
            fuzzy = this.fuzzySearch.enabled,
            maxResults = this.fuzzySearch.maxResults,
            filters = {},
            sortBy = null,
            sortOrder = 'asc'
        } = options;
        
        console.log(`[AdvancedSearchService] 搜索集合: ${collectionName}, 查询: ${query}`);
        
        const index = this.searchIndex.get(collectionName);
        if (!index) {
            console.warn(`[AdvancedSearchService] 集合不存在: ${collectionName}`);
            return [];
        }
        
        const tokens = this.tokenize(query);
        if (tokens.length === 0) {
            return this.getAllItems(index, filters, sortBy, sortOrder, maxResults);
        }
        
        const candidateKeys = this.getCandidateKeys(index, tokens, fuzzy);
        const candidates = candidateKeys.map(key => index.items.get(key)).filter(Boolean);
        
        const scored = candidates.map(item => {
            const score = this.calculateScore(item, tokens, index.searchableFields);
            return { item, score };
        });
        
        const filtered = this.applyFilters(scored, filters);
        const sorted = this.sortResults(filtered, sortBy, sortOrder);
        
        const results = sorted.slice(0, maxResults).map(r => ({
            ...r.item,
            _score: r.score
        }));
        
        console.log(`[AdvancedSearchService] 搜索完成，结果数: ${results.length}`);
        return results;
    },
    
    getCandidateKeys(index, tokens, fuzzy) {
        const tokenScores = new Map();
        
        tokens.forEach(token => {
            if (index.invertedIndex.has(token)) {
                const keys = index.invertedIndex.get(token);
                keys.forEach(key => {
                    tokenScores.set(key, (tokenScores.get(key) || 0) + 1);
                });
            }
            
            if (fuzzy) {
                index.invertedIndex.forEach((keys, indexedToken) => {
                    if (token !== indexedToken) {
                        const similarity = this.calculateSimilarity(token, indexedToken);
                        if (similarity >= this.fuzzySearch.threshold) {
                            keys.forEach(key => {
                                tokenScores.set(key, (tokenScores.get(key) || 0) + similarity);
                            });
                        }
                    }
                });
            }
        });
        
        return Array.from(tokenScores.entries())
            .sort((a, b) => b[1] - a[1])
            .map(([key]) => key);
    },
    
    calculateScore(item, tokens, searchableFields) {
        let score = 0;
        
        tokens.forEach(token => {
            searchableFields.forEach(field => {
                const value = String(this.getNestedValue(item, field) || '').toLowerCase();
                
                if (value.includes(token)) {
                    const exactMatches = (value.match(new RegExp(token, 'g')) || []).length;
                    score += exactMatches * 10;
                    
                    if (value === token) {
                        score += 50;
                    } else if (value.startsWith(token)) {
                        score += 30;
                    } else if (value.endsWith(token)) {
                        score += 20;
                    }
                }
            });
        });
        
        return score;
    },
    
    calculateSimilarity(str1, str2) {
        const longer = str1.length > str2.length ? str1 : str2;
        const shorter = str1.length > str2.length ? str2 : str1;
        
        if (longer.length === 0) return 1.0;
        
        const editDistance = this.levenshteinDistance(longer, shorter);
        return (longer.length - editDistance) / longer.length;
    },
    
    levenshteinDistance(str1, str2) {
        const m = str1.length;
        const n = str2.length;
        const dp = Array(m + 1).fill(null).map(() => Array(n + 1).fill(0));
        
        for (let i = 0; i <= m; i++) dp[i][0] = i;
        for (let j = 0; j <= n; j++) dp[0][j] = j;
        
        for (let i = 1; i <= m; i++) {
            for (let j = 1; j <= n; j++) {
                if (str1[i - 1] === str2[j - 1]) {
                    dp[i][j] = dp[i - 1][j - 1];
                } else {
                    dp[i][j] = 1 + Math.min(
                        dp[i - 1][j],
                        dp[i][j - 1],
                        dp[i - 1][j - 1]
                    );
                }
            }
        }
        
        return dp[m][n];
    },
    
    applyFilters(scoredItems, filters) {
        if (Object.keys(filters).length === 0) {
            return scoredItems;
        }
        
        return scoredItems.filter(({ item }) => {
            for (const [field, value] of Object.entries(filters)) {
                const itemValue = this.getNestedValue(item, field);
                
                if (Array.isArray(value)) {
                    if (!value.includes(itemValue)) {
                        return false;
                    }
                } else if (typeof value === 'object') {
                    if (value.min !== undefined && itemValue < value.min) return false;
                    if (value.max !== undefined && itemValue > value.max) return false;
                    if (value.contains && !String(itemValue).includes(value.contains)) return false;
                    if (value.regex && !new RegExp(value.regex).test(String(itemValue))) return false;
                } else {
                    if (itemValue !== value) return false;
                }
            }
            return true;
        });
    },
    
    sortResults(scoredItems, sortBy, sortOrder) {
        if (!sortBy) {
            return scoredItems.sort((a, b) => b.score - a.score);
        }
        
        return scoredItems.sort((a, b) => {
            const aVal = this.getNestedValue(a.item, sortBy);
            const bVal = this.getNestedValue(b.item, sortBy);
            
            if (aVal < bVal) return sortOrder === 'asc' ? -1 : 1;
            if (aVal > bVal) return sortOrder === 'asc' ? 1 : -1;
            return 0;
        });
    },
    
    getAllItems(index, filters, sortBy, sortOrder, maxResults) {
        let items = Array.from(index.items.values());
        
        if (Object.keys(filters).length > 0) {
            items = items.filter(item => {
                for (const [field, value] of Object.entries(filters)) {
                    const itemValue = this.getNestedValue(item, field);
                    if (itemValue !== value) return false;
                }
                return true;
            });
        }
        
        if (sortBy) {
            items.sort((a, b) => {
                const aVal = this.getNestedValue(a, sortBy);
                const bVal = this.getNestedValue(b, sortBy);
                if (aVal < bVal) return sortOrder === 'asc' ? -1 : 1;
                if (aVal > bVal) return sortOrder === 'asc' ? 1 : -1;
                return 0;
            });
        }
        
        return items.slice(0, maxResults);
    },
    
    addToIndex(collectionName, item) {
        const index = this.searchIndex.get(collectionName);
        if (!index) {
            console.warn(`[AdvancedSearchService] 集合不存在: ${collectionName}`);
            return;
        }
        
        const key = item[index.keyField];
        index.items.set(key, item);
        
        index.searchableFields.forEach(field => {
            const value = this.getNestedValue(item, field);
            if (value !== undefined && value !== null) {
                const tokens = this.tokenize(String(value));
                tokens.forEach(token => {
                    if (!index.invertedIndex.has(token)) {
                        index.invertedIndex.set(token, new Set());
                    }
                    index.invertedIndex.get(token).add(key);
                });
            }
        });
    },
    
    removeFromIndex(collectionName, key) {
        const index = this.searchIndex.get(collectionName);
        if (!index) return;
        
        const item = index.items.get(key);
        if (!item) return;
        
        index.items.delete(key);
        
        index.searchableFields.forEach(field => {
            const value = this.getNestedValue(item, field);
            if (value !== undefined && value !== null) {
                const tokens = this.tokenize(String(value));
                tokens.forEach(token => {
                    const keys = index.invertedIndex.get(token);
                    if (keys) {
                        keys.delete(key);
                        if (keys.size === 0) {
                            index.invertedIndex.delete(token);
                        }
                    }
                });
            }
        });
    },
    
    updateInIndex(collectionName, key, updates) {
        this.removeFromIndex(collectionName, key);
        
        const index = this.searchIndex.get(collectionName);
        if (!index) return;
        
        const item = index.items.get(key);
        if (item) {
            this.addToIndex(collectionName, { ...item, ...updates });
        }
    },
    
    clearIndex(collectionName) {
        this.searchIndex.delete(collectionName);
        console.log(`[AdvancedSearchService] 清除索引: ${collectionName}`);
    },
    
    clearAllIndexes() {
        this.searchIndex.clear();
        console.log('[AdvancedSearchService] 清除所有索引');
    },
    
    getIndexStats(collectionName) {
        const index = this.searchIndex.get(collectionName);
        if (!index) return null;
        
        return {
            itemCount: index.items.size,
            termCount: index.invertedIndex.size,
            searchableFields: index.searchableFields
        };
    },
    
    suggest(collectionName, partial, options = {}) {
        const { maxSuggestions = 5 } = options;
        
        const index = this.searchIndex.get(collectionName);
        if (!index) return [];
        
        const tokens = this.tokenize(partial);
        if (tokens.length === 0) return [];
        
        const lastToken = tokens[tokens.length - 1];
        const suggestions = new Set();
        
        index.invertedIndex.forEach((keys, term) => {
            if (term.startsWith(lastToken) && term !== lastToken) {
                suggestions.add(term);
            }
        });
        
        return Array.from(suggestions).slice(0, maxSuggestions);
    },
    
    highlightMatches(text, query) {
        if (!text || !query) return text;
        
        const tokens = this.tokenize(query);
        let result = String(text);
        
        tokens.forEach(token => {
            const regex = new RegExp(`(${token})`, 'gi');
            result = result.replace(regex, '<mark>$1</mark>');
        });
        
        return result;
    },
    
    fuzzyMatch(text, query, threshold = 0.6) {
        const textLower = text.toLowerCase();
        const queryLower = query.toLowerCase();
        
        if (textLower.includes(queryLower)) {
            return { match: true, score: 1 };
        }
        
        const similarity = this.calculateSimilarity(textLower, queryLower);
        
        return {
            match: similarity >= threshold,
            score: similarity
        };
    }
};

window.AdvancedSearchService = AdvancedSearchService;