const Utils = {
    formatDate(date, format = 'YYYY-MM-DD') {
        if (!date) return '';
        
        const d = typeof date === 'string' ? new Date(date) : date;
        
        const year = d.getFullYear();
        const month = String(d.getMonth() + 1).padStart(2, '0');
        const day = String(d.getDate()).padStart(2, '0');
        const hours = String(d.getHours()).padStart(2, '0');
        const minutes = String(d.getMinutes()).padStart(2, '0');
        const seconds = String(d.getSeconds()).padStart(2, '0');
        
        return format
            .replace('YYYY', year)
            .replace('MM', month)
            .replace('DD', day)
            .replace('HH', hours)
            .replace('mm', minutes)
            .replace('ss', seconds);
    },
    
    formatDateTime(date) {
        return this.formatDate(date, 'YYYY-MM-DD HH:mm:ss');
    },
    
    formatTime(date) {
        return this.formatDate(date, 'HH:mm:ss');
    },
    
    formatRelativeTime(date) {
        if (!date) return '';
        
        const now = new Date();
        const d = typeof date === 'string' ? new Date(date) : date;
        const diff = now.getTime() - d.getTime();
        
        const minutes = Math.floor(diff / (1000 * 60));
        const hours = Math.floor(diff / (1000 * 60 * 60));
        const days = Math.floor(diff / (1000 * 60 * 60 * 24));
        const weeks = Math.floor(diff / (1000 * 60 * 60 * 24 * 7));
        const months = Math.floor(diff / (1000 * 60 * 60 * 24 * 30));
        const years = Math.floor(diff / (1000 * 60 * 60 * 24 * 365));
        
        if (minutes < 1) return '刚刚';
        if (minutes < 60) return `${minutes}分钟前`;
        if (hours < 24) return `${hours}小时前`;
        if (days < 7) return `${days}天前`;
        if (weeks < 4) return `${weeks}周前`;
        if (months < 12) return `${months}个月前`;
        return `${years}年前`;
    },
    
    formatDuration(minutes) {
        if (minutes < 60) return `${minutes}分钟`;
        
        const hours = Math.floor(minutes / 60);
        const mins = minutes % 60;
        
        if (mins === 0) return `${hours}小时`;
        return `${hours}小时${mins}分钟`;
    },
    
    formatNumber(num, decimals = 0) {
        if (num === undefined || num === null || isNaN(num)) return '0';
        
        return Number(num).toLocaleString('zh-CN', {
            minimumFractionDigits: decimals,
            maximumFractionDigits: decimals
        });
    },
    
    formatCurrency(amount, currency = 'CNY') {
        if (amount === undefined || amount === null || isNaN(amount)) return '¥0.00';
        
        const formatter = new Intl.NumberFormat('zh-CN', {
            style: 'currency',
            currency: currency,
            minimumFractionDigits: 2
        });
        
        return formatter.format(amount);
    },
    
    formatFileSize(bytes) {
        if (bytes === undefined || bytes === null || bytes === 0) return '0 B';
        
        const k = 1024;
        const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        
        return `${parseFloat((bytes / Math.pow(k, i)).toFixed(2))} ${sizes[i]}`;
    },
    
    generateId(prefix = '') {
        const uuid = crypto.randomUUID();
        return prefix ? `${prefix}_${uuid}` : uuid;
    },
    
    generateShortId(length = 8) {
        const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
        let result = '';
        
        for (let i = 0; i < length; i++) {
            result += chars.charAt(Math.floor(Math.random() * chars.length));
        }
        
        return result;
    },
    
    debounce(func, wait) {
        let timeout;
        
        return function executedFunction(...args) {
            const later = () => {
                clearTimeout(timeout);
                func(...args);
            };
            
            clearTimeout(timeout);
            timeout = setTimeout(later, wait);
        };
    },
    
    throttle(func, limit) {
        let inThrottle;
        
        return function executedFunction(...args) {
            if (!inThrottle) {
                func(...args);
                inThrottle = true;
                setTimeout(() => (inThrottle = false), limit);
            }
        };
    },
    
    async sleep(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    },
    
    random(min, max) {
        return Math.floor(Math.random() * (max - min + 1)) + min;
    },
    
    shuffle(array) {
        const arr = [...array];
        
        for (let i = arr.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [arr[i], arr[j]] = [arr[j], arr[i]];
        }
        
        return arr;
    },
    
    truncate(text, maxLength, suffix = '...') {
        if (!text) return '';
        
        if (text.length <= maxLength) return text;
        
        return text.substring(0, maxLength) + suffix;
    },
    
    capitalize(str) {
        if (!str) return '';
        return str.charAt(0).toUpperCase() + str.slice(1);
    },
    
    capitalizeWords(str) {
        if (!str) return '';
        return str.replace(/\b\w/g, char => char.toUpperCase());
    },
    
    snakeToCamel(str) {
        if (!str) return '';
        return str.replace(/_([a-z])/g, (_, letter) => letter.toUpperCase());
    },
    
    camelToSnake(str) {
        if (!str) return '';
        return str.replace(/([A-Z])/g, '_$1').toLowerCase();
    },
    
    kebabToCamel(str) {
        if (!str) return '';
        return str.replace(/-([a-z])/g, (_, letter) => letter.toUpperCase());
    },
    
    camelToKebab(str) {
        if (!str) return '';
        return str.replace(/([A-Z])/g, '-$1').toLowerCase();
    },
    
    isValidEmail(email) {
        const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        return re.test(email);
    },
    
    isValidPhone(phone) {
        const re = /^1[3-9]\d{9}$/;
        return re.test(phone);
    },
    
    isValidUrl(url) {
        const re = /^(https?:\/\/)?([\da-z.-]+)\.([a-z.]{2,6})([/\w.-]*)*\/?$/;
        return re.test(url);
    },
    
    isValidIdCard(idCard) {
        const re = /^[1-9]\d{5}(18|19|20)\d{2}(0[1-9]|1[0-2])(0[1-9]|[12]\d|3[01])\d{3}[\dXx]$/;
        return re.test(idCard);
    },
    
    isValidDate(date) {
        return !isNaN(new Date(date).getTime());
    },
    
    parseQueryString(queryString) {
        if (!queryString) return {};
        
        const params = {};
        const pairs = queryString.startsWith('?') ? queryString.slice(1).split('&') : queryString.split('&');
        
        for (const pair of pairs) {
            const [key, value] = pair.split('=');
            params[decodeURIComponent(key)] = decodeURIComponent(value || '');
        }
        
        return params;
    },
    
    stringifyQueryString(params) {
        if (!params || Object.keys(params).length === 0) return '';
        
        const pairs = [];
        
        for (const [key, value] of Object.entries(params)) {
            if (value !== undefined && value !== null && value !== '') {
                pairs.push(`${encodeURIComponent(key)}=${encodeURIComponent(value)}`);
            }
        }
        
        return pairs.join('&');
    },
    
    getUrlParam(name) {
        const params = new URLSearchParams(window.location.search);
        return params.get(name);
    },
    
    setUrlParam(name, value) {
        const params = new URLSearchParams(window.location.search);
        params.set(name, value);
        window.history.replaceState({}, '', `${window.location.pathname}?${params.toString()}`);
    },
    
    removeUrlParam(name) {
        const params = new URLSearchParams(window.location.search);
        params.delete(name);
        window.history.replaceState({}, '', `${window.location.pathname}?${params.toString()}`);
    },
    
    getCookie(name) {
        const value = `; ${document.cookie}`;
        const parts = value.split(`; ${name}=`);
        if (parts.length === 2) return parts.pop().split(';').shift();
        return null;
    },
    
    setCookie(name, value, days = 7) {
        const date = new Date();
        date.setTime(date.getTime() + (days * 24 * 60 * 60 * 1000));
        const expires = `expires=${date.toUTCString()}`;
        document.cookie = `${name}=${value}; ${expires}; path=/; SameSite=Lax`;
    },
    
    deleteCookie(name) {
        document.cookie = `${name}=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;`;
    },
    
    storageGet(key) {
        try {
            const value = localStorage.getItem(key);
            return value ? JSON.parse(value) : null;
        } catch (error) {
            console.error('[Utils] localStorage读取失败:', error);
            return null;
        }
    },
    
    storageSet(key, value) {
        try {
            localStorage.setItem(key, JSON.stringify(value));
        } catch (error) {
            console.error('[Utils] localStorage写入失败:', error);
        }
    },
    
    storageRemove(key) {
        try {
            localStorage.removeItem(key);
        } catch (error) {
            console.error('[Utils] localStorage删除失败:', error);
        }
    },
    
    storageClear() {
        try {
            localStorage.clear();
        } catch (error) {
            console.error('[Utils] localStorage清空失败:', error);
        }
    },
    
    deepClone(obj) {
        if (obj === null || typeof obj !== 'object') return obj;
        
        if (obj instanceof Date) return new Date(obj.getTime());
        if (obj instanceof Array) return obj.map(item => this.deepClone(item));
        
        const clone = {};
        for (const key in obj) {
            if (Object.prototype.hasOwnProperty.call(obj, key)) {
                clone[key] = this.deepClone(obj[key]);
            }
        }
        
        return clone;
    },
    
    mergeDeep(target, ...sources) {
        if (!sources.length) return target;
        const source = sources.shift();
        
        if (this.isObject(target) && this.isObject(source)) {
            for (const key in source) {
                if (this.isObject(source[key])) {
                    if (!target[key]) Object.assign(target, { [key]: {} });
                    this.mergeDeep(target[key], source[key]);
                } else {
                    Object.assign(target, { [key]: source[key] });
                }
            }
        }
        
        return this.mergeDeep(target, ...sources);
    },
    
    isObject(item) {
        return item !== null && typeof item === 'object';
    },
    
    arrayUnique(array) {
        return [...new Set(array)];
    },
    
    arrayIntersection(...arrays) {
        return arrays.reduce((a, b) => a.filter(c => b.includes(c)));
    },
    
    arrayDifference(a, b) {
        return a.filter(item => !b.includes(item));
    },
    
    arrayChunk(array, size) {
        const chunks = [];
        for (let i = 0; i < array.length; i += size) {
            chunks.push(array.slice(i, i + size));
        }
        return chunks;
    },
    
    flattenArray(array) {
        return array.reduce((acc, val) => 
            acc.concat(Array.isArray(val) ? this.flattenArray(val) : val), []
        );
    },
    
    groupBy(array, key) {
        return array.reduce((groups, item) => {
            const group = item[key];
            groups[group] = groups[group] || [];
            groups[group].push(item);
            return groups;
        }, {});
    },
    
    sortBy(array, key, order = 'asc') {
        return [...array].sort((a, b) => {
            const aVal = a[key];
            const bVal = b[key];
            
            if (aVal < bVal) return order === 'asc' ? -1 : 1;
            if (aVal > bVal) return order === 'asc' ? 1 : -1;
            return 0;
        });
    },
    
    sumBy(array, key) {
        return array.reduce((sum, item) => sum + (item[key] || 0), 0);
    },
    
    averageBy(array, key) {
        if (array.length === 0) return 0;
        return this.sumBy(array, key) / array.length;
    },
    
    maxBy(array, key) {
        if (array.length === 0) return null;
        return array.reduce((max, item) => 
            item[key] > max[key] ? item : max
        );
    },
    
    minBy(array, key) {
        if (array.length === 0) return null;
        return array.reduce((min, item) => 
            item[key] < min[key] ? item : min
        );
    },
    
    findBy(array, key, value) {
        return array.find(item => item[key] === value);
    },
    
    findIndexBy(array, key, value) {
        return array.findIndex(item => item[key] === value);
    },
    
    removeBy(array, key, value) {
        return array.filter(item => item[key] !== value);
    },
    
    replaceBy(array, key, value, newItem) {
        return array.map(item => 
            item[key] === value ? { ...item, ...newItem } : item
        );
    },
    
    pick(obj, keys) {
        return keys.reduce((acc, key) => {
            if (key in obj) acc[key] = obj[key];
            return acc;
        }, {});
    },
    
    omit(obj, keys) {
        return Object.keys(obj).reduce((acc, key) => {
            if (!keys.includes(key)) acc[key] = obj[key];
            return acc;
        }, {});
    },
    
    has(obj, key) {
        return Object.prototype.hasOwnProperty.call(obj, key);
    },
    
    size(obj) {
        if (Array.isArray(obj)) return obj.length;
        if (obj && typeof obj === 'object') return Object.keys(obj).length;
        return 0;
    },
    
    isEmpty(obj) {
        return this.size(obj) === 0;
    },
    
    isEqual(a, b) {
        if (a === b) return true;
        if (a === null || b === null) return false;
        if (typeof a !== typeof b) return false;
        
        if (typeof a === 'object') {
            const aKeys = Object.keys(a);
            const bKeys = Object.keys(b);
            
            if (aKeys.length !== bKeys.length) return false;
            
            for (const key of aKeys) {
                if (!this.isEqual(a[key], b[key])) return false;
            }
            
            return true;
        }
        
        return false;
    },
    
    generateColor() {
        const colors = [
            '#EF4444', '#F97316', '#F59E0B', '#EAB308', '#84CC16',
            '#22C55E', '#10B981', '#14B8A6', '#06B6D4', '#0EA5E9',
            '#3B82F6', '#6366F1', '#8B5CF6', '#A855F7', '#D946EF', '#EC4899'
        ];
        return colors[Math.floor(Math.random() * colors.length)];
    },
    
    hexToRgb(hex) {
        const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
        return result ? {
            r: parseInt(result[1], 16),
            g: parseInt(result[2], 16),
            b: parseInt(result[3], 16)
        } : null;
    },
    
    rgbToHex(r, g, b) {
        return '#' + [r, g, b].map(x => {
            const hex = Math.round(x).toString(16);
            return hex.length === 1 ? '0' + hex : hex;
        }).join('');
    },
    
    darkenColor(hex, percent) {
        const rgb = this.hexToRgb(hex);
        if (!rgb) return hex;
        
        const factor = 1 - (percent / 100);
        return this.rgbToHex(
            Math.max(0, rgb.r * factor),
            Math.max(0, rgb.g * factor),
            Math.max(0, rgb.b * factor)
        );
    },
    
    lightenColor(hex, percent) {
        const rgb = this.hexToRgb(hex);
        if (!rgb) return hex;
        
        const factor = percent / 100;
        return this.rgbToHex(
            Math.min(255, rgb.r + (255 - rgb.r) * factor),
            Math.min(255, rgb.g + (255 - rgb.g) * factor),
            Math.min(255, rgb.b + (255 - rgb.b) * factor)
        );
    },
    
    scrollToTop() {
        window.scrollTo({ top: 0, behavior: 'smooth' });
    },
    
    scrollToElement(selector) {
        const element = document.querySelector(selector);
        if (element) {
            element.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
    },
    
    smoothScroll(destination, duration = 500) {
        const start = window.scrollY;
        const startTime = performance.now();
        
        function scroll(currentTime) {
            const elapsed = currentTime - startTime;
            const progress = Math.min(elapsed / duration, 1);
            
            const easeOutQuart = 1 - Math.pow(1 - progress, 4);
            window.scrollTo(0, start + (destination - start) * easeOutQuart);
            
            if (progress < 1) {
                requestAnimationFrame(scroll);
            }
        }
        
        requestAnimationFrame(scroll);
    },
    
    isInViewport(element) {
        const rect = element.getBoundingClientRect();
        return (
            rect.top >= 0 &&
            rect.left >= 0 &&
            rect.bottom <= (window.innerHeight || document.documentElement.clientHeight) &&
            rect.right <= (window.innerWidth || document.documentElement.clientWidth)
        );
    },
    
    observeIntersection(element, callback, options = {}) {
        const observer = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    callback(entry);
                }
            });
        }, {
            root: options.root || null,
            rootMargin: options.rootMargin || '0px',
            threshold: options.threshold || 0.1
        });
        
        observer.observe(element);
        return observer;
    },
    
    getDeviceType() {
        const userAgent = navigator.userAgent;
        
        if (/mobile/i.test(userAgent)) return 'mobile';
        if (/tablet/i.test(userAgent)) return 'tablet';
        return 'desktop';
    },
    
    isTouchDevice() {
        return 'ontouchstart' in window || navigator.maxTouchPoints > 0;
    },
    
    getBrowserInfo() {
        const userAgent = navigator.userAgent;
        
        let browser = 'Unknown';
        let version = 'Unknown';
        
        if (userAgent.includes('Chrome')) {
            browser = 'Chrome';
            version = userAgent.match(/Chrome\/(\d+)/)[1];
        } else if (userAgent.includes('Firefox')) {
            browser = 'Firefox';
            version = userAgent.match(/Firefox\/(\d+)/)[1];
        } else if (userAgent.includes('Safari')) {
            browser = 'Safari';
            version = userAgent.match(/Version\/(\d+)/)[1];
        } else if (userAgent.includes('Edge')) {
            browser = 'Edge';
            version = userAgent.match(/Edge\/(\d+)/)[1];
        } else if (userAgent.includes('Opera') || userAgent.includes('OPR')) {
            browser = 'Opera';
            version = userAgent.match(/OPR\/(\d+)/)[1];
        }
        
        return { browser, version, userAgent };
    },
    
    getScreenSize() {
        return {
            width: window.innerWidth,
            height: window.innerHeight,
            screenWidth: screen.width,
            screenHeight: screen.height
        };
    },
    
    getNetworkInfo() {
        if (!navigator.connection) {
            return { type: 'unknown', effectiveType: 'unknown' };
        }
        
        return {
            type: navigator.connection.type,
            effectiveType: navigator.connection.effectiveType,
            downlink: navigator.connection.downlink,
            rtt: navigator.connection.rtt
        };
    },
    
    async fetchJson(url, options = {}) {
        const defaultOptions = {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json'
            },
            credentials: 'same-origin'
        };
        
        const config = { ...defaultOptions, ...options };
        
        if (config.body && typeof config.body !== 'string') {
            config.body = JSON.stringify(config.body);
        }
        
        try {
            const response = await fetch(url, config);
            
            if (!response.ok) {
                const error = await response.json().catch(() => ({ message: 'Network error' }));
                throw new Error(error.message || `HTTP error! status: ${response.status}`);
            }
            
            return await response.json();
        } catch (error) {
            console.error('[Utils] fetchJson失败:', error);
            throw error;
        }
    },
    
    async fetchText(url, options = {}) {
        const defaultOptions = {
            method: 'GET',
            credentials: 'same-origin'
        };
        
        const config = { ...defaultOptions, ...options };
        
        try {
            const response = await fetch(url, config);
            
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            
            return await response.text();
        } catch (error) {
            console.error('[Utils] fetchText失败:', error);
            throw error;
        }
    },
    
    async fetchBlob(url, options = {}) {
        const defaultOptions = {
            method: 'GET',
            credentials: 'same-origin'
        };
        
        const config = { ...defaultOptions, ...options };
        
        try {
            const response = await fetch(url, config);
            
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            
            return await response.blob();
        } catch (error) {
            console.error('[Utils] fetchBlob失败:', error);
            throw error;
        }
    },
    
    base64Encode(str) {
        return btoa(unescape(encodeURIComponent(str)));
    },
    
    base64Decode(str) {
        return decodeURIComponent(escape(atob(str)));
    },
    
    async asyncForEach(array, callback) {
        for (let index = 0; index < array.length; index++) {
            await callback(array[index], index, array);
        }
    },
    
    async promiseAllSettled(promises) {
        const results = await Promise.allSettled(promises);
        
        return results.map((result, index) => ({
            index,
            status: result.status,
            value: result.status === 'fulfilled' ? result.value : null,
            reason: result.status === 'rejected' ? result.reason : null
        }));
    },
    
    async retryPromise(fn, retries = 3, delay = 1000) {
        try {
            return await fn();
        } catch (error) {
            if (retries > 0) {
                await this.sleep(delay);
                return this.retryPromise(fn, retries - 1, delay * 2);
            }
            throw error;
        }
    },
    
    uuid() {
        return crypto.randomUUID();
    },
    
    md5(str) {
        let hash = 0;
        for (let i = 0; i < str.length; i++) {
            const char = str.charCodeAt(i);
            hash = ((hash << 5) - hash) + char;
            hash = hash & hash;
        }
        return Math.abs(hash).toString(16);
    },
    
    sha1(str) {
        let hash = 0;
        for (let i = 0; i < str.length; i++) {
            const char = str.charCodeAt(i);
            hash = ((hash << 5) - hash) + char;
            hash = hash & hash;
        }
        return Math.abs(hash).toString(16);
    },
    
    generatePassword(length = 12) {
        const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789@$!%*?&';
        let password = '';
        
        for (let i = 0; i < length; i++) {
            password += chars.charAt(Math.floor(Math.random() * chars.length));
        }
        
        return password;
    },
    
    validatePassword(password) {
        let score = 0;
        
        if (password.length >= 8) score++;
        if (password.length >= 12) score++;
        if (/[a-z]/.test(password)) score++;
        if (/[A-Z]/.test(password)) score++;
        if (/[0-9]/.test(password)) score++;
        if (/[@$!%*?&]/.test(password)) score++;
        
        const levels = ['弱', '一般', '中等', '强', '非常强'];
        return {
            score: Math.min(score, 5),
            level: levels[Math.min(score, 4)]
        };
    }
};

window.Utils = Utils;