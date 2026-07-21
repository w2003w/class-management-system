const AdvancedUI = {
    toastId: 0,
    
    showToast(message, type = 'info', duration = 3000) {
        this.toastId++;
        const id = `toast-${this.toastId}`;
        
        const toastClass = {
            success: 'bg-gradient-to-r from-green-500 to-emerald-500 text-white',
            error: 'bg-gradient-to-r from-red-500 to-rose-500 text-white',
            warning: 'bg-gradient-to-r from-orange-500 to-amber-500 text-white',
            info: 'bg-gradient-to-r from-blue-500 to-indigo-500 text-white'
        };
        
        const iconClass = {
            success: 'fa-check-circle',
            error: 'fa-times-circle',
            warning: 'fa-exclamation-circle',
            info: 'fa-info-circle'
        };
        
        const toast = document.createElement('div');
        toast.id = id;
        toast.className = `fixed bottom-6 right-6 px-6 py-4 rounded-xl shadow-2xl z-50 flex items-center gap-3 max-w-sm animate-slideIn ${toastClass[type]}`;
        toast.innerHTML = `
            <i class="fa ${iconClass[type]} text-xl flex-shrink-0"></i>
            <span class="font-medium">${message}</span>
            <button onclick="AdvancedUI.removeToast('${id}')" class="ml-2 text-white/80 hover:text-white transition-colors">
                <i class="fa fa-times"></i>
            </button>
        `;
        
        document.body.appendChild(toast);
        
        setTimeout(() => {
            this.removeToast(id);
        }, duration);
        
        return id;
    },
    
    removeToast(id) {
        const toast = document.getElementById(id);
        if (toast) {
            toast.classList.add('animate-slideOut');
            setTimeout(() => toast.remove(), 300);
        }
    },
    
    showModal(title, content, options = {}) {
        const modalId = `modal-${Date.now()}`;
        
        const modal = document.createElement('div');
        modal.id = modalId;
        modal.className = 'fixed inset-0 z-50 flex items-center justify-center p-4';
        modal.innerHTML = `
            <div class="absolute inset-0 bg-black/50 backdrop-blur-sm" onclick="AdvancedUI.closeModal('${modalId}')"></div>
            <div class="relative bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[80vh] overflow-hidden animate-modalIn">
                <div class="flex items-center justify-between p-5 border-b border-gray-100">
                    <h3 class="text-lg font-semibold text-gray-800">${title}</h3>
                    <button onclick="AdvancedUI.closeModal('${modalId}')" class="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors">
                        <i class="fa fa-times"></i>
                    </button>
                </div>
                <div class="p-5 overflow-y-auto max-h-[calc(80vh-140px)]">
                    ${content}
                </div>
                <div class="flex justify-end gap-3 p-5 border-t border-gray-100 bg-gray-50">
                    ${options.showCancel ? `<button onclick="AdvancedUI.closeModal('${modalId}')" class="px-5 py-2.5 text-gray-600 hover:bg-gray-100 rounded-xl font-medium transition-colors">取消</button>` : ''}
                    ${options.showConfirm ? `<button onclick="AdvancedUI.confirmModal('${modalId}')" class="px-5 py-2.5 bg-gradient-to-r from-primary to-secondary text-white rounded-xl font-medium hover:shadow-lg transition-all">确认</button>` : ''}
                </div>
            </div>
        `;
        
        document.body.appendChild(modal);
        
        if (options.onClose) {
            modal.addEventListener('remove', options.onClose);
        }
        
        return modalId;
    },
    
    closeModal(modalId) {
        const modal = document.getElementById(modalId);
        if (modal) {
            modal.classList.add('animate-modalOut');
            setTimeout(() => modal.remove(), 300);
        }
    },
    
    confirmModal(modalId) {
        const modal = document.getElementById(modalId);
        if (modal) {
            modal.dispatchEvent(new CustomEvent('confirm'));
            this.closeModal(modalId);
        }
    },
    
    showLoading(message = '加载中...') {
        const loadingId = `loading-${Date.now()}`;
        
        const loading = document.createElement('div');
        loading.id = loadingId;
        loading.className = 'fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm';
        loading.innerHTML = `
            <div class="bg-white rounded-2xl shadow-2xl p-8 flex flex-col items-center gap-4">
                <div class="w-12 h-12 border-4 border-primary/20 border-t-primary rounded-full animate-spin"></div>
                <p class="text-gray-600 font-medium">${message}</p>
            </div>
        `;
        
        document.body.appendChild(loading);
        return loadingId;
    },
    
    hideLoading(loadingId) {
        const loading = document.getElementById(loadingId);
        if (loading) {
            loading.classList.add('opacity-0');
            setTimeout(() => loading.remove(), 300);
        }
    },
    
    createCard(title, content, options = {}) {
        const card = document.createElement('div');
        card.className = `bg-white rounded-2xl shadow-card p-6 hover:shadow-lg transition-all duration-300 ${options.className || ''}`;
        card.innerHTML = `
            <div class="flex items-center justify-between mb-4">
                <h3 class="text-lg font-semibold text-gray-800">${title}</h3>
                ${options.action ? `<button onclick="${options.action}" class="text-primary hover:text-primary-dark transition-colors">${options.actionText || '操作'}</button>` : ''}
            </div>
            <div>${content}</div>
        `;
        return card;
    },
    
    createStatCard(title, value, icon, color) {
        const colors = {
            blue: 'bg-blue-500',
            green: 'bg-green-500',
            purple: 'bg-purple-500',
            orange: 'bg-orange-500',
            pink: 'bg-pink-500',
            cyan: 'bg-cyan-500'
        };
        
        const card = document.createElement('div');
        card.className = 'bg-white rounded-2xl shadow-card p-6 hover:shadow-lg transition-all duration-300';
        card.innerHTML = `
            <div class="flex items-start justify-between">
                <div>
                    <p class="text-gray-500 text-sm mb-1">${title}</p>
                    <p class="text-3xl font-bold text-gray-800">${value}</p>
                </div>
                <div class="w-12 h-12 ${colors[color] || colors.blue} rounded-xl flex items-center justify-center">
                    <i class="fa ${icon} text-white text-xl"></i>
                </div>
            </div>
        `;
        return card;
    },
    
    createButton(text, onClick, options = {}) {
        const btn = document.createElement('button');
        btn.className = `px-6 py-3 rounded-xl font-medium transition-all duration-200 flex items-center gap-2 ${
            options.variant === 'secondary' 
                ? 'bg-gray-100 text-gray-700 hover:bg-gray-200' 
                : options.variant === 'danger'
                    ? 'bg-red-500 text-white hover:bg-red-600'
                    : 'bg-gradient-to-r from-primary to-secondary text-white hover:shadow-lg hover:scale-105'
        } ${options.className || ''}`;
        btn.innerHTML = options.icon ? `<i class="fa ${options.icon}"></i>${text}` : text;
        btn.addEventListener('click', onClick);
        return btn;
    },
    
    createInput(label, type = 'text', options = {}) {
        const group = document.createElement('div');
        group.className = 'mb-4';
        group.innerHTML = `
            <label class="block text-sm font-medium text-gray-700 mb-2">${label}</label>
            <input 
                type="${type}" 
                class="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all"
                ${options.placeholder ? `placeholder="${options.placeholder}"` : ''}
                ${options.required ? 'required' : ''}
                ${options.value ? `value="${options.value}"` : ''}
            />
        `;
        return group;
    },
    
    createSelect(label, options, selected = '') {
        const group = document.createElement('div');
        group.className = 'mb-4';
        
        const optionsHtml = options.map(opt => 
            `<option value="${opt.value}" ${selected === opt.value ? 'selected' : ''}>${opt.label}</option>`
        ).join('');
        
        group.innerHTML = `
            <label class="block text-sm font-medium text-gray-700 mb-2">${label}</label>
            <select class="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all">
                ${optionsHtml}
            </select>
        `;
        return group;
    },
    
    createTextarea(label, options = {}) {
        const group = document.createElement('div');
        group.className = 'mb-4';
        group.innerHTML = `
            <label class="block text-sm font-medium text-gray-700 mb-2">${label}</label>
            <textarea 
                rows="${options.rows || 4}"
                class="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all resize-none"
                ${options.placeholder ? `placeholder="${options.placeholder}"` : ''}
            >${options.value || ''}</textarea>
        `;
        return group;
    },
    
    createTable(columns, data, options = {}) {
        const table = document.createElement('div');
        table.className = 'overflow-x-auto';
        
        const theadHtml = columns.map(col => `<th class="px-4 py-3 text-left text-sm font-semibold text-gray-500">${col.label}</th>`).join('');
        
        const tbodyHtml = data.map(row => {
            const cells = columns.map(col => {
                const value = row[col.field];
                if (col.render) {
                    return `<td class="px-4 py-3 text-sm text-gray-700">${col.render(value, row)}</td>`;
                }
                return `<td class="px-4 py-3 text-sm text-gray-700">${value || '-'}</td>`;
            }).join('');
            return `<tr class="border-b border-gray-100 hover:bg-gray-50 transition-colors">${cells}</tr>`;
        }).join('');
        
        table.innerHTML = `
            <table class="w-full">
                <thead>
                    <tr class="bg-gray-50">${theadHtml}</tr>
                </thead>
                <tbody>${tbodyHtml}</tbody>
            </table>
        `;
        
        return table;
    },
    
    createBadge(text, type = 'default') {
        const badgeClass = {
            default: 'bg-gray-100 text-gray-600',
            success: 'bg-green-100 text-green-600',
            error: 'bg-red-100 text-red-600',
            warning: 'bg-yellow-100 text-yellow-600',
            info: 'bg-blue-100 text-blue-600',
            primary: 'bg-primary text-white'
        };
        
        const badge = document.createElement('span');
        badge.className = `px-3 py-1 text-xs font-medium rounded-full ${badgeClass[type]}`;
        badge.textContent = text;
        return badge;
    },
    
    createProgressBar(progress, label = '') {
        const bar = document.createElement('div');
        bar.className = 'w-full';
        bar.innerHTML = `
            ${label ? `<div class="flex justify-between text-sm mb-1">
                <span class="text-gray-600">${label}</span>
                <span class="text-gray-500">${Math.round(progress)}%</span>
            </div>` : ''}
            <div class="h-2 bg-gray-200 rounded-full overflow-hidden">
                <div 
                    class="h-full bg-gradient-to-r from-primary to-secondary rounded-full transition-all duration-500"
                    style="width: ${progress}%"
                ></div>
            </div>
        `;
        return bar;
    },
    
    createAccordion(title, content, open = false) {
        const accordion = document.createElement('div');
        accordion.className = 'border border-gray-200 rounded-xl overflow-hidden';
        accordion.innerHTML = `
            <button 
                class="w-full flex items-center justify-between p-4 bg-white hover:bg-gray-50 transition-colors text-left"
                onclick="AdvancedUI.toggleAccordion(this)"
            >
                <span class="font-medium text-gray-700">${title}</span>
                <i class="fa fa-chevron-down transition-transform ${open ? 'rotate-180' : ''}"></i>
            </button>
            <div class="${open ? 'block' : 'hidden'} p-4 bg-gray-50 border-t border-gray-200">
                ${content}
            </div>
        `;
        return accordion;
    },
    
    toggleAccordion(button) {
        const icon = button.querySelector('i');
        const content = button.nextElementSibling;
        
        icon.classList.toggle('rotate-180');
        content.classList.toggle('hidden');
    },
    
    createTabs(tabs, activeTab = 0) {
        const tabContainer = document.createElement('div');
        tabContainer.className = 'border-b border-gray-200';
        
        const tabsHtml = tabs.map((tab, index) => `
            <button 
                class="px-4 py-3 font-medium transition-colors relative ${
                    index === activeTab 
                        ? 'text-primary' 
                        : 'text-gray-500 hover:text-gray-700'
                }"
                onclick="AdvancedUI.setActiveTab(this, ${index})"
            >
                ${tab.label}
                ${index === activeTab ? '<span class="absolute bottom-0 left-0 right-0 h-0.5 bg-primary"></span>' : ''}
            </button>
        `).join('');
        
        tabContainer.innerHTML = tabsHtml;
        return tabContainer;
    },
    
    setActiveTab(button, index) {
        const tabs = button.parentElement.querySelectorAll('button');
        tabs.forEach((tab, i) => {
            const indicator = tab.querySelector('span');
            if (i === index) {
                tab.classList.add('text-primary');
                tab.classList.remove('text-gray-500');
                if (!indicator) {
                    const newIndicator = document.createElement('span');
                    newIndicator.className = 'absolute bottom-0 left-0 right-0 h-0.5 bg-primary';
                    tab.appendChild(newIndicator);
                }
            } else {
                tab.classList.remove('text-primary');
                tab.classList.add('text-gray-500');
                const existingIndicator = tab.querySelector('span');
                if (existingIndicator) existingIndicator.remove();
            }
        });
    },
    
    createAvatar(name, size = 'md') {
        const sizes = {
            sm: 'w-8 h-8 text-sm',
            md: 'w-10 h-10 text-base',
            lg: 'w-12 h-12 text-lg'
        };
        
        const avatar = document.createElement('div');
        avatar.className = `${sizes[size]} rounded-full bg-gradient-to-br from-primary to-purple-600 flex items-center justify-center text-white font-medium`;
        avatar.textContent = name ? name.charAt(0).toUpperCase() : '?';
        return avatar;
    },
    
    createChip(text, removable = false, onRemove) {
        const chip = document.createElement('span');
        chip.className = 'inline-flex items-center gap-1 px-3 py-1 bg-gray-100 text-gray-700 rounded-full text-sm';
        chip.innerHTML = `
            ${text}
            ${removable ? `<button onclick="event.stopPropagation(); ${onRemove ? onRemove : ''}" class="hover:text-red-500">
                <i class="fa fa-times text-xs"></i>
            </button>` : ''}
        `;
        return chip;
    },
    
    createEmptyState(title, description, icon = 'fa-folder-open') {
        const empty = document.createElement('div');
        empty.className = 'flex flex-col items-center justify-center py-12 text-gray-400';
        empty.innerHTML = `
            <i class="fa ${icon} text-6xl mb-4"></i>
            <h3 class="text-lg font-medium text-gray-500 mb-2">${title}</h3>
            <p class="text-sm">${description}</p>
        `;
        return empty;
    },
    
    createPagination(current, total, onChange) {
        const pagination = document.createElement('div');
        pagination.className = 'flex items-center justify-center gap-2';
        
        let html = '';
        
        if (current > 1) {
            html += `<button onclick="${onChange}(${current - 1})" class="px-3 py-1 text-gray-600 hover:bg-gray-100 rounded-lg transition-colors">
                <i class="fa fa-chevron-left"></i>
            </button>`;
        }
        
        for (let i = 1; i <= total; i++) {
            if (i === current) {
                html += `<button class="px-4 py-1 bg-primary text-white rounded-lg font-medium">${i}</button>`;
            } else {
                html += `<button onclick="${onChange}(${i})" class="px-4 py-1 text-gray-600 hover:bg-gray-100 rounded-lg transition-colors">${i}</button>`;
            }
        }
        
        if (current < total) {
            html += `<button onclick="${onChange}(${current + 1})" class="px-3 py-1 text-gray-600 hover:bg-gray-100 rounded-lg transition-colors">
                <i class="fa fa-chevron-right"></i>
            </button>`;
        }
        
        pagination.innerHTML = html;
        return pagination;
    },
    
    initAnimations() {
        const style = document.createElement('style');
        style.textContent = `
            @keyframes slideIn {
                from {
                    transform: translateX(100%);
                    opacity: 0;
                }
                to {
                    transform: translateX(0);
                    opacity: 1;
                }
            }
            
            @keyframes slideOut {
                from {
                    transform: translateX(0);
                    opacity: 1;
                }
                to {
                    transform: translateX(100%);
                    opacity: 0;
                }
            }
            
            @keyframes modalIn {
                from {
                    transform: scale(0.95);
                    opacity: 0;
                }
                to {
                    transform: scale(1);
                    opacity: 1;
                }
            }
            
            @keyframes modalOut {
                from {
                    transform: scale(1);
                    opacity: 1;
                }
                to {
                    transform: scale(0.95);
                    opacity: 0;
                }
            }
            
            @keyframes pulse {
                0%, 100% {
                    opacity: 1;
                }
                50% {
                    opacity: 0.5;
                }
            }
            
            @keyframes spin {
                from {
                    transform: rotate(0deg);
                }
                to {
                    transform: rotate(360deg);
                }
            }
            
            .animate-slideIn {
                animation: slideIn 0.3s ease-out;
            }
            
            .animate-slideOut {
                animation: slideOut 0.3s ease-in;
            }
            
            .animate-modalIn {
                animation: modalIn 0.2s ease-out;
            }
            
            .animate-modalOut {
                animation: modalOut 0.2s ease-in;
            }
            
            .animate-pulse {
                animation: pulse 2s ease-in-out infinite;
            }
            
            .animate-spin {
                animation: spin 1s linear infinite;
            }
            
            .shadow-card {
                box-shadow: 0 2px 8px rgba(0, 0, 0, 0.06);
            }
        `;
        
        document.head.appendChild(style);
    }
};

window.AdvancedUI = AdvancedUI;