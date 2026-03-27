# Supabase 云端存储配置指南

Supabase 是开源的 Firebase 替代品，提供 PostgreSQL 数据库、身份验证、存储等服务。

## 🚀 快速开始

### 第一步：注册 Supabase 账号

1. 访问 Supabase 官网：**https://supabase.com/**
2. 点击「**Start your project**」
3. 使用 GitHub 账号登录（推荐）或邮箱注册

### 第二步：创建组织

1. 登录后，点击「**New organization**」
2. 输入组织名称：`My Organization`
3. 选择计划：**Free**（免费版）
4. 点击「Create organization」

### 第三步：创建项目

1. 在组织中点击「**New project**」
2. 输入项目名称：`class-management-system`
3. 设置数据库密码（请记住！）
4. 选择区域：**Northeast Asia (Tokyo)** 或 **Southeast Asia (Singapore)**（离中国最近）
5. 点击「Create new project」
6. 等待约 2 分钟，项目初始化完成

### 第四步：获取配置信息

1. 进入项目后，点击左侧「**Settings**」（齿轮图标）
2. 点击「**API**」
3. 复制以下信息：

```
Project URL: https://xxx.supabase.co
anon public: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

### 第五步：配置项目

打开项目中的 `js/supabase-config.js` 文件，填入配置：

```javascript
const SupabaseConfig = {
    url: '你的Project URL',
    anonKey: '你的anon public key'
};
```

### 第六步：创建数据表

1. 在 Supabase 控制台，点击左侧「**SQL Editor**」
2. 点击「**New query**」
3. 复制以下 SQL 并执行：

```sql
-- 用户表
CREATE TABLE users (
    id BIGINT PRIMARY KEY,
    username TEXT UNIQUE NOT NULL,
    password TEXT NOT NULL,
    name TEXT,
    role TEXT DEFAULT 'user',
    department TEXT,
    className TEXT,
    email TEXT,
    phone TEXT,
    remark TEXT,
    status TEXT DEFAULT 'active',
    createdAt TIMESTAMPTZ DEFAULT NOW()
);

-- 分组表
CREATE TABLE groups (
    id BIGINT PRIMARY KEY,
    name TEXT NOT NULL,
    members JSONB DEFAULT '[]',
    createdAt TIMESTAMPTZ DEFAULT NOW()
);

-- 签到活动表
CREATE TABLE attendances (
    id BIGINT PRIMARY KEY,
    name TEXT NOT NULL,
    description TEXT,
    status TEXT DEFAULT 'active',
    startTime TIMESTAMPTZ,
    endTime TIMESTAMPTZ,
    createdBy TEXT,
    createdAt TIMESTAMPTZ DEFAULT NOW()
);

-- 签到记录表
CREATE TABLE attendance_records (
    id BIGINT PRIMARY KEY,
    attendanceId BIGINT NOT NULL,
    userId BIGINT NOT NULL,
    status TEXT DEFAULT 'present',
    remark TEXT,
    createdAt TIMESTAMPTZ DEFAULT NOW()
);

-- 考试表
CREATE TABLE exams (
    id BIGINT PRIMARY KEY,
    title TEXT NOT NULL,
    description TEXT,
    questions JSONB DEFAULT '[]',
    duration INTEGER DEFAULT 60,
    status TEXT DEFAULT 'draft',
    createdBy TEXT,
    startTime TIMESTAMPTZ,
    endTime TIMESTAMPTZ,
    createdAt TIMESTAMPTZ DEFAULT NOW()
);

-- 题库表
CREATE TABLE questions (
    id BIGINT PRIMARY KEY,
    type TEXT NOT NULL,
    content TEXT NOT NULL,
    options JSONB,
    answer TEXT,
    score INTEGER DEFAULT 1,
    category TEXT,
    createdAt TIMESTAMPTZ DEFAULT NOW()
);

-- 考试记录表
CREATE TABLE exam_records (
    id BIGINT PRIMARY KEY,
    examId BIGINT NOT NULL,
    userId BIGINT NOT NULL,
    answers JSONB DEFAULT '{}',
    score INTEGER DEFAULT 0,
    submittedAt TIMESTAMPTZ DEFAULT NOW()
);

-- 投票表
CREATE TABLE votes (
    id BIGINT PRIMARY KEY,
    title TEXT NOT NULL,
    description TEXT,
    options JSONB DEFAULT '[]',
    status TEXT DEFAULT 'active',
    anonymous BOOLEAN DEFAULT false,
    multipleChoice BOOLEAN DEFAULT false,
    createdBy TEXT,
    startTime TIMESTAMPTZ,
    endTime TIMESTAMPTZ,
    createdAt TIMESTAMPTZ DEFAULT NOW()
);

-- 投票记录表
CREATE TABLE vote_records (
    id BIGINT PRIMARY KEY,
    voteId BIGINT NOT NULL,
    userId BIGINT NOT NULL,
    choices JSONB DEFAULT '[]',
    votedAt TIMESTAMPTZ DEFAULT NOW()
);

