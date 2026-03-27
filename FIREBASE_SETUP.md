# Firebase 云端存储配置指南

本系统已集成 Firebase 云端存储功能，可以实现数据永久存储、多用户共享、跨设备同步。

## 🚀 快速开始

### 第一步：创建 Firebase 项目

1. 访问 [Firebase Console](https://console.firebase.google.com/)
2. 点击「添加项目」
3. 输入项目名称（如：class-management-system）
4. 按照向导完成项目创建

### 第二步：注册 Web 应用

1. 在项目概览页面，点击「添加应用」
2. 选择 Web 应用（`</>` 图标）
3. 输入应用昵称
4. 勾选「同时设置 Firebase Hosting」（可选）
5. 点击「注册应用」
6. **复制配置信息**，格式如下：

```javascript
const firebaseConfig = {
  apiKey: "AIzaSy...",
  authDomain: "your-project.firebaseapp.com",
  projectId: "your-project",
  storageBucket: "your-project.appspot.com",
  messagingSenderId: "123456789",
  appId: "1:123456789:web:abcdef"
};
```

### 第三步：配置项目

打开 `js/firebase-config.js` 文件，将配置信息替换：

```javascript
const FirebaseConfig = {
    apiKey: "你的_API_KEY",
    authDomain: "你的项目ID.firebaseapp.com",
    projectId: "你的项目ID",
    storageBucket: "你的项目ID.appspot.com",
    messagingSenderId: "你的发送者ID",
    appId: "你的应用ID"
};
```

### 第四步：启用 Firestore 数据库

1. 在 Firebase Console 左侧菜单，点击「Firestore Database」
2. 点击「创建数据库」
3. 选择「以测试模式启动」（开发阶段）
4. 选择数据库位置（建议选择离用户最近的区域）
5. 点击「启用」

### 第五步：启用身份验证

1. 在 Firebase Console 左侧菜单，点击「Authentication」
2. 点击「开始」
3. 启用「电子邮件/密码」登录方式
4. 保存设置

### 第六步：配置安全规则（重要！）

在 Firestore Database → 规则 中，设置以下规则：

```
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // 允许所有读写（开发阶段）
    // 生产环境请根据需要修改规则
    match /{document=**} {
      allow read, write: if true;
    }
  }
}
```

**⚠️ 安全警告**：上述规则允许任何人读写数据库，仅适用于开发和测试。生产环境请配置更严格的规则。

### 第七步：创建管理员账户

系统启动后，需要手动创建第一个管理员账户：

1. 在 Firebase Console → Authentication → 用户
2. 点击「添加用户」
3. 输入邮箱和密码（如：admin@class-system.local / admin123）
4. 然后在 Firestore Database 中手动添加用户记录：

```json
{
  "id": "1",
  "username": "admin",
  "password": "admin123",
  "name": "系统管理员",
  "role": "admin",
  "status": "active",
  "email": "admin@class-system.local",
  "createdAt": "2024-01-01T00:00:00.000Z"
}
```

## 📊 数据结构

系统使用以下 Firestore 集合：

| 集合名称 | 说明 |
|---------|------|
| `users` | 用户数据 |
| `groups` | 分组数据 |
| `attendances` | 签到活动 |
| `attendanceRecords` | 签到记录 |
| `exams` | 考试数据 |
| `examRecords` | 考试记录 |
| `questions` | 题库数据 |
| `votes` | 投票活动 |
| `voteRecords` | 投票记录 |
| `lotteries` | 抽奖活动 |
| `lotteryRecords` | 抽奖记录 |
| `notifications` | 通知消息 |
| `passwordResetRequests` | 密码重置请求 |

## 🔄 数据迁移

如果您之前使用 LocalStorage 存储数据，可以迁移到 Firebase：

1. 打开浏览器开发者工具（F12）
2. 在控制台执行：

```javascript
DataService.migrateToFirebase();
```

## ⚙️ 工作模式

系统支持两种存储模式：

### LocalStorage 模式（默认）
- 数据存储在浏览器本地
- 每个用户数据独立
- 清除浏览器数据会丢失

### Firebase 模式
- 数据存储在云端
- 多用户共享数据
- 永久保存，跨设备同步

系统会自动检测 Firebase 配置：
- 如果配置了有效的 Firebase，自动使用云端存储
- 如果未配置或配置无效，自动回退到 LocalStorage

## 🔒 生产环境安全建议

1. **配置 Firestore 安全规则**：

```
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // 用户必须登录才能访问
    match /{document=**} {
      allow read, write: if request.auth != null;
    }
    
    // 用户只能修改自己的数据
    match /users/{userId} {
      allow read: if request.auth != null;
      allow write: if request.auth != null && 
        (request.auth.uid == userId || 
         get(/databases/$(database)/documents/users/$(request.auth.uid)).data.role == 'admin');
    }
  }
}
```

2. **启用 App Check**（防止滥用）

3. **设置使用配额**（防止超额费用）

4. **定期备份数据**

## 💰 费用说明

Firebase 提供免费套餐（Spark 计划）：
- 存储：1 GB
- 每日读取：50,000 次
- 每日写入：20,000 次
- 每日删除：20,000 次

对于小型班级管理系统，免费额度通常足够使用。

## 🆘 常见问题

### Q: 配置后仍然使用 LocalStorage？
A: 检查 Firebase 配置是否正确，确保 apiKey 不是 "YOUR_API_KEY"

### Q: 登录失败？
A: 
1. 确认已启用「电子邮件/密码」登录方式
2. 确认用户已在 Authentication 中创建
3. 确认用户记录已在 Firestore 中创建

### Q: 数据无法保存？
A: 检查 Firestore 安全规则是否允许写入

### Q: 如何查看数据？
A: 在 Firebase Console → Firestore Database 中可以查看和管理所有数据

## 📞 技术支持

如有问题，请检查：
1. Firebase Console 中的错误日志
2. 浏览器开发者工具的控制台输出
3. Firebase 服务状态页面
