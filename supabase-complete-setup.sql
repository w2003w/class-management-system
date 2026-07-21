-- ============================================================
-- 班级管理系统 - 完整数据库设置脚本
-- 请在 Supabase SQL Editor 中执行此脚本
-- ============================================================

-- 启用扩展
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 删除旧表（如果存在）
DROP TABLE IF EXISTS chat_messages CASCADE;
DROP TABLE IF EXISTS chat_conversations CASCADE;
DROP TABLE IF EXISTS wrong_question_set_items CASCADE;
DROP TABLE IF EXISTS wrong_question_sets CASCADE;
DROP TABLE IF EXISTS questionnaire_records CASCADE;
DROP TABLE IF EXISTS questionnaires CASCADE;
DROP TABLE IF EXISTS permission_settings CASCADE;
DROP TABLE IF EXISTS password_reset_requests CASCADE;
DROP TABLE IF EXISTS lottery_records CASCADE;
DROP TABLE IF EXISTS lotteries CASCADE;
DROP TABLE IF EXISTS vote_records CASCADE;
DROP TABLE IF EXISTS votes CASCADE;
DROP TABLE IF EXISTS exam_records CASCADE;
DROP TABLE IF EXISTS exams CASCADE;
DROP TABLE IF EXISTS wrong_questions CASCADE;
DROP TABLE IF EXISTS vocabulary CASCADE;
DROP TABLE IF EXISTS file_records CASCADE;
DROP TABLE IF EXISTS knowledge_points CASCADE;
DROP TABLE IF EXISTS question_types CASCADE;
DROP TABLE IF EXISTS subjects CASCADE;
DROP TABLE IF EXISTS attendance_records CASCADE;
DROP TABLE IF EXISTS attendances CASCADE;
DROP TABLE IF EXISTS questions CASCADE;
DROP TABLE IF EXISTS notifications CASCADE;
DROP TABLE IF EXISTS settings CASCADE;
DROP TABLE IF EXISTS user_groups CASCADE;
DROP TABLE IF EXISTS users CASCADE;
DROP TABLE IF EXISTS groups CASCADE;

