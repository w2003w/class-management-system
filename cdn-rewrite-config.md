# 阿里云CDN URL重写配置指南

## 问题背景

阿里云OSS作为纯静态对象存储，不支持类似Nginx的`try_files`或`.htaccess`的URL重写功能。当用户直接访问不带`.html`后缀的路径（如`https://www.wtconstruction.top/chat`）时，OSS会直接返回404错误。

## 解决方案

使用阿里云CDN的**URL重写**功能，在CDN边缘节点将不带`.html`后缀的路径自动转换为带`.html`的路径，无需经过404错误。

## 配置步骤

### 步骤1：登录阿里云CDN控制台

访问：https://cdn.console.aliyun.com/

### 步骤2：选择加速域名

在左侧导航栏选择"域名管理"，找到您的域名`www.wtconstruction.top`。

### 步骤3：配置URL重写规则

1. 点击域名进入配置页面
2. 在左侧导航栏选择"URL重写"
3. 点击"添加规则"

### 步骤4：添加重写规则

为每个页面添加一条规则，配置如下：

#### 规则1：dashboard → dashboard.html
- **规则名称**：dashboard-rewrite
- **匹配模式**：完全匹配
- **匹配URL**：`/dashboard`
- **目标URL**：`/dashboard.html`
- **重定向类型**：重写（不改变URL）
- **状态码**：200

#### 规则2：attendance → attendance.html
- **规则名称**：attendance-rewrite
- **匹配模式**：完全匹配
- **匹配URL**：`/attendance`
- **目标URL**：`/attendance.html`
- **重定向类型**：重写（不改变URL）
- **状态码**：200

#### 规则3：attendance-new → attendance-new.html
- **规则名称**：attendance-new-rewrite
- **匹配模式**：完全匹配
- **匹配URL**：`/attendance-new`
- **目标URL**：`/attendance-new.html`
- **重定向类型**：重写（不改变URL）
- **状态码**：200

#### 规则4：exam → exam.html
- **规则名称**：exam-rewrite
- **匹配模式**：完全匹配
- **匹配URL**：`/exam`
- **目标URL**：`/exam.html`
- **重定向类型**：重写（不改变URL）
- **状态码**：200

#### 规则5：vote → vote.html
- **规则名称**：vote-rewrite
- **匹配模式**：完全匹配
- **匹配URL**：`/vote`
- **目标URL**：`/vote.html`
- **重定向类型**：重写（不改变URL）
- **状态码**：200

#### 规则6：chat → chat.html
- **规则名称**：chat-rewrite
- **匹配模式**：完全匹配
- **匹配URL**：`/chat`
- **目标URL**：`/chat.html`
- **重定向类型**：重写（不改变URL）
- **状态码**：200

#### 规则7：users → users.html
- **规则名称**：users-rewrite
- **匹配模式**：完全匹配
- **匹配URL**：`/users`
- **目标URL**：`/users.html`
- **重定向类型**：重写（不改变URL）
- **状态码**：200

#### 规则8：profile → profile.html
- **规则名称**：profile-rewrite
- **匹配模式**：完全匹配
- **匹配URL**：`/profile`
- **目标URL**：`/profile.html`
- **重定向类型**：重写（不改变URL）
- **状态码**：200

#### 规则9：settings → settings.html
- **规则名称**：settings-rewrite
- **匹配模式**：完全匹配
- **匹配URL**：`/settings`
- **目标URL**：`/settings.html`
- **重定向类型**：重写（不改变URL）
- **状态码**：200

#### 规则10：grading → grading.html
- **规则名称**：grading-rewrite
- **匹配模式**：完全匹配
- **匹配URL**：`/grading`
- **目标URL**：`/grading.html`
- **重定向类型**：重写（不改变URL）
- **状态码**：200

#### 规则11：participate → participate.html
- **规则名称**：participate-rewrite
- **匹配模式**：完全匹配
- **匹配URL**：`/participate`
- **目标URL**：`/participate.html`
- **重定向类型**：重写（不改变URL）
- **状态码**：200

## 配置验证

配置完成后，执行以下测试：

1. 访问 `https://www.wtconstruction.top/dashboard` → 应该正常显示dashboard页面
2. 访问 `https://www.wtconstruction.top/chat` → 应该正常显示chat页面
3. 访问 `https://www.wtconstruction.top/users` → 应该正常显示users页面

## 注意事项

1. **重定向类型选择"重写"**：使用重写模式时，浏览器地址栏的URL不会改变，用户体验更好。
2. **配置生效时间**：CDN配置变更通常需要5-10分钟生效，部分节点可能需要更长时间。
3. **清除CDN缓存**：配置生效后，建议手动清除CDN缓存，确保新规则立即生效。
4. **优先级顺序**：确保规则按照正确的顺序排列，具体页面规则放在通用规则前面。

## 备选方案：使用阿里云函数计算(FC)

如果您的CDN不支持URL重写功能，可以考虑使用阿里云函数计算作为入口，实现更灵活的路由控制。

### 配置步骤

1. 创建一个函数计算服务
2. 配置函数处理HTTP请求
3. 在函数中实现URL重写逻辑
4. 将域名DNS解析指向函数计算的自定义域名

### 函数示例代码

```javascript
exports.handler = async (event) => {
    const { path } = event;
    const pages = ['dashboard', 'attendance', 'attendance-new', 'exam', 'vote', 'chat', 'users', 'profile', 'settings', 'grading', 'participate'];
    const pageName = path.substring(1);
    
    if (pages.includes(pageName) && !path.includes('.')) {
        return {
            statusCode: 301,
            headers: {
                'Location': `/${pageName}.html`
            }
        };
    }
    
    // 其他请求直接转发到OSS
    return {
        statusCode: 200,
        headers: {
            'Content-Type': 'text/html'
        },
        body: ''
    };
};
```

## 总结

推荐使用**阿里云CDN URL重写**方案，这是最根本、最稳定的解决方案，无需依赖404页面或客户端JavaScript。