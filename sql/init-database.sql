-- ================================================
-- 班级管理系统 - 数据库初始化脚本
-- ================================================

-- 创建扩展
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ================================================
-- 1. 用户表
-- ================================================
CREATE TABLE IF NOT EXISTS users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    username TEXT NOT NULL,
    email TEXT UNIQUE NOT NULL,
    password TEXT NOT NULL,
    role TEXT DEFAULT 'member' CHECK (role IN ('admin', 'subAdmin', 'member')),
    status TEXT DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'banned')),
    department TEXT,
    class_name TEXT,
    avatar_url TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 确保 avatar_url 列存在（处理已存在的旧表）
ALTER TABLE users ADD COLUMN IF NOT EXISTS role TEXT DEFAULT 'member';
ALTER TABLE users ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'active';
ALTER TABLE users ADD COLUMN IF NOT EXISTS department TEXT;
ALTER TABLE users ADD COLUMN IF NOT EXISTS class_name TEXT;
ALTER TABLE users ADD COLUMN IF NOT EXISTS avatar_url TEXT;
ALTER TABLE users ADD COLUMN IF NOT EXISTS created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP;
ALTER TABLE users ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP;
ALTER TABLE users ADD COLUMN IF NOT EXISTS group_id UUID REFERENCES groups(id);

-- 创建索引
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_role ON users(role);
CREATE INDEX IF NOT EXISTS idx_users_status ON users(status);