-- ============================================================
-- 1. 分组表
-- ============================================================
CREATE TABLE groups (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT UNIQUE NOT NULL,
    description TEXT,
    permissions JSONB DEFAULT '{}'::jsonb,
    created_by UUID,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================================
-- 2. 用户表
-- ============================================================
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    username TEXT UNIQUE NOT NULL,
    password TEXT NOT NULL,
    name TEXT NOT NULL,
    role TEXT DEFAULT 'user',
    department TEXT,
    class_name TEXT,
    email TEXT,
    phone TEXT,
    avatar_url TEXT,
    status TEXT DEFAULT 'active',
    group_id UUID,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================================
-- 3. 用户分组关联表
-- ============================================================
CREATE TABLE user_groups (
    user_id UUID,
    group_id UUID,
    role TEXT DEFAULT 'member' CHECK (role IN ('admin', 'member')),
    joined_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    PRIMARY KEY (user_id, group_id)
);

-- 添加外键约束（在表创建完成后）
ALTER TABLE users ADD CONSTRAINT fk_users_group FOREIGN KEY (group_id) REFERENCES groups(id);
ALTER TABLE groups ADD CONSTRAINT fk_groups_created_by FOREIGN KEY (created_by) REFERENCES users(id);
ALTER TABLE user_groups ADD CONSTRAINT fk_user_groups_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE;
ALTER TABLE user_groups ADD CONSTRAINT fk_user_groups_group FOREIGN KEY (group_id) REFERENCES groups(id) ON DELETE CASCADE;

-- ============================================================
-- 4. 签到活动表
-- ============================================================
CREATE TABLE attendances (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL,
    type TEXT DEFAULT 'normal' CHECK (type IN ('normal', 'course', 'event')),
    scope TEXT DEFAULT 'all' CHECK (scope IN ('all', 'group', 'selected')),
    location_name TEXT,
    latitude DECIMAL,
    longitude DECIMAL,
    radius DECIMAL DEFAULT 100,
    start_time TIMESTAMP WITH TIME ZONE NOT NULL,
    end_time TIMESTAMP WITH TIME ZONE NOT NULL,
    status TEXT DEFAULT 'active',
    created_by UUID REFERENCES users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================================
-- 5. 签到记录表
-- ============================================================
CREATE TABLE attendance_records (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    attendance_id UUID REFERENCES attendances(id) ON DELETE CASCADE,
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    status TEXT DEFAULT 'checked_in',
    checkin_time TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    latitude DECIMAL,
    longitude DECIMAL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================================
-- 6. 科目表
-- ============================================================
CREATE TABLE subjects (
    id TEXT PRIMARY KEY,
    name TEXT UNIQUE NOT NULL,
    color TEXT DEFAULT '#3B82F6',
    icon TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================================
-- 7. 题型表
-- ============================================================
CREATE TABLE question_types (
    id BIGINT PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
    name TEXT UNIQUE NOT NULL,
    description TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================================
-- 8. 知识点表
-- ============================================================
CREATE TABLE knowledge_points (
    id BIGINT PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
    name TEXT NOT NULL,
    subject_id TEXT REFERENCES subjects(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================================
-- 9. 题目表
-- ============================================================
CREATE TABLE questions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    type TEXT NOT NULL,
    content TEXT NOT NULL,
    options JSONB,
    answer TEXT NOT NULL,
    analysis TEXT,
    difficulty TEXT DEFAULT 'medium',
    subject_id TEXT REFERENCES subjects(id),
    knowledge_point_id BIGINT REFERENCES knowledge_points(id),
    created_by UUID REFERENCES users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================================
-- 10. 考试表
-- ============================================================
CREATE TABLE exams (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL,
    description TEXT,
    start_time TIMESTAMP WITH TIME ZONE NOT NULL,
    end_time TIMESTAMP WITH TIME ZONE NOT NULL,
    duration INTEGER DEFAULT 60,
    total_score INTEGER DEFAULT 100,
    questions JSONB,
    status TEXT DEFAULT 'draft',
    created_by UUID REFERENCES users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================================
-- 11. 考试记录表
-- ============================================================
CREATE TABLE exam_records (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    exam_id UUID REFERENCES exams(id) ON DELETE CASCADE,
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    score INTEGER DEFAULT 0,
    answers JSONB,
    submitted BOOLEAN DEFAULT FALSE,
    submitted_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================================
-- 12. 投票表
-- ============================================================
CREATE TABLE votes (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    title TEXT NOT NULL,
    description TEXT,
    options JSONB NOT NULL,
    allow_multiple BOOLEAN DEFAULT FALSE,
    max_selections INTEGER DEFAULT 1,
    start_time TIMESTAMP WITH TIME ZONE,
    end_time TIMESTAMP WITH TIME ZONE,
    status TEXT DEFAULT 'active',
    created_by UUID REFERENCES users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================================
-- 13. 投票记录表
-- ============================================================
CREATE TABLE vote_records (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    vote_id UUID REFERENCES votes(id) ON DELETE CASCADE,
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    selections JSONB NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================================
-- 14. 抽奖表
-- ============================================================
CREATE TABLE lotteries (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    title TEXT NOT NULL,
    description TEXT,
    prizes JSONB NOT NULL,
    start_time TIMESTAMP WITH TIME ZONE,
    end_time TIMESTAMP WITH TIME ZONE,
    status TEXT DEFAULT 'active',
    created_by UUID REFERENCES users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================================
-- 15. 抽奖记录表
-- ============================================================
CREATE TABLE lottery_records (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    lottery_id UUID REFERENCES lotteries(id) ON DELETE CASCADE,
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    prize JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================================
-- 16. 通知表
-- ============================================================
CREATE TABLE notifications (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    content TEXT NOT NULL,
    type TEXT DEFAULT 'info',
    read BOOLEAN DEFAULT FALSE,
    read_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================================
-- 17. 密码重置请求表
-- ============================================================
CREATE TABLE password_reset_requests (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    email TEXT NOT NULL,
    token TEXT UNIQUE NOT NULL,
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================================
-- 18. 错题本表
-- ============================================================
CREATE TABLE wrong_questions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    question_id UUID REFERENCES questions(id) ON DELETE CASCADE,
    wrong_count INTEGER DEFAULT 1,
    last_wrong_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================================
-- 19. 词汇表
-- ============================================================
CREATE TABLE vocabulary (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    word TEXT NOT NULL,
    phonetic TEXT,
    meaning TEXT NOT NULL,
    example TEXT,
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    mastered BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================================
-- 20. 文件记录表
-- ============================================================
CREATE TABLE file_records (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    filename TEXT NOT NULL,
    filepath TEXT NOT NULL,
    file_size INTEGER,
    file_type TEXT,
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================================
-- 21. 问卷表
-- ============================================================
CREATE TABLE questionnaires (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    title TEXT NOT NULL,
    description TEXT,
    questions JSONB,
    start_time TIMESTAMP WITH TIME ZONE,
    end_time TIMESTAMP WITH TIME ZONE,
    status TEXT DEFAULT 'active',
    created_by UUID REFERENCES users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================================
-- 22. 问卷记录表
-- ============================================================
CREATE TABLE questionnaire_records (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    questionnaire_id UUID REFERENCES questionnaires(id) ON DELETE CASCADE,
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    answers JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================================
-- 23. 权限设置表
-- ============================================================
CREATE TABLE permission_settings (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    role TEXT UNIQUE NOT NULL,
    permissions JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================================
-- 24. 错题集表
-- ============================================================
CREATE TABLE wrong_question_sets (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    description TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================================
-- 25. 错题集项表
-- ============================================================
CREATE TABLE wrong_question_set_items (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    set_id UUID REFERENCES wrong_question_sets(id) ON DELETE CASCADE,
    question_id UUID REFERENCES questions(id) ON DELETE CASCADE,
    added_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================================
-- 26. 设置表
-- ============================================================
CREATE TABLE settings (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    key TEXT UNIQUE NOT NULL,
    value JSONB,
    description TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================================
-- 27. 聊天会话表
-- ============================================================
CREATE TABLE chat_conversations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT,
    type TEXT DEFAULT 'private' CHECK (type IN ('private', 'group')),
    participants UUID[] NOT NULL,
    last_message TEXT,
    last_message_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_by UUID REFERENCES users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    unread_count JSONB DEFAULT '{}'::jsonb
);

-- ============================================================
-- 28. 聊天消息表
-- ============================================================
CREATE TABLE chat_messages (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    conversation_id UUID REFERENCES chat_conversations(id) ON DELETE CASCADE,
    sender_id UUID REFERENCES users(id),
    content TEXT NOT NULL,
    type TEXT DEFAULT 'text' CHECK (type IN ('text', 'image', 'file', 'system')),
    metadata JSONB,
    status TEXT DEFAULT 'sent' CHECK (status IN ('sending', 'sent', 'delivered', 'read', 'failed')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    read_at TIMESTAMP WITH TIME ZONE
);

-- ============================================================
-- 创建索引
-- ============================================================
CREATE INDEX idx_users_username ON users(username);
CREATE INDEX idx_users_role ON users(role);
CREATE INDEX idx_users_group ON users(group_id);
CREATE INDEX idx_users_status ON users(status);

CREATE INDEX idx_groups_name ON groups(name);

CREATE INDEX idx_attendance_records_attendance ON attendance_records(attendance_id);
CREATE INDEX idx_attendance_records_user ON attendance_records(user_id);
CREATE INDEX idx_attendance_records_checkin_time ON attendance_records(checkin_time);

CREATE INDEX idx_exam_records_exam ON exam_records(exam_id);
CREATE INDEX idx_exam_records_user ON exam_records(user_id);

CREATE INDEX idx_vote_records_vote ON vote_records(vote_id);
CREATE INDEX idx_vote_records_user ON vote_records(user_id);

CREATE INDEX idx_lottery_records_lottery ON lottery_records(lottery_id);
CREATE INDEX idx_lottery_records_user ON lottery_records(user_id);

CREATE INDEX idx_notifications_user ON notifications(user_id);
CREATE INDEX idx_notifications_read ON notifications(read);

CREATE INDEX idx_questions_subject ON questions(subject_id);
CREATE INDEX idx_questions_type ON questions(type);

CREATE INDEX idx_wrong_questions_user ON wrong_questions(user_id);
CREATE INDEX idx_wrong_questions_question ON wrong_questions(question_id);

CREATE INDEX idx_chat_messages_conversation ON chat_messages(conversation_id);
CREATE INDEX idx_chat_messages_sender ON chat_messages(sender_id);
CREATE INDEX idx_chat_messages_created ON chat_messages(created_at);

-- ============================================================
-- 初始化数据
-- ============================================================

-- 初始化分组数据
INSERT INTO groups (id, name, description, permissions) VALUES
('00000000-0000-0000-0000-000000000001', '2024级1班', '计算机科学与技术专业2024级1班', '{"dashboard": true, "attendance": true, "exam": true, "vote": true, "chat": true}'),
('00000000-0000-0000-0000-000000000002', '2024级2班', '计算机科学与技术专业2024级2班', '{"dashboard": true, "attendance": true, "exam": true, "vote": true, "chat": true}'),
('00000000-0000-0000-0000-000000000003', '2025级1班', '软件工程专业2025级1班', '{"dashboard": true, "attendance": true, "exam": true, "vote": true, "chat": true}'),
('00000000-0000-0000-0000-000000000004', '教师组', '全体教师成员', '{"dashboard": true, "attendance": true, "exam": true, "vote": true, "chat": true, "users": true}')
ON CONFLICT (id) DO NOTHING;

-- 初始化管理员用户
INSERT INTO users (id, username, password, name, role, status, created_at) 
VALUES ('00000000-0000-0000-0000-000000000001', 'admin', 'admin123', '系统管理员', 'admin', 'active', NOW())
ON CONFLICT (username) DO NOTHING;

-- 初始化科目数据
INSERT INTO subjects (id, name, color) VALUES 
('1', '语文', '#EF4444'),
('2', '数学', '#3B82F6'),
('3', '英语', '#22C55E'),
('4', '物理', '#F59E0B'),
('5', '化学', '#8B5CF6'),
('6', '生物', '#EC4899'),
('7', '历史', '#6B7280'),
('8', '地理', '#14B8A6'),
('9', '政治', '#F97316')
ON CONFLICT (id) DO NOTHING;

-- 初始化题型数据
INSERT INTO question_types (name, description) VALUES
('single', '单选题'),
('multiple', '多选题'),
('judge', '判断题'),
('fill', '填空题'),
('short', '简答题'),
('essay', '论述题')
ON CONFLICT (name) DO NOTHING;

-- 初始化权限设置
INSERT INTO permission_settings (role, permissions) VALUES
('admin', '{"dashboard": true, "attendance": true, "exam": true, "vote": true, "chat": true, "users": true, "settings": true}'),
('subAdmin', '{"dashboard": true, "attendance": true, "exam": true, "vote": true, "chat": true}'),
('user', '{"dashboard": true, "attendance": true, "exam": true, "vote": true, "chat": true}')
ON CONFLICT (role) DO NOTHING;

-- 初始化全局群聊会话
INSERT INTO chat_conversations (id, name, type, participants, created_by, last_message_at, unread_count)
VALUES ('00000000-0000-0000-0000-000000000001', '班级群聊', 'group', '{}', NULL, NOW(), '{}'::jsonb)
ON CONFLICT (id) DO NOTHING;

-- ============================================================
-- 设置行级安全策略（Supabase必需）
-- ============================================================

-- 启用行级安全
ALTER TABLE groups ENABLE ROW LEVEL SECURITY;
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE attendances ENABLE ROW LEVEL SECURITY;
ALTER TABLE attendance_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE questions ENABLE ROW LEVEL SECURITY;
ALTER TABLE exams ENABLE ROW LEVEL SECURITY;
ALTER TABLE exam_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE votes ENABLE ROW LEVEL SECURITY;
ALTER TABLE vote_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE lotteries ENABLE ROW LEVEL SECURITY;
ALTER TABLE lottery_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE chat_conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE chat_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE subjects ENABLE ROW LEVEL SECURITY;
ALTER TABLE question_types ENABLE ROW LEVEL SECURITY;
ALTER TABLE knowledge_points ENABLE ROW LEVEL SECURITY;
ALTER TABLE wrong_questions ENABLE ROW LEVEL SECURITY;

-- 允许匿名访问（开发环境）
CREATE POLICY "Allow anonymous access to groups" ON groups FOR ALL USING (true);
CREATE POLICY "Allow anonymous access to users" ON users FOR ALL USING (true);
CREATE POLICY "Allow anonymous access to attendances" ON attendances FOR ALL USING (true);
CREATE POLICY "Allow anonymous access to attendance_records" ON attendance_records FOR ALL USING (true);
CREATE POLICY "Allow anonymous access to questions" ON questions FOR ALL USING (true);
CREATE POLICY "Allow anonymous access to exams" ON exams FOR ALL USING (true);
CREATE POLICY "Allow anonymous access to exam_records" ON exam_records FOR ALL USING (true);
CREATE POLICY "Allow anonymous access to votes" ON votes FOR ALL USING (true);
CREATE POLICY "Allow anonymous access to vote_records" ON vote_records FOR ALL USING (true);
CREATE POLICY "Allow anonymous access to lotteries" ON lotteries FOR ALL USING (true);
CREATE POLICY "Allow anonymous access to lottery_records" ON lottery_records FOR ALL USING (true);
CREATE POLICY "Allow anonymous access to notifications" ON notifications FOR ALL USING (true);
CREATE POLICY "Allow anonymous access to chat_conversations" ON chat_conversations FOR ALL USING (true);
CREATE POLICY "Allow anonymous access to chat_messages" ON chat_messages FOR ALL USING (true);
CREATE POLICY "Allow anonymous access to subjects" ON subjects FOR ALL USING (true);
CREATE POLICY "Allow anonymous access to question_types" ON question_types FOR ALL USING (true);
CREATE POLICY "Allow anonymous access to knowledge_points" ON knowledge_points FOR ALL USING (true);
CREATE POLICY "Allow anonymous access to wrong_questions" ON wrong_questions FOR ALL USING (true);

-- ============================================================
-- 创建视图
-- ============================================================

-- 用户统计视图
CREATE VIEW user_stats AS
SELECT 
    role,
    status,
    COUNT(*) as count
FROM users
GROUP BY role, status;

-- 分组统计视图
CREATE VIEW group_stats AS
SELECT 
    g.id,
    g.name,
    COUNT(u.id) as user_count
FROM groups g
LEFT JOIN users u ON g.id = u.group_id
GROUP BY g.id, g.name;

-- ============================================================
-- 完成
-- ============================================================
SELECT '数据库设置完成' as result;