-- 抽奖表
CREATE TABLE lotteries (
    id BIGINT PRIMARY KEY,
    title TEXT NOT NULL,
    description TEXT,
    prizes JSONB DEFAULT '[]',
    status TEXT DEFAULT 'active',
    createdBy TEXT,
    createdAt TIMESTAMPTZ DEFAULT NOW()
);

-- 抽奖记录表
CREATE TABLE lottery_records (
    id BIGINT PRIMARY KEY,
    lotteryId BIGINT NOT NULL,
    userId BIGINT NOT NULL,
    prize TEXT,
    drawnAt TIMESTAMPTZ DEFAULT NOW()
);

-- 通知表
CREATE TABLE notifications (
    id BIGINT PRIMARY KEY,
    title TEXT NOT NULL,
    content TEXT,
    type TEXT DEFAULT 'info',
    targetRole TEXT,
    read BOOLEAN DEFAULT false,
    createdAt TIMESTAMPTZ DEFAULT NOW()
);

-- 密码重置请求表
CREATE TABLE password_reset_requests (
    id BIGINT PRIMARY KEY,
    userId BIGINT NOT NULL,
    reason TEXT,
    status TEXT DEFAULT 'pending',
    createdAt TIMESTAMPTZ DEFAULT NOW(),
    processedAt TIMESTAMPTZ
);

-- 启用 Row Level Security
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE groups ENABLE ROW LEVEL SECURITY;
ALTER TABLE attendances ENABLE ROW LEVEL SECURITY;
ALTER TABLE attendance_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE exams ENABLE ROW LEVEL SECURITY;
ALTER TABLE questions ENABLE ROW LEVEL SECURITY;
ALTER TABLE exam_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE votes ENABLE ROW LEVEL SECURITY;
ALTER TABLE vote_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE lotteries ENABLE ROW LEVEL SECURITY;
ALTER TABLE lottery_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE password_reset_requests ENABLE ROW LEVEL SECURITY;

-- 允许匿名读取（开发模式）
CREATE POLICY "Allow all access" ON users FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all access" ON groups FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all access" ON attendances FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all access" ON attendance_records FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all access" ON exams FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all access" ON questions FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all access" ON exam_records FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all access" ON votes FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all access" ON vote_records FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all access" ON lotteries FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all access" ON lottery_records FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all access" ON notifications FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all access" ON password_reset_requests FOR ALL USING (true) WITH CHECK (true);

-- 插入默认管理员
INSERT INTO users (id, username, password, name, role, status)
VALUES (1, 'admin', 'admin123', '系统管理员', 'admin', 'active');
```

4. 点击「**Run**」执行 SQL

### 第七步：测试

1. 启动本地服务器
2. 打开浏览器控制台（F12）
3. 应该看到：`Using Supabase for data storage`
4. 使用 admin / admin123 登录

---

## 💰 免费额度

Supabase 免费版提供：

| 资源 | 免费额度 |
|------|---------|
| 数据库 | 500 MB |
| 存储 | 1 GB |
| 带宽 | 5 GB/月 |
| API 请求 | 无限制 |
| 并发连接 | 60 个 |

对于小型班级管理系统，免费额度完全够用！

---

## ⚠️ 注意事项

1. **数据库密码**：创建项目时设置的密码请妥善保管
2. **区域选择**：选择离用户最近的区域以获得最佳性能
3. **安全规则**：生产环境建议配置更严格的 RLS 策略
4. **数据备份**：建议定期在控制台导出数据备份

---

## 🔒 安全配置（生产环境推荐）

创建数据表后，建议配置更严格的访问权限：

```sql
-- 删除之前的开放策略
DROP POLICY IF EXISTS "Allow all access" ON users;

-- 只允许已登录用户访问
CREATE POLICY "Users can view users" ON users
    FOR SELECT USING (true);

CREATE POLICY "Admins can insert users" ON users
    FOR INSERT WITH CHECK (
        EXISTS (
            SELECT 1 FROM users WHERE id = current_user_id() AND role = 'admin'
        )
    );

-- 类似地为其他表配置策略...
```

---

## 🆘 常见问题

### Q: 提示 "Invalid API key" 错误？
A: 检查 URL 和 anon key 是否正确配置

### Q: 数据保存失败？
A: 
1. 检查数据表是否已创建
2. 检查 RLS 策略是否正确配置
3. 查看浏览器控制台的详细错误信息

### Q: 登录失败？
A: 
1. 确认 users 表已创建
2. 确认管理员用户已插入
3. 检查用户名和密码是否正确

### Q: 如何查看数据？
A: 在 Supabase 控制台 → Table Editor 中查看和编辑数据

---

## 📞 技术支持

- Supabase 官方文档：https://supabase.com/docs
- Supabase GitHub：https://github.com/supabase/supabase

---

## 🔄 存储模式切换

系统支持四种存储模式，按优先级自动选择：

1. **Supabase**（优先）- 开源，功能强大
2. **LeanCloud** - 国内服务（已停止新用户注册）
3. **Firebase** - Google 服务，海外稳定
4. **LocalStorage**（默认）- 本地存储，无需配置

配置 Supabase 后，系统会自动使用 Supabase，无需修改其他代码。