-- ================================================
-- 2. 分组表
-- ================================================
CREATE TABLE IF NOT EXISTS groups (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL,
    description TEXT,
    permissions JSONB DEFAULT '{}'::jsonb,
    created_by UUID REFERENCES users(id),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 初始化分组数据
INSERT INTO groups (id, name, description, permissions) VALUES
('00000000-0000-0000-0000-000000000001', '2024级1班', '计算机科学与技术专业2024级1班', '{"dashboard": true, "attendance": true, "exam": true, "vote": true, "chat": true}'),
('00000000-0000-0000-0000-000000000002', '2024级2班', '计算机科学与技术专业2024级2班', '{"dashboard": true, "attendance": true, "exam": true, "vote": true, "chat": true}'),
('00000000-0000-0000-0000-000000000003', '2025级1班', '软件工程专业2025级1班', '{"dashboard": true, "attendance": true, "exam": true, "vote": true, "chat": true}'),
('00000000-0000-0000-0000-000000000004', '教师组', '全体教师成员', '{"dashboard": true, "attendance": true, "exam": true, "vote": true, "chat": true, "users": true}')
ON CONFLICT (id) DO NOTHING;

-- ================================================
-- 3. 用户分组关联表
-- ================================================
CREATE TABLE IF NOT EXISTS user_groups (
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    group_id UUID REFERENCES groups(id) ON DELETE CASCADE,
    role TEXT DEFAULT 'member' CHECK (role IN ('admin', 'member')),
    joined_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (user_id, group_id)
);

-- ================================================
-- 4. 签到活动表
-- ================================================
CREATE TABLE IF NOT EXISTS attendances (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL,
    type TEXT DEFAULT 'normal' CHECK (type IN ('normal', 'course', 'event')),
    scope TEXT DEFAULT 'all' CHECK (scope IN ('all', 'group', 'selected')),
    location_name TEXT,
    latitude DECIMAL,
    longitude DECIMAL,
    range_meters INTEGER DEFAULT 50,
    group_id bigint REFERENCES groups(id),
    member_ids TEXT[],
    start_time TIMESTAMP NOT NULL,
    end_time TIMESTAMP NOT NULL,
    repeat_type TEXT,
    daily_start_time TEXT,
    daily_end_time TEXT,
    weekdays TEXT[],
    custom_fields JSONB,
    created_by bigint REFERENCES users(id),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 确保 start_time 和 end_time 列存在（处理已存在的旧表）
ALTER TABLE attendances ADD COLUMN IF NOT EXISTS start_time TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP;
ALTER TABLE attendances ADD COLUMN IF NOT EXISTS end_time TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP;

CREATE INDEX IF NOT EXISTS idx_attendances_start_time ON attendances(start_time);
CREATE INDEX IF NOT EXISTS idx_attendances_end_time ON attendances(end_time);

-- ================================================
-- 5. 签到记录表
-- ================================================
CREATE TABLE IF NOT EXISTS attendance_records (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    attendance_id UUID REFERENCES attendances(id) ON DELETE CASCADE,
    user_id bigint REFERENCES users(id),
    latitude DECIMAL,
    longitude DECIMAL,
    accuracy DECIMAL,
    provider TEXT,
    address TEXT,
    status TEXT DEFAULT 'success' CHECK (status IN ('success', 'failed', 'late')),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 确保 attendance_id 列存在（处理已存在的旧表）
ALTER TABLE attendance_records ADD COLUMN IF NOT EXISTS attendance_id UUID;
ALTER TABLE attendance_records ADD COLUMN IF NOT EXISTS user_id bigint;
ALTER TABLE attendance_records ADD COLUMN IF NOT EXISTS latitude DECIMAL;
ALTER TABLE attendance_records ADD COLUMN IF NOT EXISTS longitude DECIMAL;
ALTER TABLE attendance_records ADD COLUMN IF NOT EXISTS accuracy DECIMAL;
ALTER TABLE attendance_records ADD COLUMN IF NOT EXISTS provider TEXT;
ALTER TABLE attendance_records ADD COLUMN IF NOT EXISTS address TEXT;
ALTER TABLE attendance_records ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'success';
ALTER TABLE attendance_records ADD COLUMN IF NOT EXISTS created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP;

CREATE INDEX IF NOT EXISTS idx_attendance_records_attendance_id ON attendance_records(attendance_id);
CREATE INDEX IF NOT EXISTS idx_attendance_records_user_id ON attendance_records(user_id);
CREATE INDEX IF NOT EXISTS idx_attendance_records_created_at ON attendance_records(created_at);

-- ================================================
-- 6. 科目表
-- ================================================
CREATE TABLE IF NOT EXISTS subjects (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL UNIQUE,
    color TEXT DEFAULT '#3B82F6',
    icon TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

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

-- ================================================
-- 7. 题型表
-- ================================================
CREATE TABLE IF NOT EXISTS question_types (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL UNIQUE,
    description TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 初始化题型数据
INSERT INTO question_types (id, name) VALUES 
('1', '选择题'),
('2', '填空题'),
('3', '判断题'),
('4', '简答题'),
('5', '计算题'),
('6', '证明题'),
('7', '作文'),
('8', '阅读理解'),
('9', '完形填空'),
('10', '翻译')
ON CONFLICT (id) DO NOTHING;

-- ================================================
-- 8. 知识点表
-- ================================================
CREATE TABLE IF NOT EXISTS knowledge_points (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    subject_id TEXT REFERENCES subjects(id) ON DELETE CASCADE,
    description TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ================================================
-- 9. 错题表
-- ================================================
CREATE TABLE IF NOT EXISTS wrong_questions (
    id TEXT PRIMARY KEY,
    subject_id TEXT REFERENCES subjects(id),
    type_id TEXT REFERENCES question_types(id),
    knowledge_id TEXT REFERENCES knowledge_points(id),
    content TEXT,
    image_data TEXT,
    options TEXT[],
    answer TEXT,
    my_answer TEXT,
    analysis TEXT,
    wrong_count INTEGER DEFAULT 1,
    user_id bigint REFERENCES users(id),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    last_reviewed_at TIMESTAMP,
    next_review_at TIMESTAMP,
    mastered BOOLEAN DEFAULT FALSE,
    tags TEXT[]
);

-- 确保 user_id 列存在（处理已存在的旧表）
ALTER TABLE wrong_questions ADD COLUMN IF NOT EXISTS user_id bigint;
ALTER TABLE wrong_questions ADD COLUMN IF NOT EXISTS wrong_count INTEGER DEFAULT 1;
ALTER TABLE wrong_questions ADD COLUMN IF NOT EXISTS created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP;
ALTER TABLE wrong_questions ADD COLUMN IF NOT EXISTS last_reviewed_at TIMESTAMP;
ALTER TABLE wrong_questions ADD COLUMN IF NOT EXISTS next_review_at TIMESTAMP;
ALTER TABLE wrong_questions ADD COLUMN IF NOT EXISTS mastered BOOLEAN DEFAULT FALSE;
ALTER TABLE wrong_questions ADD COLUMN IF NOT EXISTS tags TEXT[];

CREATE INDEX IF NOT EXISTS idx_wrong_questions_user_id ON wrong_questions(user_id);
CREATE INDEX IF NOT EXISTS idx_wrong_questions_subject_id ON wrong_questions(subject_id);
CREATE INDEX IF NOT EXISTS idx_wrong_questions_next_review_at ON wrong_questions(next_review_at);

-- ================================================
-- 10. 单词表
-- ================================================
CREATE TABLE IF NOT EXISTS vocabulary (
    id TEXT PRIMARY KEY,
    word TEXT NOT NULL,
    phonetic TEXT,
    meaning TEXT,
    example TEXT,
    user_id bigint REFERENCES users(id),
    wrong_count INTEGER DEFAULT 0,
    last_reviewed_at TIMESTAMP,
    next_review_at TIMESTAMP,
    mastered BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 确保 user_id 列存在（处理已存在的旧表）
ALTER TABLE vocabulary ADD COLUMN IF NOT EXISTS user_id bigint;
ALTER TABLE vocabulary ADD COLUMN IF NOT EXISTS wrong_count INTEGER DEFAULT 0;
ALTER TABLE vocabulary ADD COLUMN IF NOT EXISTS last_reviewed_at TIMESTAMP;
ALTER TABLE vocabulary ADD COLUMN IF NOT EXISTS next_review_at TIMESTAMP;
ALTER TABLE vocabulary ADD COLUMN IF NOT EXISTS mastered BOOLEAN DEFAULT FALSE;
ALTER TABLE vocabulary ADD COLUMN IF NOT EXISTS created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP;

CREATE INDEX IF NOT EXISTS idx_vocabulary_user_id ON vocabulary(user_id);

-- ================================================
-- 11. 复习记录表
-- ================================================
CREATE TABLE IF NOT EXISTS question_reviews (
    id TEXT PRIMARY KEY,
    question_id TEXT REFERENCES wrong_questions(id) ON DELETE CASCADE,
    user_id bigint REFERENCES users(id),
    reviewed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    result BOOLEAN NOT NULL,
    time_spent INTEGER
);

-- 确保 user_id 列存在（处理已存在的旧表）
ALTER TABLE question_reviews ADD COLUMN IF NOT EXISTS question_id TEXT;
ALTER TABLE question_reviews ADD COLUMN IF NOT EXISTS user_id bigint;
ALTER TABLE question_reviews ADD COLUMN IF NOT EXISTS reviewed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP;
ALTER TABLE question_reviews ADD COLUMN IF NOT EXISTS result BOOLEAN NOT NULL DEFAULT FALSE;
ALTER TABLE question_reviews ADD COLUMN IF NOT EXISTS time_spent INTEGER;

-- ================================================
-- 12. 考试表
-- ================================================
CREATE TABLE IF NOT EXISTS exams (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL,
    subject_id TEXT REFERENCES subjects(id),
    questions JSONB,
    total_score INTEGER DEFAULT 100,
    duration INTEGER DEFAULT 60,
    created_by bigint REFERENCES users(id),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 确保 subject_id 列存在（处理已存在的旧表）
ALTER TABLE exams ADD COLUMN IF NOT EXISTS subject_id TEXT;
ALTER TABLE exams ADD COLUMN IF NOT EXISTS questions JSONB;
ALTER TABLE exams ADD COLUMN IF NOT EXISTS total_score INTEGER DEFAULT 100;
ALTER TABLE exams ADD COLUMN IF NOT EXISTS duration INTEGER DEFAULT 60;
ALTER TABLE exams ADD COLUMN IF NOT EXISTS created_by bigint;
ALTER TABLE exams ADD COLUMN IF NOT EXISTS created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP;
ALTER TABLE exams ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP;

-- ================================================
-- 13. 考试记录表
-- ================================================
CREATE TABLE IF NOT EXISTS exam_records (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    exam_id UUID REFERENCES exams(id) ON DELETE CASCADE,
    user_id bigint REFERENCES users(id),
    answers JSONB,
    score INTEGER,
    submitted_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 确保 exam_id 列存在（处理已存在的旧表）
ALTER TABLE exam_records ADD COLUMN IF NOT EXISTS exam_id UUID;
ALTER TABLE exam_records ADD COLUMN IF NOT EXISTS user_id bigint;
ALTER TABLE exam_records ADD COLUMN IF NOT EXISTS answers JSONB;
ALTER TABLE exam_records ADD COLUMN IF NOT EXISTS score INTEGER;
ALTER TABLE exam_records ADD COLUMN IF NOT EXISTS submitted_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP;

CREATE INDEX IF NOT EXISTS idx_exam_records_exam_id ON exam_records(exam_id);
CREATE INDEX IF NOT EXISTS idx_exam_records_user_id ON exam_records(user_id);

-- ================================================
-- 14. 投票表
-- ================================================
CREATE TABLE IF NOT EXISTS votes (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL,
    description TEXT,
    options JSONB,
    multiple BOOLEAN DEFAULT FALSE,
    allow_anonymous BOOLEAN DEFAULT FALSE,
    start_time TIMESTAMP,
    end_time TIMESTAMP,
    created_by bigint REFERENCES users(id),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ================================================
-- 15. 投票记录表
-- ================================================
CREATE TABLE IF NOT EXISTS vote_records (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    vote_id UUID REFERENCES votes(id) ON DELETE CASCADE,
    user_id bigint REFERENCES users(id),
    answers TEXT[],
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 确保 vote_id 列存在（处理已存在的旧表）
ALTER TABLE vote_records ADD COLUMN IF NOT EXISTS vote_id UUID;
ALTER TABLE vote_records ADD COLUMN IF NOT EXISTS user_id bigint;
ALTER TABLE vote_records ADD COLUMN IF NOT EXISTS answers TEXT[];
ALTER TABLE vote_records ADD COLUMN IF NOT EXISTS created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP;

CREATE INDEX IF NOT EXISTS idx_vote_records_vote_id ON vote_records(vote_id);

-- ================================================
-- 16. 文件表
-- ================================================
CREATE TABLE IF NOT EXISTS files (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL,
    url TEXT,
    size BIGINT,
    type TEXT,
    folder_id UUID,
    user_id bigint REFERENCES users(id),
    shared BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 确保 user_id 列存在（处理已存在的旧表）
ALTER TABLE files ADD COLUMN IF NOT EXISTS folder_id UUID;
ALTER TABLE files ADD COLUMN IF NOT EXISTS user_id bigint;
ALTER TABLE files ADD COLUMN IF NOT EXISTS shared BOOLEAN DEFAULT FALSE;
ALTER TABLE files ADD COLUMN IF NOT EXISTS created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP;
ALTER TABLE files ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP;

CREATE INDEX IF NOT EXISTS idx_files_user_id ON files(user_id);
CREATE INDEX IF NOT EXISTS idx_files_folder_id ON files(folder_id);

-- ================================================
-- 17. 文件夹表
-- ================================================
CREATE TABLE IF NOT EXISTS folders (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL,
    parent_id UUID REFERENCES folders(id),
    user_id bigint REFERENCES users(id),
    shared BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 确保 user_id 列存在（处理已存在的旧表）
ALTER TABLE folders ADD COLUMN IF NOT EXISTS parent_id UUID;
ALTER TABLE folders ADD COLUMN IF NOT EXISTS user_id bigint;
ALTER TABLE folders ADD COLUMN IF NOT EXISTS shared BOOLEAN DEFAULT FALSE;
ALTER TABLE folders ADD COLUMN IF NOT EXISTS created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP;
ALTER TABLE folders ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP;

-- ================================================
-- 18. 功能组表
-- ================================================
CREATE TABLE IF NOT EXISTS feature_groups (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL,
    description TEXT,
    permissions JSONB,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ================================================
-- 19. 用户功能组关联表
-- ================================================
CREATE TABLE IF NOT EXISTS user_feature_groups (
    user_id bigint REFERENCES users(id) ON DELETE CASCADE,
    group_id UUID REFERENCES feature_groups(id) ON DELETE CASCADE,
    role TEXT DEFAULT 'member' CHECK (role IN ('admin', 'member')),
    joined_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (user_id, group_id)
);

-- ================================================
-- 20. 通知表
-- ================================================
CREATE TABLE IF NOT EXISTS notifications (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id bigint REFERENCES users(id),
    title TEXT,
    message TEXT,
    type TEXT DEFAULT 'info' CHECK (type IN ('info', 'success', 'warning', 'error')),
    read BOOLEAN DEFAULT FALSE,
    link TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 确保 user_id 列存在（处理已存在的旧表）
ALTER TABLE notifications ADD COLUMN IF NOT EXISTS user_id bigint;
ALTER TABLE notifications ADD COLUMN IF NOT EXISTS title TEXT;
ALTER TABLE notifications ADD COLUMN IF NOT EXISTS message TEXT;
ALTER TABLE notifications ADD COLUMN IF NOT EXISTS type TEXT DEFAULT 'info';
ALTER TABLE notifications ADD COLUMN IF NOT EXISTS read BOOLEAN DEFAULT FALSE;
ALTER TABLE notifications ADD COLUMN IF NOT EXISTS link TEXT;
ALTER TABLE notifications ADD COLUMN IF NOT EXISTS created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP;

CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_read ON notifications(read);

-- ================================================
-- 21. 系统设置表
-- ================================================
CREATE TABLE IF NOT EXISTS settings (
    id TEXT PRIMARY KEY,
    key TEXT UNIQUE NOT NULL,
    value JSONB,
    description TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 确保 key 列存在（处理已存在的旧表）
ALTER TABLE settings ADD COLUMN IF NOT EXISTS key TEXT;
ALTER TABLE settings ADD COLUMN IF NOT EXISTS value JSONB;
ALTER TABLE settings ADD COLUMN IF NOT EXISTS description TEXT;
ALTER TABLE settings ADD COLUMN IF NOT EXISTS created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP;
ALTER TABLE settings ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP;

-- 确保 key 列上有唯一约束（使用 DO 块处理）
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'settings_key_unique') THEN
        ALTER TABLE settings ADD CONSTRAINT settings_key_unique UNIQUE (key);
    END IF;
END $$;

-- ================================================
-- 创建触发器函数
-- ================================================
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- ================================================
-- 创建触发器
-- ================================================
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'update_users_updated_at') THEN
        CREATE TRIGGER update_users_updated_at
        BEFORE UPDATE ON users
        FOR EACH ROW EXECUTE FUNCTION update_updated_at();
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'update_groups_updated_at') THEN
        CREATE TRIGGER update_groups_updated_at
        BEFORE UPDATE ON groups
        FOR EACH ROW EXECUTE FUNCTION update_updated_at();
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'update_attendances_updated_at') THEN
        CREATE TRIGGER update_attendances_updated_at
        BEFORE UPDATE ON attendances
        FOR EACH ROW EXECUTE FUNCTION update_updated_at();
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'update_exams_updated_at') THEN
        CREATE TRIGGER update_exams_updated_at
        BEFORE UPDATE ON exams
        FOR EACH ROW EXECUTE FUNCTION update_updated_at();
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'update_votes_updated_at') THEN
        CREATE TRIGGER update_votes_updated_at
        BEFORE UPDATE ON votes
        FOR EACH ROW EXECUTE FUNCTION update_updated_at();
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'update_files_updated_at') THEN
        CREATE TRIGGER update_files_updated_at
        BEFORE UPDATE ON files
        FOR EACH ROW EXECUTE FUNCTION update_updated_at();
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'update_folders_updated_at') THEN
        CREATE TRIGGER update_folders_updated_at
        BEFORE UPDATE ON folders
        FOR EACH ROW EXECUTE FUNCTION update_updated_at();
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'update_settings_updated_at') THEN
        CREATE TRIGGER update_settings_updated_at
        BEFORE UPDATE ON settings
        FOR EACH ROW EXECUTE FUNCTION update_updated_at();
    END IF;
END $$;

-- ================================================
-- 创建视图
-- ================================================
CREATE OR REPLACE VIEW user_stats AS
SELECT
    u.id,
    u.username,
    u.email,
    u.role,
    COUNT(DISTINCT ar.id) AS total_attendances,
    COUNT(DISTINCT er.id) AS total_exams,
    COUNT(DISTINCT wr.id) AS total_wrong_questions,
    SUM(CASE WHEN ar.status = 'success' THEN 1 ELSE 0 END) AS successful_attendances
FROM users u
LEFT JOIN attendance_records ar ON u.id = ar.user_id
LEFT JOIN exam_records er ON u.id = er.user_id
LEFT JOIN wrong_questions wr ON u.id::text = wr.user_id::text
GROUP BY u.id, u.username, u.email, u.role;

CREATE OR REPLACE VIEW daily_attendance_stats AS
SELECT
    DATE(r.created_at) AS date,
    COUNT(r.id) AS total_records,
    SUM(CASE WHEN r.status = 'success' THEN 1 ELSE 0 END) AS success_count,
    SUM(CASE WHEN r.status = 'failed' THEN 1 ELSE 0 END) AS failed_count
FROM attendance_records r
GROUP BY DATE(r.created_at)
ORDER BY date DESC;

-- ================================================
-- 创建存储过程
-- ================================================
CREATE OR REPLACE FUNCTION get_user_wrong_questions(p_user_id bigint, p_subject_id TEXT DEFAULT NULL)
RETURNS TABLE (
    id TEXT,
    subject_name TEXT,
    type_name TEXT,
    content TEXT,
    wrong_count INTEGER,
    next_review_at TIMESTAMP
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        wq.id,
        s.name AS subject_name,
        qt.name AS type_name,
        wq.content,
        wq.wrong_count,
        wq.next_review_at
    FROM wrong_questions wq
    LEFT JOIN subjects s ON wq.subject_id = s.id
    LEFT JOIN question_types qt ON wq.type_id = qt.id
    WHERE wq.user_id = p_user_id
      AND (p_subject_id IS NULL OR wq.subject_id = p_subject_id)
    ORDER BY wq.next_review_at;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION calculate_next_review(p_wrong_count INTEGER)
RETURNS TIMESTAMP AS $$
DECLARE
    intervals INTEGER[] := ARRAY[1, 2, 4, 7, 14, 21, 30, 45, 60];
    idx INTEGER;
BEGIN
    idx := LEAST(p_wrong_count, array_length(intervals, 1));
    RETURN CURRENT_TIMESTAMP + (intervals[idx] || ' days')::INTERVAL;
END;
$$ LANGUAGE plpgsql;

-- ================================================
-- 初始化默认数据
-- ================================================
DO $$
BEGIN
    -- 创建默认功能组
    IF NOT EXISTS (SELECT 1 FROM feature_groups WHERE name = '班级管理组') THEN
        INSERT INTO feature_groups (id, name, description, permissions)
        VALUES (
            uuid_generate_v4(),
            '班级管理组',
            '负责班级日常管理',
            '{"dashboard": true, "attendance": true, "users": true, "settings": true}'::JSONB
        );
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM feature_groups WHERE name = '学习资料组') THEN
        INSERT INTO feature_groups (id, name, description, permissions)
        VALUES (
            uuid_generate_v4(),
            '学习资料组',
            '负责学习资料管理',
            '{"files": true, "wrong-questions": true, "exam": true}'::JSONB
        );
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM feature_groups WHERE name = '活动摄影组') THEN
        INSERT INTO feature_groups (id, name, description, permissions)
        VALUES (
            uuid_generate_v4(),
            '活动摄影组',
            '负责活动摄影',
            '{"dashboard": true, "vote": true}'::JSONB
        );
    END IF;
    
    -- 创建系统设置
    UPDATE settings SET value = '"班级管理系统"'::JSONB, description = '系统名称' WHERE key = 'system_name';
    IF NOT FOUND THEN
        INSERT INTO settings (key, value, description)
        VALUES ('system_name', '"班级管理系统"'::JSONB, '系统名称')
        ON CONFLICT DO NOTHING;
    END IF;
    
    UPDATE settings SET value = '"大学生班级综合管理平台"'::JSONB, description = '组织名称' WHERE key = 'organization_name';
    IF NOT FOUND THEN
        INSERT INTO settings (key, value, description)
        VALUES ('organization_name', '"大学生班级综合管理平台"'::JSONB, '组织名称')
        ON CONFLICT DO NOTHING;
    END IF;
END $$;

-- ================================================
-- 22. 聊天会话表
-- ================================================
CREATE TABLE IF NOT EXISTS chat_conversations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT,
    type TEXT DEFAULT 'private' CHECK (type IN ('private', 'group')),
    participants UUID[] NOT NULL,
    last_message TEXT,
    last_message_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    created_by bigint REFERENCES users(id),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    unread_count JSONB DEFAULT '{}'
);

CREATE INDEX IF NOT EXISTS idx_chat_conversations_created_by ON chat_conversations(created_by);
CREATE INDEX IF NOT EXISTS idx_chat_conversations_last_message_at ON chat_conversations(last_message_at);

-- ================================================
-- 23. 聊天消息表
-- ================================================
CREATE TABLE IF NOT EXISTS chat_messages (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    conversation_id UUID REFERENCES chat_conversations(id) ON DELETE CASCADE,
    sender_id bigint REFERENCES users(id),
    content TEXT NOT NULL,
    type TEXT DEFAULT 'text' CHECK (type IN ('text', 'image', 'file', 'system')),
    metadata JSONB,
    status TEXT DEFAULT 'sent' CHECK (status IN ('sending', 'sent', 'delivered', 'read', 'failed')),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    read_at TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_chat_messages_conversation_id ON chat_messages(conversation_id);
CREATE INDEX IF NOT EXISTS idx_chat_messages_sender_id ON chat_messages(sender_id);
CREATE INDEX IF NOT EXISTS idx_chat_messages_created_at ON chat_messages(created_at);

-- ================================================
-- 24. 子错题集表
-- ================================================
CREATE TABLE IF NOT EXISTS wrong_question_sets (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL,
    description TEXT,
    subject_id TEXT REFERENCES subjects(id) ON DELETE SET NULL,
    parent_id UUID REFERENCES wrong_question_sets(id) ON DELETE CASCADE,
    user_id bigint REFERENCES users(id),
    color TEXT DEFAULT '#3B82F6',
    icon TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 确保 user_id 列存在（处理已存在的旧表）
ALTER TABLE wrong_question_sets ADD COLUMN IF NOT EXISTS subject_id TEXT;
ALTER TABLE wrong_question_sets ADD COLUMN IF NOT EXISTS parent_id UUID;
ALTER TABLE wrong_question_sets ADD COLUMN IF NOT EXISTS user_id bigint;
ALTER TABLE wrong_question_sets ADD COLUMN IF NOT EXISTS color TEXT DEFAULT '#3B82F6';
ALTER TABLE wrong_question_sets ADD COLUMN IF NOT EXISTS icon TEXT;
ALTER TABLE wrong_question_sets ADD COLUMN IF NOT EXISTS created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP;
ALTER TABLE wrong_question_sets ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP;

CREATE INDEX IF NOT EXISTS idx_wrong_question_sets_user_id ON wrong_question_sets(user_id);
CREATE INDEX IF NOT EXISTS idx_wrong_question_sets_subject_id ON wrong_question_sets(subject_id);
CREATE INDEX IF NOT EXISTS idx_wrong_question_sets_parent_id ON wrong_question_sets(parent_id);

-- ================================================
-- 25. 登录历史表
-- ================================================
CREATE TABLE IF NOT EXISTS login_history (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id bigint REFERENCES users(id) ON DELETE CASCADE,
    ip_address TEXT,
    user_agent TEXT,
    device_type TEXT,
    browser TEXT,
    os TEXT,
    location TEXT,
    login_status TEXT DEFAULT 'success' CHECK (login_status IN ('success', 'failed')),
    failure_reason TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 确保 user_id 列存在（处理已存在的旧表）
ALTER TABLE login_history ADD COLUMN IF NOT EXISTS user_id bigint;
ALTER TABLE login_history ADD COLUMN IF NOT EXISTS ip_address TEXT;
ALTER TABLE login_history ADD COLUMN IF NOT EXISTS user_agent TEXT;
ALTER TABLE login_history ADD COLUMN IF NOT EXISTS device_type TEXT;
ALTER TABLE login_history ADD COLUMN IF NOT EXISTS browser TEXT;
ALTER TABLE login_history ADD COLUMN IF NOT EXISTS os TEXT;
ALTER TABLE login_history ADD COLUMN IF NOT EXISTS location TEXT;
ALTER TABLE login_history ADD COLUMN IF NOT EXISTS login_status TEXT DEFAULT 'success';
ALTER TABLE login_history ADD COLUMN IF NOT EXISTS failure_reason TEXT;
ALTER TABLE login_history ADD COLUMN IF NOT EXISTS created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP;

CREATE INDEX IF NOT EXISTS idx_login_history_user_id ON login_history(user_id);
CREATE INDEX IF NOT EXISTS idx_login_history_created_at ON login_history(created_at);

-- ================================================
-- 26. 操作日志表
-- ================================================
CREATE TABLE IF NOT EXISTS operation_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id bigint REFERENCES users(id) ON DELETE SET NULL,
    action TEXT NOT NULL,
    resource_type TEXT,
    resource_id TEXT,
    details JSONB,
    ip_address TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 确保 user_id 列存在（处理已存在的旧表）
ALTER TABLE operation_logs ADD COLUMN IF NOT EXISTS user_id bigint;
ALTER TABLE operation_logs ADD COLUMN IF NOT EXISTS action TEXT;
ALTER TABLE operation_logs ADD COLUMN IF NOT EXISTS resource_type TEXT;
ALTER TABLE operation_logs ADD COLUMN IF NOT EXISTS resource_id TEXT;
ALTER TABLE operation_logs ADD COLUMN IF NOT EXISTS details JSONB;
ALTER TABLE operation_logs ADD COLUMN IF NOT EXISTS ip_address TEXT;
ALTER TABLE operation_logs ADD COLUMN IF NOT EXISTS created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP;

CREATE INDEX IF NOT EXISTS idx_operation_logs_user_id ON operation_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_operation_logs_created_at ON operation_logs(created_at);
CREATE INDEX IF NOT EXISTS idx_operation_logs_action ON operation_logs(action);

-- ================================================
-- 27. 同步日志表
-- ================================================
CREATE TABLE IF NOT EXISTS sync_log (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    table_name TEXT NOT NULL,
    record_id TEXT,
    operation TEXT NOT NULL CHECK (operation IN ('INSERT', 'UPDATE', 'DELETE')),
    data JSONB,
    created_by bigint REFERENCES users(id),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_sync_log_table_name ON sync_log(table_name);
CREATE INDEX IF NOT EXISTS idx_sync_log_created_at ON sync_log(created_at);

-- ================================================
-- 28. 考试题目表
-- ================================================
CREATE TABLE IF NOT EXISTS questions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    subject_id TEXT REFERENCES subjects(id) ON DELETE SET NULL,
    type TEXT NOT NULL CHECK (type IN ('single', 'multiple', 'judgment', 'essay', 'fill')),
    content TEXT NOT NULL,
    options JSONB,
    answer TEXT NOT NULL,
    analysis TEXT,
    difficulty INTEGER DEFAULT 1 CHECK (difficulty BETWEEN 1 AND 5),
    score INTEGER DEFAULT 5,
    knowledge_ids TEXT[],
    tags TEXT[],
    source TEXT,
    created_by bigint REFERENCES users(id),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 确保 subject_id 列存在（处理已存在的旧表）
ALTER TABLE questions ADD COLUMN IF NOT EXISTS subject_id TEXT;
ALTER TABLE questions ADD COLUMN IF NOT EXISTS type TEXT DEFAULT 'single';
ALTER TABLE questions ADD COLUMN IF NOT EXISTS options JSONB;
ALTER TABLE questions ADD COLUMN IF NOT EXISTS analysis TEXT;
ALTER TABLE questions ADD COLUMN IF NOT EXISTS difficulty INTEGER DEFAULT 1;
ALTER TABLE questions ADD COLUMN IF NOT EXISTS score INTEGER DEFAULT 5;
ALTER TABLE questions ADD COLUMN IF NOT EXISTS knowledge_ids TEXT[];
ALTER TABLE questions ADD COLUMN IF NOT EXISTS tags TEXT[];
ALTER TABLE questions ADD COLUMN IF NOT EXISTS source TEXT;
ALTER TABLE questions ADD COLUMN IF NOT EXISTS created_by bigint;
ALTER TABLE questions ADD COLUMN IF NOT EXISTS created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP;
ALTER TABLE questions ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP;

CREATE INDEX IF NOT EXISTS idx_questions_subject_id ON questions(subject_id);
CREATE INDEX IF NOT EXISTS idx_questions_type ON questions(type);
CREATE INDEX IF NOT EXISTS idx_questions_created_by ON questions(created_by);

-- ================================================
-- 29. 题目收藏表
-- ================================================
CREATE TABLE IF NOT EXISTS question_favorites (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    question_id bigint REFERENCES questions(id) ON DELETE CASCADE,
    user_id bigint REFERENCES users(id) ON DELETE CASCADE,
    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(question_id, user_id)
);

-- 确保 user_id 列存在（处理已存在的旧表）
ALTER TABLE question_favorites ADD COLUMN IF NOT EXISTS question_id bigint;
ALTER TABLE question_favorites ADD COLUMN IF NOT EXISTS user_id bigint;
ALTER TABLE question_favorites ADD COLUMN IF NOT EXISTS notes TEXT;
ALTER TABLE question_favorites ADD COLUMN IF NOT EXISTS created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP;

CREATE INDEX IF NOT EXISTS idx_question_favorites_user_id ON question_favorites(user_id);

-- ================================================
-- 30. 学习计划表
-- ================================================
CREATE TABLE IF NOT EXISTS study_plans (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id bigint REFERENCES users(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    description TEXT,
    subject_id TEXT REFERENCES subjects(id) ON DELETE SET NULL,
    target_date DATE,
    target_count INTEGER DEFAULT 0,
    completed_count INTEGER DEFAULT 0,
    status TEXT DEFAULT 'active' CHECK (status IN ('active', 'completed', 'cancelled')),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 确保 user_id 列存在（处理已存在的旧表）
ALTER TABLE study_plans ADD COLUMN IF NOT EXISTS user_id bigint;
ALTER TABLE study_plans ADD COLUMN IF NOT EXISTS title TEXT;
ALTER TABLE study_plans ADD COLUMN IF NOT EXISTS description TEXT;
ALTER TABLE study_plans ADD COLUMN IF NOT EXISTS subject_id TEXT;
ALTER TABLE study_plans ADD COLUMN IF NOT EXISTS target_date DATE;
ALTER TABLE study_plans ADD COLUMN IF NOT EXISTS target_count INTEGER DEFAULT 0;
ALTER TABLE study_plans ADD COLUMN IF NOT EXISTS completed_count INTEGER DEFAULT 0;
ALTER TABLE study_plans ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'active';
ALTER TABLE study_plans ADD COLUMN IF NOT EXISTS created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP;
ALTER TABLE study_plans ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP;

CREATE INDEX IF NOT EXISTS idx_study_plans_user_id ON study_plans(user_id);
CREATE INDEX IF NOT EXISTS idx_study_plans_subject_id ON study_plans(subject_id);
CREATE INDEX IF NOT EXISTS idx_study_plans_target_date ON study_plans(target_date);

-- ================================================
-- 31. 学习记录表
-- ================================================
CREATE TABLE IF NOT EXISTS study_records (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id bigint REFERENCES users(id) ON DELETE CASCADE,
    subject_id TEXT REFERENCES subjects(id) ON DELETE SET NULL,
    type TEXT NOT NULL CHECK (type IN ('wrong_question', 'exam', 'vocabulary', 'note', 'other')),
    resource_id TEXT,
    duration INTEGER,
    score INTEGER,
    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 确保 user_id 列存在（处理已存在的旧表）
ALTER TABLE study_records ADD COLUMN IF NOT EXISTS user_id bigint;
ALTER TABLE study_records ADD COLUMN IF NOT EXISTS subject_id TEXT;
ALTER TABLE study_records ADD COLUMN IF NOT EXISTS type TEXT;
ALTER TABLE study_records ADD COLUMN IF NOT EXISTS resource_id TEXT;
ALTER TABLE study_records ADD COLUMN IF NOT EXISTS duration INTEGER;
ALTER TABLE study_records ADD COLUMN IF NOT EXISTS score INTEGER;
ALTER TABLE study_records ADD COLUMN IF NOT EXISTS notes TEXT;
ALTER TABLE study_records ADD COLUMN IF NOT EXISTS created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP;

CREATE INDEX IF NOT EXISTS idx_study_records_user_id ON study_records(user_id);
CREATE INDEX IF NOT EXISTS idx_study_records_subject_id ON study_records(subject_id);
CREATE INDEX IF NOT EXISTS idx_study_records_created_at ON study_records(created_at);

-- ================================================
-- 32. 成就表
-- ================================================
CREATE TABLE IF NOT EXISTS achievements (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL,
    description TEXT,
    icon TEXT,
    type TEXT NOT NULL CHECK (type IN ('attendance', 'exam', 'study', 'social', 'special')),
    condition JSONB,
    reward INTEGER DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ================================================
-- 33. 用户成就表
-- ================================================
CREATE TABLE IF NOT EXISTS user_achievements (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id bigint REFERENCES users(id) ON DELETE CASCADE,
    achievement_id UUID REFERENCES achievements(id) ON DELETE CASCADE,
    earned_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(user_id, achievement_id)
);

-- 确保 user_id 列存在（处理已存在的旧表）
ALTER TABLE user_achievements ADD COLUMN IF NOT EXISTS user_id bigint;
ALTER TABLE user_achievements ADD COLUMN IF NOT EXISTS achievement_id UUID;
ALTER TABLE user_achievements ADD COLUMN IF NOT EXISTS earned_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP;

CREATE INDEX IF NOT EXISTS idx_user_achievements_user_id ON user_achievements(user_id);

-- ================================================
-- 34. 勋章表
-- ================================================
CREATE TABLE IF NOT EXISTS badges (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL,
    description TEXT,
    icon TEXT,
    level TEXT DEFAULT 'bronze' CHECK (level IN ('bronze', 'silver', 'gold', 'platinum', 'diamond')),
    requirement JSONB,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ================================================
-- 35. 用户勋章表
-- ================================================
CREATE TABLE IF NOT EXISTS user_badges (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id bigint REFERENCES users(id) ON DELETE CASCADE,
    badge_id UUID REFERENCES badges(id) ON DELETE CASCADE,
    earned_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(user_id, badge_id)
);

-- 确保 user_id 列存在（处理已存在的旧表）
ALTER TABLE user_badges ADD COLUMN IF NOT EXISTS user_id bigint;
ALTER TABLE user_badges ADD COLUMN IF NOT EXISTS badge_id UUID;
ALTER TABLE user_badges ADD COLUMN IF NOT EXISTS earned_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP;

CREATE INDEX IF NOT EXISTS idx_user_badges_user_id ON user_badges(user_id);

-- ================================================
-- 创建触发器
-- ================================================
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'update_chat_conversations_updated_at') THEN
        CREATE TRIGGER update_chat_conversations_updated_at
        BEFORE UPDATE ON chat_conversations
        FOR EACH ROW EXECUTE FUNCTION update_updated_at();
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'update_wrong_question_sets_updated_at') THEN
        CREATE TRIGGER update_wrong_question_sets_updated_at
        BEFORE UPDATE ON wrong_question_sets
        FOR EACH ROW EXECUTE FUNCTION update_updated_at();
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'update_study_plans_updated_at') THEN
        CREATE TRIGGER update_study_plans_updated_at
        BEFORE UPDATE ON study_plans
        FOR EACH ROW EXECUTE FUNCTION update_updated_at();
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'update_questions_updated_at') THEN
        CREATE TRIGGER update_questions_updated_at
        BEFORE UPDATE ON questions
        FOR EACH ROW EXECUTE FUNCTION update_updated_at();
    END IF;
END $$;

-- ================================================
-- 创建聊天相关视图
-- ================================================
CREATE OR REPLACE VIEW conversation_with_last_message AS
SELECT 
    c.*,
    u.name AS creator_name,
    (SELECT COUNT(*) FROM chat_messages cm WHERE cm.conversation_id = c.id AND cm.read_at IS NULL AND cm.sender_id != c.created_by) AS total_unread_count
FROM chat_conversations c
LEFT JOIN users u ON c.created_by = u.id;

CREATE OR REPLACE VIEW user_conversation_summary AS
SELECT 
    u.id AS user_id,
    u.username,
    u.name,
    u.avatar_url,
    COUNT(DISTINCT cc.id) AS total_conversations,
    (SELECT COUNT(*) FROM chat_messages cm 
     JOIN chat_conversations cc ON cm.conversation_id = cc.id 
     WHERE u.id::text = ANY(ARRAY(SELECT unnest(cc.participants)::text)) AND cm.read_at IS NULL AND cm.sender_id != u.id) AS total_unread
FROM users u
LEFT JOIN chat_conversations cc ON u.id::text = ANY(ARRAY(SELECT unnest(cc.participants)::text))
GROUP BY u.id, u.username, u.name, u.avatar_url;

-- ================================================
-- 创建错题复习视图
-- ================================================
CREATE OR REPLACE VIEW wrong_question_review_summary AS
SELECT 
    wq.id,
    wq.content,
    wq.wrong_count,
    wq.next_review_at,
    wq.mastered,
    s.name AS subject_name,
    qt.name AS question_type,
    kp.name AS knowledge_point,
    u.username,
    CASE 
        WHEN wq.next_review_at IS NULL THEN 'pending'
        WHEN wq.next_review_at <= NOW() THEN 'due'
        ELSE 'scheduled'
    END AS review_status
FROM wrong_questions wq
LEFT JOIN subjects s ON wq.subject_id = s.id
LEFT JOIN question_types qt ON wq.type_id = qt.id
LEFT JOIN knowledge_points kp ON wq.knowledge_id = kp.id
LEFT JOIN users u ON wq.user_id::text = u.id::text
WHERE wq.mastered = FALSE
ORDER BY wq.next_review_at NULLS FIRST;

-- ================================================
-- 创建学习统计视图
-- ================================================
CREATE OR REPLACE VIEW user_learning_stats AS
SELECT 
    u.id AS user_id,
    u.username,
    u.name,
    COUNT(DISTINCT wq.id) AS total_wrong_questions,
    COUNT(DISTINCT CASE WHEN wq.mastered = TRUE THEN wq.id END) AS mastered_questions,
    COUNT(DISTINCT er.id) AS total_exams,
    COUNT(DISTINCT sr.id) AS total_study_records,
    COALESCE(SUM(sr.duration), 0) AS total_study_time,
    COUNT(DISTINCT ua.id) AS total_achievements
FROM users u
LEFT JOIN wrong_questions wq ON u.id::text = wq.user_id::text
LEFT JOIN exam_records er ON u.id::text = er.user_id::text
LEFT JOIN study_records sr ON u.id::text = sr.user_id::text
LEFT JOIN user_achievements ua ON u.id::text = ua.user_id::text
GROUP BY u.id, u.username, u.name;

-- ================================================
-- 结束
-- ================================================
SELECT '数据库初始化完成' AS message;