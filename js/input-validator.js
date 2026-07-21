const InputValidator = {
    validateUsername(username) {
        if (!username || typeof username !== 'string') {
            return { valid: false, message: '用户名不能为空' };
        }
        
        if (username.length < 3 || username.length > 20) {
            return { valid: false, message: '用户名长度必须在3-20个字符之间' };
        }
        
        if (!/^[a-zA-Z0-9_\u4e00-\u9fa5]+$/.test(username)) {
            return { valid: false, message: '用户名只能包含字母、数字、下划线和中文' };
        }
        
        return { valid: true };
    },
    
    validatePassword(password) {
        if (!password || typeof password !== 'string') {
            return { valid: false, message: '密码不能为空' };
        }
        
        if (password.length < 6 || password.length > 20) {
            return { valid: false, message: '密码长度必须在6-20个字符之间' };
        }
        
        return { valid: true };
    },
    
    validateEmail(email) {
        if (!email || typeof email !== 'string') {
            return { valid: false, message: '邮箱不能为空' };
        }
        
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(email)) {
            return { valid: false, message: '邮箱格式不正确' };
        }
        
        return { valid: true };
    },
    
    validateName(name, fieldName = '名称') {
        if (!name || typeof name !== 'string') {
            return { valid: false, message: `${fieldName}不能为空` };
        }
        
        if (name.length > 50) {
            return { valid: false, message: `${fieldName}长度不能超过50个字符` };
        }
        
        if (/<[^>]*>/.test(name)) {
            return { valid: false, message: `${fieldName}不能包含HTML标签` };
        }
        
        return { valid: true };
    },
    
    validateDescription(description, fieldName = '描述') {
        if (!description || typeof description !== 'string') {
            return { valid: false, message: `${fieldName}不能为空` };
        }
        
        if (description.length > 500) {
            return { valid: false, message: `${fieldName}长度不能超过500个字符` };
        }
        
        if (/<[^>]*>/.test(description)) {
            return { valid: false, message: `${fieldName}不能包含HTML标签` };
        }
        
        return { valid: true };
    },
    
    validateNumber(value, fieldName = '数值', min = 0, max = Number.MAX_SAFE_INTEGER) {
        if (value === null || value === undefined || value === '') {
            return { valid: false, message: `${fieldName}不能为空` };
        }
        
        const num = Number(value);
        if (isNaN(num)) {
            return { valid: false, message: `${fieldName}必须是有效的数字` };
        }
        
        if (num < min || num > max) {
            return { valid: false, message: `${fieldName}必须在${min}-${max}之间` };
        }
        
        return { valid: true };
    },
    
    validateDate(date, fieldName = '日期') {
        if (!date) {
            return { valid: false, message: `${fieldName}不能为空` };
        }
        
        const dateObj = new Date(date);
        if (isNaN(dateObj.getTime())) {
            return { valid: false, message: `${fieldName}格式不正确` };
        }
        
        return { valid: true };
    },
    
    sanitizeInput(input) {
        if (typeof input !== 'string') return input;
        
        return input
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#x27;')
            .replace(/\//g, '&#x2F;');
    }
};