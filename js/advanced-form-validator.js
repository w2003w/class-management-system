const AdvancedFormValidator = {
    rules: {
        required: {
            validate: (value) => value !== undefined && value !== null && value !== '' && value !== 'undefined' && value !== 'null',
            message: '此字段为必填项'
        },
        email: {
            validate: (value) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value),
            message: '请输入有效的邮箱地址'
        },
        phone: {
            validate: (value) => /^1[3-9]\d{9}$/.test(value),
            message: '请输入有效的手机号码'
        },
        url: {
            validate: (value) => /^(https?:\/\/)?([\da-z.-]+)\.([a-z.]{2,6})([/\w.-]*)*\/?$/.test(value),
            message: '请输入有效的URL地址'
        },
        number: {
            validate: (value) => !isNaN(parseFloat(value)) && isFinite(value),
            message: '请输入有效的数字'
        },
        integer: {
            validate: (value) => /^-?\d+$/.test(value),
            message: '请输入有效的整数'
        },
        positive: {
            validate: (value) => parseFloat(value) > 0,
            message: '请输入正数'
        },
        min: {
            validate: (value, param) => parseFloat(value) >= param,
            message: '输入值不能小于 {param}'
        },
        max: {
            validate: (value, param) => parseFloat(value) <= param,
            message: '输入值不能大于 {param}'
        },
        minLength: {
            validate: (value, param) => String(value).length >= param,
            message: '至少需要 {param} 个字符'
        },
        maxLength: {
            validate: (value, param) => String(value).length <= param,
            message: '最多允许 {param} 个字符'
        },
        pattern: {
            validate: (value, param) => new RegExp(param).test(value),
            message: '格式不正确'
        },
        password: {
            validate: (value) => /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)[a-zA-Z\d]{8,}$/.test(value),
            message: '密码至少需要8位，包含大小写字母和数字'
        },
        passwordStrong: {
            validate: (value) => /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{12,}$/.test(value),
            message: '密码至少需要12位，包含大小写字母、数字和特殊字符'
        },
        equalTo: {
            validate: (value, param, form) => value === form[param]?.value,
            message: '两次输入不一致'
        },
        date: {
            validate: (value) => !isNaN(Date.parse(value)),
            message: '请输入有效的日期'
        },
        time: {
            validate: (value) => /^([01]\d|2[0-3]):([0-5]\d)$/.test(value),
            message: '请输入有效的时间格式 (HH:MM)'
        },
        dateTime: {
            validate: (value) => !isNaN(new Date(value).getTime()),
            message: '请输入有效的日期时间'
        },
        idCard: {
            validate: (value) => /^[1-9]\d{5}(18|19|20)\d{2}(0[1-9]|1[0-2])(0[1-9]|[12]\d|3[01])\d{3}[\dXx]$/.test(value),
            message: '请输入有效的身份证号码'
        },
        chinese: {
            validate: (value) => /^[\u4e00-\u9fa5]+$/.test(value),
            message: '请输入中文'
        },
        english: {
            validate: (value) => /^[a-zA-Z]+$/.test(value),
            message: '请输入英文'
        },
        alphanumeric: {
            validate: (value) => /^[a-zA-Z0-9]+$/.test(value),
            message: '只能输入字母和数字'
        },
        username: {
            validate: (value) => /^[a-zA-Z][a-zA-Z0-9_]{2,15}$/.test(value),
            message: '用户名以字母开头，3-16位，可包含字母、数字和下划线'
        }
    },
    
    validateField(field, formData = {}) {
        const errors = [];
        const value = field.value;
        const rules = field.rules || [];
        
        for (const rule of rules) {
            let ruleName, param;
            
            if (typeof rule === 'string') {
                ruleName = rule;
            } else if (Array.isArray(rule)) {
                [ruleName, param] = rule;
            }
            
            const ruleConfig = this.rules[ruleName];
            if (!ruleConfig) continue;
            
            if (!ruleConfig.validate(value, param, formData)) {
                let message = ruleConfig.message;
                if (param !== undefined && param !== null) {
                    message = message.replace(/{param}/g, param);
                }
                errors.push({
                    rule: ruleName,
                    message: message
                });
            }
        }
        
        return errors;
    },
    
    validateForm(formFields, formData = {}) {
        const results = {};
        let isValid = true;
        
        for (const fieldName in formFields) {
            if (Object.prototype.hasOwnProperty.call(formFields, fieldName)) {
                const field = formFields[fieldName];
                field.value = formData[fieldName];
                const errors = this.validateField(field, formData);
                
                if (errors.length > 0) {
                    isValid = false;
                    results[fieldName] = errors;
                } else {
                    results[fieldName] = [];
                }
            }
        }
        
        return {
            isValid,
            errors: results
        };
    },
    
    validate(formId) {
        const form = document.getElementById(formId);
        if (!form) {
            console.error('[AdvancedFormValidator] 表单不存在:', formId);
            return { isValid: false, errors: {} };
        }
        
        const formData = {};
        const formFields = {};
        
        const inputs = form.querySelectorAll('input, textarea, select');
        inputs.forEach(input => {
            const name = input.name;
            if (!name) return;
            
            formData[name] = input.value;
            
            const rules = this.parseRules(input);
            if (rules.length > 0) {
                formFields[name] = {
                    value: input.value,
                    rules: rules
                };
            }
        });
        
        return this.validateForm(formFields, formData);
    },
    
    parseRules(input) {
        const rules = [];
        const rulesAttr = input.getAttribute('data-rules');
        
        if (rulesAttr) {
            try {
                const parsed = JSON.parse(rulesAttr);
                if (Array.isArray(parsed)) {
                    rules.push(...parsed);
                }
            } catch (error) {
                console.warn('[AdvancedFormValidator] 解析规则失败:', rulesAttr, error);
            }
        }
        
        if (input.hasAttribute('required')) {
            rules.push('required');
        }
        
        const type = input.type.toLowerCase();
        if (type === 'email') {
            rules.push('email');
        } else if (type === 'number') {
            rules.push('number');
        }
        
        const minAttr = input.getAttribute('min');
        if (minAttr) {
            rules.push(['min', parseFloat(minAttr)]);
        }
        
        const maxAttr = input.getAttribute('max');
        if (maxAttr) {
            rules.push(['max', parseFloat(maxAttr)]);
        }
        
        const minlengthAttr = input.getAttribute('minlength');
        if (minlengthAttr) {
            rules.push(['minLength', parseInt(minlengthAttr)]);
        }
        
        const maxlengthAttr = input.getAttribute('maxlength');
        if (maxlengthAttr) {
            rules.push(['maxLength', parseInt(maxlengthAttr)]);
        }
        
        const patternAttr = input.getAttribute('pattern');
        if (patternAttr) {
            rules.push(['pattern', patternAttr]);
        }
        
        return rules;
    },
    
    showErrors(formId, errors) {
        const form = document.getElementById(formId);
        if (!form) return;
        
        this.clearErrors(formId);
        
        for (const fieldName in errors) {
            if (Object.prototype.hasOwnProperty.call(errors, fieldName)) {
                const fieldErrors = errors[fieldName];
                if (fieldErrors.length === 0) continue;
                
                const input = form.querySelector(`[name="${fieldName}"]`);
                if (!input) continue;
                
                input.classList.add('border-red-500', 'focus:border-red-500');
                
                const errorDiv = document.createElement('div');
                errorDiv.className = 'mt-1 text-sm text-red-600 flex items-center';
                errorDiv.innerHTML = `<i class="fa fa-exclamation-circle mr-1"></i>${fieldErrors[0].message}`;
                
                input.parentNode.appendChild(errorDiv);
            }
        }
    },
    
    clearErrors(formId) {
        const form = document.getElementById(formId);
        if (!form) return;
        
        const inputs = form.querySelectorAll('input, textarea, select');
        inputs.forEach(input => {
            input.classList.remove('border-red-500', 'focus:border-red-500');
            
            const errorDiv = input.parentNode.querySelector('.text-red-600');
            if (errorDiv) {
                errorDiv.remove();
            }
        });
    },
    
    validateOnBlur(input) {
        const field = {
            value: input.value,
            rules: this.parseRules(input)
        };
        
        const errors = this.validateField(field);
        
        if (errors.length > 0) {
            input.classList.add('border-red-500');
            let errorDiv = input.parentNode.querySelector('.text-red-600');
            if (!errorDiv) {
                errorDiv = document.createElement('div');
                errorDiv.className = 'mt-1 text-sm text-red-600 flex items-center';
                input.parentNode.appendChild(errorDiv);
            }
            errorDiv.innerHTML = `<i class="fa fa-exclamation-circle mr-1"></i>${errors[0].message}`;
        } else {
            input.classList.remove('border-red-500');
            const errorDiv = input.parentNode.querySelector('.text-red-600');
            if (errorDiv) {
                errorDiv.remove();
            }
        }
    },
    
    validateOnInput(input) {
        if (input.classList.contains('border-red-500')) {
            this.validateOnBlur(input);
        }
    },
    
    attachValidation(formId) {
        const form = document.getElementById(formId);
        if (!form) {
            console.error('[AdvancedFormValidator] 表单不存在:', formId);
            return;
        }
        
        const inputs = form.querySelectorAll('input, textarea, select');
        
        inputs.forEach(input => {
            const rules = this.parseRules(input);
            if (rules.length === 0) return;
            
            input.addEventListener('blur', () => this.validateOnBlur(input));
            input.addEventListener('input', () => this.validateOnInput(input));
        });
        
        form.addEventListener('submit', (e) => {
            const result = this.validate(formId);
            if (!result.isValid) {
                e.preventDefault();
                this.showErrors(formId, result.errors);
                
                const firstError = form.querySelector('.border-red-500');
                if (firstError) {
                    firstError.focus();
                }
            }
        });
        
        console.log(`[AdvancedFormValidator] 已为表单 ${formId} 附加验证`);
    },
    
    validatePasswordStrength(password) {
        let score = 0;
        
        if (password.length >= 8) score++;
        if (password.length >= 12) score++;
        if (password.length >= 16) score++;
        
        if (/[a-z]/.test(password)) score++;
        if (/[A-Z]/.test(password)) score++;
        if (/[0-9]/.test(password)) score++;
        if (/[@$!%*?&]/.test(password)) score++;
        
        const levels = ['弱', '一般', '中等', '强', '非常强'];
        const colors = ['#EF4444', '#F59E0B', '#3B82F6', '#10B981', '#059669'];
        
        return {
            score: Math.min(score, 5),
            level: levels[Math.min(score, 4)],
            color: colors[Math.min(score, 4)],
            percentage: Math.min((score / 5) * 100, 100)
        };
    },
    
    validateEmailDomain(email) {
        const domains = ['gmail.com', 'yahoo.com', 'hotmail.com', 'outlook.com', 'qq.com', '163.com', '126.com', 'sina.com', 'sohu.com', '139.com'];
        const domain = email.split('@')[1];
        return domains.includes(domain);
    },
    
    validateUsernameAvailability(username) {
        return new Promise((resolve) => {
            setTimeout(() => {
                const reservedUsernames = ['admin', 'root', 'superadmin', 'moderator', 'guest', 'test', 'user'];
                resolve(!reservedUsernames.includes(username.toLowerCase()));
            }, 300);
        });
    }
};

window.AdvancedFormValidator = AdvancedFormValidator;