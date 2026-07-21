const AdvancedI18nService = {
    initialized: false,
    currentLocale: 'zh-CN',
    defaultLocale: 'zh-CN',
    translations: new Map(),
    fallbackTranslations: new Map(),
    missingKeys: new Set(),
    pluralRules: new Map(),
    
    locales: {
        'zh-CN': {
            name: '简体中文',
            nativeName: '简体中文',
            dir: 'ltr'
        },
        'zh-TW': {
            name: '繁体中文',
            nativeName: '繁體中文',
            dir: 'ltr'
        },
        'en-US': {
            name: 'English',
            nativeName: 'English',
            dir: 'ltr'
        },
        'ja-JP': {
            name: 'Japanese',
            nativeName: '日本語',
            dir: 'ltr'
        },
        'ko-KR': {
            name: 'Korean',
            nativeName: '한국어',
            dir: 'ltr'
        },
        'fr-FR': {
            name: 'French',
            nativeName: 'Français',
            dir: 'ltr'
        },
        'de-DE': {
            name: 'German',
            nativeName: 'Deutsch',
            dir: 'ltr'
        },
        'es-ES': {
            name: 'Spanish',
            nativeName: 'Español',
            dir: 'ltr'
        },
        'ru-RU': {
            name: 'Russian',
            nativeName: 'Русский',
            dir: 'ltr'
        },
        'ar-SA': {
            name: 'Arabic',
            nativeName: 'العربية',
            dir: 'rtl'
        }
    },
    
    async init(options = {}) {
        if (this.initialized) return;
        
        const {
            locale = this.detectLocale(),
            defaultLocale = 'zh-CN',
            resources = {}
        } = options;
        
        this.currentLocale = locale;
        this.defaultLocale = defaultLocale;
        
        this.loadTranslations(resources);
        this.initPluralRules();
        this.initialized = true;
        
        console.log(`[AdvancedI18nService] 国际化服务初始化完成，当前语言: ${this.currentLocale}`);
    },
    
    detectLocale() {
        const browserLang = navigator.language || navigator.userLanguage;
        
        if (this.locales[browserLang]) {
            return browserLang;
        }
        
        const shortLang = browserLang.split('-')[0];
        
        for (const locale of Object.keys(this.locales)) {
            if (locale.startsWith(shortLang)) {
                return locale;
            }
        }
        
        return this.defaultLocale;
    },
    
    loadTranslations(resources) {
        for (const [locale, translations] of Object.entries(resources)) {
            this.translations.set(locale, this.flattenObject(translations));
        }
    },
    
    flattenObject(obj, prefix = '') {
        const result = {};
        
        for (const [key, value] of Object.entries(obj)) {
            const newKey = prefix ? `${prefix}.${key}` : key;
            
            if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
                Object.assign(result, this.flattenObject(value, newKey));
            } else {
                result[newKey] = value;
            }
        }
        
        return result;
    },
    
    addTranslation(locale, key, value) {
        if (!this.translations.has(locale)) {
            this.translations.set(locale, {});
        }
        
        const translations = this.translations.get(locale);
        const keys = key.split('.');
        let current = translations;
        
        for (let i = 0; i < keys.length - 1; i++) {
            if (!current[keys[i]]) {
                current[keys[i]] = {};
            }
            current = current[keys[i]];
        }
        
        current[keys[keys.length - 1]] = value;
    },
    
    t(key, params = {}, options = {}) {
        const {
            locale = this.currentLocale,
            defaultValue = null,
            count = null
        } = options;
        
        let translation = this.translate(key, locale, count);
        
        if (translation === null && locale !== this.defaultLocale) {
            translation = this.translate(key, this.defaultLocale, count);
        }
        
        if (translation === null) {
            if (defaultValue !== null) {
                translation = defaultValue;
            } else {
                this.missingKeys.add(key);
                translation = key;
            }
        }
        
        if (count !== null) {
            translation = this.applyPlural(translation, count, locale);
        }
        
        if (Object.keys(params).length > 0) {
            translation = this.interpolate(translation, params);
        }
        
        return translation;
    },
    
    translate(key, locale, count) {
        const translations = this.translations.get(locale);
        if (!translations) return null;
        
        const keys = key.split('.');
        let value = translations;
        
        for (const k of keys) {
            if (value && typeof value === 'object' && k in value) {
                value = value[k];
            } else {
                return null;
            }
        }
        
        if (typeof value === 'string') {
            return value;
        }
        
        if (typeof value === 'object' && count !== null) {
            const pluralForm = this.getPluralForm(count, locale);
            return value[pluralForm] || value['other'] || Object.values(value)[0] || null;
        }
        
        return null;
    },
    
    interpolate(text, params) {
        return text.replace(/\{\{(\w+)(?::([^}]+))?\}\}/g, (match, key, format) => {
            const value = params[key];
            
            if (value === undefined) {
                return match;
            }
            
            if (format) {
                return this.formatValue(value, format);
            }
            
            return String(value);
        });
    },
    
    formatValue(value, format) {
        if (value instanceof Date) {
            return this.formatDate(value, format);
        }
        
        if (typeof value === 'number') {
            return this.formatNumber(value, format);
        }
        
        if (typeof value === 'string' && format === 'uppercase') {
            return value.toUpperCase();
        }
        
        if (typeof value === 'string' && format === 'lowercase') {
            return value.toLowerCase();
        }
        
        if (typeof value === 'string' && format === 'capitalize') {
            return value.charAt(0).toUpperCase() + value.slice(1);
        }
        
        return String(value);
    },
    
    formatDate(date, format = 'short') {
        const d = typeof date === 'string' ? new Date(date) : date;
        
        const formats = {
            short: '{y}-{m}-{d}',
            medium: '{y}年{m}月{d}日',
            long: '{y}年{m}月{d}日 {h}:{i}',
            full: '{y}年{m}月{d}日 {w} {h}:{i}:{s}'
        };
        
        let pattern = formats[format] || format;
        
        const weekDays = this.t('date.weekdays', {}, { locale: this.currentLocale }).split(',');
        const months = this.t('date.months', {}, { locale: this.currentLocale }).split(',');
        
        pattern = pattern
            .replace('{y}', d.getFullYear())
            .replace('{m}', String(d.getMonth() + 1).padStart(2, '0'))
            .replace('{d}', String(d.getDate()).padStart(2, '0'))
            .replace('{h}', String(d.getHours()).padStart(2, '0'))
            .replace('{i}', String(d.getMinutes()).padStart(2, '0'))
            .replace('{s}', String(d.getSeconds()).padStart(2, '0'))
            .replace('{w}', weekDays[d.getDay()]);
        
        return pattern;
    },
    
    formatNumber(number, format = 'decimal') {
        const locale = this.currentLocale;
        
        const formatters = {
            decimal: new Intl.NumberFormat(locale),
            currency: new Intl.NumberFormat(locale, { style: 'currency' }),
            percent: new Intl.NumberFormat(locale, { style: 'percent' })
        };
        
        return formatters[format]?.format(number) || String(number);
    },
    
    initPluralRules() {
        this.pluralRules.set('zh-CN', (n) => 0);
        this.pluralRules.set('en-US', (n) => n === 1 ? 0 : 1);
        this.pluralRules.set('ja-JP', (n) => 0);
        this.pluralRules.set('ko-KR', (n) => 0);
        this.pluralRules.set('fr-FR', (n) => n > 1 ? 1 : 0);
        this.pluralRules.set('de-DE', (n) => n !== 1 ? 1 : 0);
        this.pluralRules.set('es-ES', (n) => n !== 1 ? 1 : 0);
        this.pluralRules.set('ru-RU', (n) => {
            const mod10 = n % 10;
            const mod100 = n % 100;
            if (mod10 === 1 && mod100 !== 11) return 0;
            if (mod10 >= 2 && mod10 <= 4 && (mod100 < 12 || mod100 > 14)) return 1;
            return 2;
        });
        this.pluralRules.set('ar-SA', (n) => {
            if (n === 0) return 0;
            if (n === 1) return 1;
            if (n === 2) return 2;
            if (n % 100 >= 3 && n % 100 <= 10) return 3;
            if (n % 100 >= 11) return 4;
            return 5;
        });
    },
    
    getPluralForm(count, locale) {
        const rule = this.pluralRules.get(locale) || this.pluralRules.get('en-US');
        const index = rule(count);
        
        const forms = ['zero', 'one', 'two', 'few', 'many', 'other'];
        return forms[index] || 'other';
    },
    
    applyPlural(translation, count, locale) {
        if (typeof translation !== 'object') {
            return translation;
        }
        
        const form = this.getPluralForm(count, locale);
        return translation[form] || translation.other || translation.one || Object.values(translation)[0];
    },
    
    setLocale(locale) {
        if (!this.locales[locale]) {
            console.warn(`[AdvancedI18nService] 不支持的语言: ${locale}`);
            return false;
        }
        
        this.currentLocale = locale;
        
        document.documentElement.lang = locale;
        document.documentElement.dir = this.locales[locale].dir;
        
        console.log(`[AdvancedI18nService] 语言切换为: ${locale}`);
        return true;
    },
    
    getLocale() {
        return this.currentLocale;
    },
    
    getAvailableLocales() {
        return Object.entries(this.locales).map(([code, info]) => ({
            code,
            name: info.name,
            nativeName: info.nativeName,
            dir: info.dir
        }));
    },
    
    getDirection(locale = this.currentLocale) {
        return this.locales[locale]?.dir || 'ltr';
    },
    
    exists(key, locale = this.currentLocale) {
        return this.translate(key, locale) !== null;
    },
    
    getMissingKeys() {
        return Array.from(this.missingKeys);
    },
    
    clearMissingKeys() {
        this.missingKeys.clear();
    },
    
    loadLocaleFromStorage() {
        const savedLocale = localStorage.getItem('locale');
        if (savedLocale && this.locales[savedLocale]) {
            this.setLocale(savedLocale);
        }
    },
    
    saveLocaleToStorage(locale = this.currentLocale) {
        localStorage.setItem('locale', locale);
    },
    
    translatePage() {
        const elements = document.querySelectorAll('[data-i18n]');
        
        elements.forEach(element => {
            const key = element.getAttribute('data-i18n');
            const translation = this.t(key);
            
            if (translation !== key) {
                element.textContent = translation;
            }
        });
        
        const placeholders = document.querySelectorAll('[data-i18n-placeholder]');
        
        placeholders.forEach(element => {
            const key = element.getAttribute('data-i18n-placeholder');
            const translation = this.t(key);
            
            if (translation !== key) {
                element.placeholder = translation;
            }
        });
        
        const titles = document.querySelectorAll('[data-i18n-title]');
        
        titles.forEach(element => {
            const key = element.getAttribute('data-i18n-title');
            const translation = this.t(key);
            
            if (translation !== key) {
                element.title = translation;
            }
        });
        
        console.log(`[AdvancedI18nService] 页面翻译完成，共处理 ${elements.length} 个元素`);
    },
    
    createResourceBundle(locale, namespace = 'common') {
        const translations = this.translations.get(locale);
        if (!translations) return {};
        
        const bundle = {};
        
        for (const [key, value] of Object.entries(translations)) {
            if (key.startsWith(namespace)) {
                bundle[key] = value;
            }
        }
        
        return bundle;
    },
    
    mergeTranslations(primary, fallback) {
        return { ...fallback, ...primary };
    }
};

window.AdvancedI18nService = AdvancedI18nService;