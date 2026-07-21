// 通用通知功能模块
// 所有页面共享的通知功能：查看、删除、发布公告、回复

// 初始化通知功能
function initNotificationSystem(user) {
    window.currentUser = user;
    initNotificationModal();
}

// 渲染通知列表
window.renderNotifications = async function() {
    if (!window.currentUser) {
        window.currentUser = await DataService.getCurrentUser();
    }
    
    const notifications = await DataService.getNotifications();
    const container = document.getElementById('notificationList');
    const badge = document.getElementById('notificationBadge');
    const announceBtn = document.getElementById('announceBtn');
    
    // 管理员显示发布公告按钮
    if (announceBtn) {
        announceBtn.classList.add('hidden');
        if (window.currentUser.role !== 'user') {
            announceBtn.classList.remove('hidden');
        }
    }
    
    // 过滤通知
    let filteredNotifications = notifications;
    
    if (window.currentUser.role === 'user') {
        // 普通成员只能看到：
        // 1. 非私信通知（公开通知）
        // 2. 发送给自己的私信
        // 3. 自己发送的私信（用于查看管理员回复）
        filteredNotifications = notifications.filter(n => {
            if (!n.isPrivate) return true;
            if (n.receiverId && String(n.receiverId) === String(window.currentUser.id)) return true;
            if (n.senderId && String(n.senderId) === String(window.currentUser.id)) return true;
            return false;
        });
    } else {
        // 管理员可以看到：
        // 1. 所有非私信通知
        // 2. 发给管理员的私信（receiverId 为 null 表示发给所有管理员）
        // 3. 自己发送的私信
        filteredNotifications = notifications.filter(n => {
            if (!n.isPrivate) return true;
            if (n.receiverId === null) return true;
            if (n.senderId && String(n.senderId) === String(window.currentUser.id)) return true;
            if (n.receiverId && String(n.receiverId) === String(window.currentUser.id)) return true;
            return false;
        });
    }
    
    // 更新未读数
    if (badge) {
        const unreadCount = filteredNotifications.filter(n => !n.read).length;
        if (unreadCount > 0) {
            badge.textContent = unreadCount > 99 ? '99+' : unreadCount;
            badge.classList.remove('hidden');
        } else {
            badge.classList.add('hidden');
        }
    }
    
    // 渲染通知列表
    if (!container) return;
    
    if (filteredNotifications.length === 0) {
        container.innerHTML = `
            <div class="p-8 text-center text-gray-500">
                <i class="fa fa-bell-slash text-4xl mb-2 text-gray-300"></i>
                <p>暂无通知</p>
            </div>
        `;
        return;
    }
    
    container.innerHTML = filteredNotifications.map(n => {
        // 判断是否可以回复
        const canReply = n.isPrivate && (
            (window.currentUser.role !== 'user' && n.senderId && n.senderId !== window.currentUser.id) ||
            (window.currentUser.role === 'user' && n.senderId !== window.currentUser.id)
        );
        
        // 判断是否可以删除
        // 管理员可以删除所有通知，成员只能删除自己发送的通知
        const canDelete = window.currentUser.role !== 'user' || (n.senderId && String(n.senderId) === String(window.currentUser.id));
        
        return `
        <div class="p-4 border-b hover:bg-gray-50 ${!n.read ? 'bg-blue-50' : ''}" data-notification-id="${n.id}">
            <div class="flex items-start" onclick="handleNotificationClick(${n.id}, '${n.type}', ${n.relatedId || 'null'})"><div class="w-8 h-8 rounded-full ${n.isPrivate ? 'bg-purple-100' : 'bg-primary/10'} flex items-center justify-center mr-3 flex-shrink-0">
                    <i class="fa ${getNotificationIcon(n.type)} ${n.isPrivate ? 'text-purple-600' : 'text-primary'}"></i>
                </div>
                <div class="flex-1">
                    <p class="text-sm font-medium text-gray-800">${n.title} ${n.isPrivate ? '<span class="text-xs text-purple-600 ml-1">[私信]</span>' : ''}</p>
                    <p class="text-xs text-gray-500 mt-1">${n.message}</p>
                    <p class="text-xs text-gray-400 mt-1">${formatDateTime(n.createdAt)}</p>
                </div>
                ${!n.read ? '<span class="w-2 h-2 bg-red-500 rounded-full"></span>' : ''}
                ${canDelete ? `
                <button onclick="event.stopPropagation(); deleteNotification(${n.id})" class="text-gray-400 hover:text-red-500 ml-2 p-1"><i class="fa fa-trash text-sm"></i></button>
                ` : ''}
            </div>
            ${canReply ? `
            <div class="mt-3 pl-11">
                <div class="flex space-x-2">
                    <input type="text" id="replyInput_${n.id}" class="flex-1 px-3 py-1 text-sm border rounded-lg" placeholder="回复消息...">
                    <button onclick="replyToNotification(${n.id}, ${n.senderId})" class="px-3 py-1 bg-primary text-white text-sm rounded-lg hover:bg-secondary">回复</button>
                </div>
            </div>
            ` : ''}
        </div>
    `}).join('');
}

// 获取通知图标
function getNotificationIcon(type) {
    const icons = {
        'attendance': 'fa-calendar-check-o',
        'exam': 'fa-file-text-o',
        'vote': 'fa-check-square-o',
        'password_reset': 'fa-key',
        'contact': 'fa-envelope',
        'announcement': 'fa-bullhorn'
    };
    return icons[type] || 'fa-bell';
}

// 处理通知点击
async function handleNotificationClick(notificationId, type, relatedId) {
    await markAsRead(notificationId);
    
    if (type === 'password_reset' && window.currentUser && (window.currentUser.role === 'admin' || window.currentUser.role === 'subAdmin')) {
        document.getElementById('notificationModal').classList.add('hidden');
        window.location.href = 'users.html';
    }
}

