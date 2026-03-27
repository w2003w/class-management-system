# LeanCloud 云端存储配置指南

LeanCloud 是国内领先的 BaaS（后端即服务）平台，提供稳定的数据存储服务，在中国访问速度快。

## 🚀 快速开始

### 第一步：注册 LeanCloud 账号

1. 访问 LeanCloud 官网：**https://www.leancloud.cn/**
2. 点击右上角「**注册**」
3. 填写邮箱、密码，完成注册
4. 登录邮箱验证账号

### 第二步：实名认证（必须）

1. 登录后，进入「**账号设置**」→「**实名认证**」
2. 填写真实姓名和身份证号
3. 完成实名认证（通常几分钟内完成）

### 第三步：创建应用

1. 进入 LeanCloud 控制台
2. 点击「**创建应用**」
3. 选择「**开发版**」（免费）
4. 输入应用名称：`class-management-system`
5. 点击「创建」

### 第四步：获取配置信息

1. 进入刚创建的应用
2. 点击左侧「**设置**」→「**应用凭证**」
3. 复制以下信息：

```
App ID: xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
App Key: xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
服务器地址: https://xxx.leancloud.cn
```

### 第五步：配置项目

打开项目中的 `js/leancloud-config.js` 文件，填入配置：

```javascript
const LeanCloudConfig = {
    appId: '你的AppID',
    appKey: '你的AppKey',
    serverURL: '你的服务器地址'
};
```

### 第六步：创建数据表

LeanCloud 会自动创建数据表，但首次使用时需要手动创建第一个管理员：

1. 在 LeanCloud 控制台，点击「**数据存储**」→「**结构化数据**」
2. 点击「**创建 Class**」
3. 输入 Class 名称：`Users`
4. 点击「创建」
5. 点击「添加行」，手动添加第一个管理员：

| 字段 | 值 |
|------|-----|
| id | 1 |
| username | admin |
| password | admin123 |
| name | 系统管理员 |
| role | admin |
| status | active |

### 第七步：测试

1. 启动本地服务器
2. 打开浏览器控制台（F12）
3. 应该看到：`Using LeanCloud for data storage`
4. 使用 admin / admin123 登录

## 📊 数据表说明

系统会自动使用以下数据表：

| 表名 | 说明 |
|------|------|
| Users | 用户数据 |
| Groups | 分组数据 |
| Attendances | 签到活动 |
| AttendanceRecords | 签到记录 |
| Exams | 考试数据 |
| ExamRecords | 考试记录 |
| Questions | 题库数据 |
| Votes | 投票活动 |
| VoteRecords | 投票记录 |
| Lotteries | 抽奖活动 |
| LotteryRecords | 抽奖记录 |
| Notifications | 通知消息 |
| PasswordResetRequests | 密码重置请求 |

## 💰 免费额度

LeanCloud 开发版（免费）提供：

| 资源 | 免费额度 |
|------|---------|
| 存储空间 | 1 GB |
| 数据传输 | 1 GB/天 |
| API 请求 | 30,000 次/天 |
| 并发连接 | 50 个 |

对于小型班级管理系统，免费额度完全够用！

## ⚠️ 注意事项

1. **必须实名认证**：未实名认证的账号无法使用
2. **开发版限制**：免费版有请求限制，适合小型项目
3. **数据备份**：建议定期在控制台导出数据备份
4. **安全规则**：生产环境建议配置 ACL 权限

## 🔒 安全配置（可选）

如需限制数据访问权限：

1. 进入「数据存储」→「结构化数据」
2. 选择对应的 Class
3. 点击「权限设置」
4. 配置读写权限

建议配置：
- Users 表：仅登录用户可读，仅管理员可写
- 其他表：仅登录用户可读，仅管理员可写

## 🆘 常见问题

### Q: 提示 "Unauthorized" 错误？
A: 检查 App ID 和 App Key 是否正确配置

### Q: 数据保存失败？
A: 检查是否已完成实名认证

### Q: 登录失败？
A: 
1. 确认 Users 表已创建
2. 确认用户数据已添加
3. 检查用户名和密码是否正确

### Q: 如何查看数据？
A: 在 LeanCloud 控制台 → 数据存储 → 结构化数据 中查看

## 📞 技术支持

- LeanCloud 官方文档：https://leancloud.cn/docs/
- LeanCloud 社区：https://forum.leancloud.cn/

---

## 🔄 存储模式切换

系统支持三种存储模式，按优先级自动选择：

1. **LeanCloud**（优先）- 国内稳定，推荐使用
2. **Firebase** - 海外服务，可能需要代理
3. **LocalStorage**（默认）- 本地存储，无需配置

配置 LeanCloud 后，系统会自动使用 LeanCloud，无需修改其他代码。
