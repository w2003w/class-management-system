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
DROP TABLE IF EXISTS users CASCADE;
DROP TABLE IF EXISTS groups CASCADE;

DROP VIEW IF EXISTS user_stats CASCADE;

CREATE TABLE groups (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT UNIQUE NOT NULL,
    description TEXT,
    permissions JSONB DEFAULT '{}'::jsonb,
    created_by UUID REFERENCES users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE users (
    id BIGINT PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
    username TEXT UNIQUE NOT NULL,
    password TEXT NOT NULL,
    name TEXT NOT NULL,
    role TEXT DEFAULT 'user',
    department TEXT,
    class_name TEXT,
    email TEXT,
    phone TEXT,
    avatar TEXT,
    status TEXT DEFAULT 'active',
    group_id UUID REFERENCES groups(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE attendances (
    id BIGINT PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
    name TEXT NOT NULL,
    description TEXT,
    start_time TIMESTAMP WITH TIME ZONE NOT NULL,
    end_time TIMESTAMP WITH TIME ZONE NOT NULL,
    location TEXT,
    status TEXT DEFAULT 'active',
    created_by TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE attendance_records (
    id BIGINT PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
    attendance_id BIGINT REFERENCES attendances(id),
    user_id BIGINT REFERENCES users(id),
    status TEXT DEFAULT 'checked_in',
    checkin_time TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    location TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE subjects (
    id TEXT PRIMARY KEY,
    name TEXT UNIQUE NOT NULL,
    color TEXT DEFAULT '#3B82F6',
    icon TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE question_types (
    id BIGINT PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
    name TEXT UNIQUE NOT NULL,
    description TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE knowledge_points (
    id BIGINT PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
    name TEXT NOT NULL,
    subject_id TEXT REFERENCES subjects(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE questions (
    id BIGINT PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
    type TEXT NOT NULL,
    content TEXT NOT NULL,
    options JSONB,
    answer TEXT NOT NULL,
    analysis TEXT,
    difficulty TEXT DEFAULT 'medium',
    subject_id TEXT REFERENCES subjects(id),
    knowledge_point_id BIGINT,
    created_by TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE exams (
    id BIGINT PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
    name TEXT NOT NULL,
    description TEXT,
    start_time TIMESTAMP WITH TIME ZONE NOT NULL,
    end_time TIMESTAMP WITH TIME ZONE NOT NULL,
    duration INTEGER DEFAULT 60,
    questions JSONB,
    total_score INTEGER DEFAULT 100,
    status TEXT DEFAULT 'pending',
    created_by TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE exam_records (
    id BIGINT PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
    exam_id BIGINT REFERENCES exams(id),
    user_id BIGINT REFERENCES users(id),
    answers JSONB,
    score INTEGER DEFAULT 0,
    status TEXT DEFAULT 'in_progress',
    submitted_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE votes (
    id BIGINT PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
    title TEXT NOT NULL,
    description TEXT,
    options JSONB,
    multi_select BOOLEAN DEFAULT FALSE,
    allow_anonymous BOOLEAN DEFAULT TRUE,
    start_time TIMESTAMP WITH TIME ZONE,
    end_time TIMESTAMP WITH TIME ZONE,
    votes JSONB DEFAULT '{}'::jsonb,
    status TEXT DEFAULT 'active',
    created_by TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE vote_records (
    id BIGINT PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
    vote_id BIGINT REFERENCES votes(id),
    user_id BIGINT REFERENCES users(id),
    choices JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE lotteries (
    id BIGINT PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
    title TEXT NOT NULL,
    description TEXT,
    options JSONB,
    allow_multiple BOOLEAN DEFAULT FALSE,
    max_winners INTEGER DEFAULT 1,
    winners JSONB DEFAULT '[]'::jsonb,
    status TEXT DEFAULT 'active',
    created_by TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE lottery_records (
    id BIGINT PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
    lottery_id BIGINT REFERENCES lotteries(id),
    user_id BIGINT REFERENCES users(id),
    is_winner BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE notifications (
    id BIGINT PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
    title TEXT NOT NULL,
    content TEXT,
    type TEXT DEFAULT 'info',
    user_id BIGINT REFERENCES users(id),
    is_read BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE password_reset_requests (
    id BIGINT PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
    email TEXT NOT NULL,
    token TEXT UNIQUE NOT NULL,
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE wrong_questions (
    id BIGINT PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
    user_id BIGINT REFERENCES users(id),
    question_id BIGINT REFERENCES questions(id),
    wrong_count INTEGER DEFAULT 1,
    last_wrong_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE vocabulary (
    id BIGINT PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
    word TEXT NOT NULL,
    phonetic TEXT,
    meaning TEXT NOT NULL,
    example TEXT,
    user_id BIGINT REFERENCES users(id),
    mastered BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE file_records (
    id BIGINT PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
    filename TEXT NOT NULL,
    filepath TEXT NOT NULL,
    file_size INTEGER,
    file_type TEXT,
    user_id BIGINT REFERENCES users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE questionnaires (
    id BIGINT PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
    title TEXT NOT NULL,
    description TEXT,
    questions JSONB,
    start_time TIMESTAMP WITH TIME ZONE,
    end_time TIMESTAMP WITH TIME ZONE,
    status TEXT DEFAULT 'active',
    created_by TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE questionnaire_records (
    id BIGINT PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
    questionnaire_id BIGINT REFERENCES questionnaires(id),
    user_id BIGINT REFERENCES users(id),
    answers JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE permission_settings (
    id BIGINT PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
    role TEXT UNIQUE NOT NULL,
    permissions JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE wrong_question_sets (
    id BIGINT PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
    name TEXT NOT NULL,
    user_id BIGINT REFERENCES users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE wrong_question_set_items (
    id BIGINT PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
    set_id BIGINT REFERENCES wrong_question_sets(id),
    question_id BIGINT REFERENCES questions(id),
    added_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE settings (
    id BIGINT PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
    key TEXT UNIQUE NOT NULL,
    value JSONB,
    description TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_users_username ON users(username);
CREATE INDEX idx_users_role ON users(role);
CREATE INDEX idx_users_group ON users(group_id);
CREATE INDEX idx_users_status ON users(status);

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
CREATE INDEX idx_notifications_is_read ON notifications(is_read);

CREATE INDEX idx_password_reset_token ON password_reset_requests(token);
CREATE INDEX idx_password_reset_email ON password_reset_requests(email);

CREATE INDEX idx_wrong_questions_user ON wrong_questions(user_id);
CREATE INDEX idx_wrong_questions_question ON wrong_questions(question_id);

CREATE INDEX idx_vocabulary_user ON vocabulary(user_id);
CREATE INDEX idx_vocabulary_word ON vocabulary(word);

ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE groups ENABLE ROW LEVEL SECURITY;
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
ALTER TABLE password_reset_requests ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow anonymous read access to users" ON users
    FOR SELECT USING (true);

CREATE POLICY "Allow anonymous insert to users" ON users
    FOR INSERT WITH CHECK (true);

CREATE POLICY "Allow anonymous update to users" ON users
    FOR UPDATE USING (true);

CREATE POLICY "Allow anonymous delete to users" ON users
    FOR DELETE USING (true);

CREATE POLICY "Allow anonymous read access to groups" ON groups
    FOR SELECT USING (true);

CREATE POLICY "Allow anonymous insert to groups" ON groups
    FOR INSERT WITH CHECK (true);

CREATE POLICY "Allow anonymous update to groups" ON groups
    FOR UPDATE USING (true);

CREATE POLICY "Allow anonymous delete to groups" ON groups
    FOR DELETE USING (true);

CREATE POLICY "Allow anonymous read access to attendances" ON attendances
    FOR SELECT USING (true);

CREATE POLICY "Allow anonymous insert to attendances" ON attendances
    FOR INSERT WITH CHECK (true);

CREATE POLICY "Allow anonymous update to attendances" ON attendances
    FOR UPDATE USING (true);

CREATE POLICY "Allow anonymous delete to attendances" ON attendances
    FOR DELETE USING (true);

CREATE POLICY "Allow anonymous read access to attendance_records" ON attendance_records
    FOR SELECT USING (true);

CREATE POLICY "Allow anonymous insert to attendance_records" ON attendance_records
    FOR INSERT WITH CHECK (true);

CREATE POLICY "Allow anonymous read access to questions" ON questions
    FOR SELECT USING (true);

CREATE POLICY "Allow anonymous insert to questions" ON questions
    FOR INSERT WITH CHECK (true);

CREATE POLICY "Allow anonymous update to questions" ON questions
    FOR UPDATE USING (true);

CREATE POLICY "Allow anonymous delete to questions" ON questions
    FOR DELETE USING (true);

CREATE POLICY "Allow anonymous read access to exams" ON exams
    FOR SELECT USING (true);

CREATE POLICY "Allow anonymous insert to exams" ON exams
    FOR INSERT WITH CHECK (true);

CREATE POLICY "Allow anonymous update to exams" ON exams
    FOR UPDATE USING (true);

CREATE POLICY "Allow anonymous delete to exams" ON exams
    FOR DELETE USING (true);

CREATE POLICY "Allow anonymous read access to exam_records" ON exam_records
    FOR SELECT USING (true);

CREATE POLICY "Allow anonymous insert to exam_records" ON exam_records
    FOR INSERT WITH CHECK (true);

CREATE POLICY "Allow anonymous read access to votes" ON votes
    FOR SELECT USING (true);

CREATE POLICY "Allow anonymous insert to votes" ON votes
    FOR INSERT WITH CHECK (true);

CREATE POLICY "Allow anonymous update to votes" ON votes
    FOR UPDATE USING (true);

CREATE POLICY "Allow anonymous delete to votes" ON votes
    FOR DELETE USING (true);

CREATE POLICY "Allow anonymous read access to vote_records" ON vote_records
    FOR SELECT USING (true);

CREATE POLICY "Allow anonymous insert to vote_records" ON vote_records
    FOR INSERT WITH CHECK (true);

CREATE POLICY "Allow anonymous read access to lotteries" ON lotteries
    FOR SELECT USING (true);

CREATE POLICY "Allow anonymous insert to lotteries" ON lotteries
    FOR INSERT WITH CHECK (true);

CREATE POLICY "Allow anonymous update to lotteries" ON lotteries
    FOR UPDATE USING (true);

CREATE POLICY "Allow anonymous delete to lotteries" ON lotteries
    FOR DELETE USING (true);

CREATE POLICY "Allow anonymous read access to lottery_records" ON lottery_records
    FOR SELECT USING (true);

CREATE POLICY "Allow anonymous insert to lottery_records" ON lottery_records
    FOR INSERT WITH CHECK (true);

CREATE POLICY "Allow anonymous read access to notifications" ON notifications
    FOR SELECT USING (true);

CREATE POLICY "Allow anonymous insert to notifications" ON notifications
    FOR INSERT WITH CHECK (true);

CREATE POLICY "Allow anonymous read access to password_reset_requests" ON password_reset_requests
    FOR SELECT USING (true);

CREATE POLICY "Allow anonymous insert to password_reset_requests" ON password_reset_requests
    FOR INSERT WITH CHECK (true);

INSERT INTO groups (id, name, description) VALUES 
('00000000-0000-0000-0000-000000000001', '2024级1班', '计算机科学与技术专业2024级1班'),
('00000000-0000-0000-0000-000000000002', '2024级2班', '计算机科学与技术专业2024级2班'),
('00000000-0000-0000-0000-000000000003', '2025级1班', '软件工程专业2025级1班'),
('00000000-0000-0000-0000-000000000004', '教师组', '全体教师成员')
ON CONFLICT (id) DO NOTHING;

INSERT INTO users (username, password, name, role, status, created_at) 
VALUES ('admin', 'admin123', '系统管理员', 'admin', 'active', NOW());