// 标记已读
async function markAsRead(id) {
    await DataService.markNotificationRead(id);
    await renderNotifications();
}

// 删除通知
async function deleteNotification(id) {
    if (!confirm('确定要删除这条通知吗？')) return;
    
    try {
        await DataService.deleteNotification(id);
        showToast('删除成功', 'success');
        await renderNotifications();
    } catch (error) {
        console.error('删除通知失败:', error);
        showToast('删除失败，请重试', 'error');
    }
}

// 回复通知
async function replyToNotification(notificationId, receiverId) {
    const input = document.getElementById(`replyInput_${notificationId}`);
    const message = input.value.trim();
    
    if (!message) {
        showToast('请输入回复内容', 'warning');
        return;
    }
    
    try {
        const replyNotification = {
            id: Date.now(),
            title: window.currentUser.role !== 'user' ? '管理员回复' : '用户回复',
            message: message,
            type: 'contact',
            senderId: window.currentUser.id,
            receiverId: receiverId,
            isPrivate: true,
            parentId: notificationId,
            read: false
        };
        
        await DataService.addNotification(replyNotification);
        showToast('回复已发送', 'success');
        input.value = '';
        await renderNotifications();
    } catch (error) {
        console.error('发送回复失败:', error);
        showToast('发送回复失败，请重试', 'error');
    }
}

// 初始化通知模态框
function initNotificationModal() {
    const notificationBtn = document.getElementById('notificationBtn');
    const closeNotificationModal = document.getElementById('closeNotificationModal');
    const notificationModal = document.getElementById('notificationModal');
    const announceBtn = document.getElementById('announceBtn');
    const announceModal = document.getElementById('announceModal');
    const closeAnnounceModal = document.getElementById('closeAnnounceModal');
    const cancelAnnounce = document.getElementById('cancelAnnounce');
    const submitAnnounce = document.getElementById('submitAnnounce');
    
    if (notificationBtn) {
        notificationBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            renderNotifications();
            notificationModal.classList.remove('hidden');
        });
    }
    
    if (closeNotificationModal) {
        closeNotificationModal.addEventListener('click', () => {
            notificationModal.classList.add('hidden');
        });
    }
    
    if (notificationModal) {
        notificationModal.addEventListener('click', (e) => {
            if (e.target.id === 'notificationModal') {
                notificationModal.classList.add('hidden');
            }
        });
    }
    
    if (announceBtn) {
        announceBtn.addEventListener('click', () => {
            document.getElementById('announceTitle').value = '';
            document.getElementById('announceContent').value = '';
            document.getElementById('announceTarget').value = 'all';
            announceModal.classList.remove('hidden');
        });
    }
    
    if (closeAnnounceModal) {
        closeAnnounceModal.addEventListener('click', () => {
            announceModal.classList.add('hidden');
        });
    }
    
    if (cancelAnnounce) {
        cancelAnnounce.addEventListener('click', () => {
            announceModal.classList.add('hidden');
        });
    }
    
    if (announceModal) {
        announceModal.addEventListener('click', (e) => {
            if (e.target.id === 'announceModal') {
                announceModal.classList.add('hidden');
            }
        });
    }
    
    if (submitAnnounce) {
        submitAnnounce.addEventListener('click', async () => {
            const title = document.getElementById('announceTitle').value.trim();
            const content = document.getElementById('announceContent').value.trim();
            const target = document.getElementById('announceTarget').value;
            
            if (!title || !content) {
                showToast('请填写公告标题和内容', 'warning');
                return;
            }
            
            try {
                const notification = {
                    id: Date.now(),
                    title: `公告: ${title}`,
                    message: content,
                    type: 'announcement',
                    senderId: window.currentUser.id,
                    receiverId: target === 'admin' ? null : null,
                    isPrivate: false,
                    read: false
                };
                
                await DataService.addNotification(notification);
                showToast('公告发布成功', 'success');
                announceModal.classList.add('hidden');
                await renderNotifications();
            } catch (error) {
                console.error('发布公告失败:', error);
                showToast('发布公告失败，请重试', 'error');
            }
        });
    }
}

// 格式化时间
function formatDateTime(dateStr) {
    if (!dateStr) return '';
    const d = new Date(dateStr);
    return d.toLocaleString('zh-CN', { 
        year: 'numeric', 
        month: '2-digit', 
        day: '2-digit', 
        hour: '2-digit', 
        minute: '2-digit' 
    });
}

// 显示提示
function showToast(message, type = 'info') {
    const container = document.getElementById('toastContainer');
    if (!container) return;
    
    const toast = document.createElement('div');
    const bgColor = { 
        success: 'bg-green-500', 
        error: 'bg-red-500', 
        warning: 'bg-yellow-500', 
        info: 'bg-blue-500' 
    }[type] || 'bg-blue-500';
    
    const icon = { 
        success: 'fa-check-circle', 
        error: 'fa-times-circle', 
        warning: 'fa-exclamation-circle', 
        info: 'fa-info-circle' 
    }[type] || 'fa-info-circle';
    
    toast.className = `${bgColor} text-white px-6 py-3 rounded-xl shadow-lg flex items-center space-x-2 mb-2`;
    toast.innerHTML = `<i class="fa ${icon}"></i><span>${message}</span>`;
    container.appendChild(toast);
    
    setTimeout(() => {
        toast.style.opacity = '0';
        toast.style.transform = 'translateX(100%)';
        toast.style.transition = 'all 0.3s ease';
        setTimeout(() => toast.remove(), 300);
    }, 3000);
}
