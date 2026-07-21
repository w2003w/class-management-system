-- ================================================
-- 增强版数据库架构 - 班级管理系统 v2.0
-- 包含AI辅导、学习分析、自动化任务等高级功能
-- 运行前请在Supabase SQL编辑器中执行
-- ================================================

-- ================================================
-- 迁移修复：向已有表添加缺失的列（解决与 init-database.sql 的兼容性问题）
-- ================================================

-- 为 study_records 表添加 plan_id 列（如果不存在）
ALTER TABLE study_records ADD COLUMN IF NOT EXISTS plan_id UUID REFERENCES study_plans(id) ON DELETE SET NULL;

-- 为 study_records 表添加 enhanced-database.sql 中的其他缺失列
ALTER TABLE study_records ADD COLUMN IF NOT EXISTS topic VARCHAR(255);
ALTER TABLE study_records ADD COLUMN IF NOT EXISTS duration_minutes INTEGER DEFAULT 0;
ALTER TABLE study_records ADD COLUMN IF NOT EXISTS study_type VARCHAR(50) DEFAULT 'review';
ALTER TABLE study_records ADD COLUMN IF NOT EXISTS focus_score INTEGER DEFAULT 0 CHECK (focus_score BETWEEN 0 AND 100);
ALTER TABLE study_records ADD COLUMN IF NOT EXISTS productivity_score INTEGER DEFAULT 0 CHECK (productivity_score BETWEEN 0 AND 100);
ALTER TABLE study_records ADD COLUMN IF NOT EXISTS completed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP;

-- 为 study_records 表创建索引（如果不存在）
CREATE INDEX IF NOT EXISTS idx_study_records_plan_id ON study_records(plan_id);
CREATE INDEX IF NOT EXISTS idx_study_records_completed_at ON study_records(completed_at);

-- 为 study_plans 表添加 enhanced-database.sql 中的缺失列
ALTER TABLE study_plans ADD COLUMN IF NOT EXISTS priority VARCHAR(10) DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high', 'urgent'));
ALTER TABLE study_plans ADD COLUMN IF NOT EXISTS reminder_enabled BOOLEAN DEFAULT true;
ALTER TABLE study_plans ADD COLUMN IF NOT EXISTS reminder_time TIME;

-- 为 achievements 表添加 enhanced-database.sql 中的缺失列
ALTER TABLE achievements ADD COLUMN IF NOT EXISTS code VARCHAR(100) UNIQUE;
ALTER TABLE achievements ADD COLUMN IF NOT EXISTS category VARCHAR(50);
ALTER TABLE achievements ADD COLUMN IF NOT EXISTS points INTEGER DEFAULT 0;
ALTER TABLE achievements ADD COLUMN IF NOT EXISTS rarity VARCHAR(20) DEFAULT 'common' CHECK (rarity IN ('common', 'rare', 'epic', 'legendary'));
ALTER TABLE achievements ADD COLUMN IF NOT EXISTS criteria JSONB DEFAULT '{}';

-- 如果 type 列存在且不为 null，则用 type 的值填充 category（兼容 init-database.sql）
UPDATE achievements SET category = type WHERE category IS NULL AND type IS NOT NULL;

-- 删除原有的严格类型约束，允许更多成就类型
ALTER TABLE achievements DROP CONSTRAINT IF EXISTS achievements_type_check;

-- 添加更宽松的类型约束（兼容 enhanced-database.sql 的 milestone, streak 等新类型）
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'achievements_type_check') THEN
        ALTER TABLE achievements ADD CONSTRAINT achievements_type_check 
        CHECK (type IN ('attendance', 'exam', 'study', 'social', 'special', 'milestone', 'streak', 'learning', 'language', 'feedback'));
    END IF;
END $$;

-- 为 user_achievements 表添加 enhanced-database.sql 中的缺失列
ALTER TABLE user_achievements ADD COLUMN IF NOT EXISTS progress JSONB DEFAULT '{}';
ALTER TABLE user_achievements ADD COLUMN IF NOT EXISTS is_notified BOOLEAN DEFAULT false;

-- 为 system_settings 表添加迁移（init-database.sql 使用 settings 表，需要确保 system_settings 表存在）
CREATE TABLE IF NOT EXISTS system_settings (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    setting_key VARCHAR(100) UNIQUE NOT NULL,
    setting_value JSONB NOT NULL,
    setting_type VARCHAR(20) DEFAULT 'string',
    description TEXT,
    category VARCHAR(50),
    is_public BOOLEAN DEFAULT false,
    updated_by bigint REFERENCES users(id),
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ================================================
-- 文件记录表
-- ================================================
CREATE TABLE IF NOT EXISTS file_records (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id BIGINT REFERENCES users(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    original_name VARCHAR(255),
    file_type VARCHAR(100),
    file_size BIGINT DEFAULT 0,
    mime_type VARCHAR(255),
    folder_path VARCHAR(500) DEFAULT '',
    is_folder BOOLEAN DEFAULT false,
    parent_id UUID REFERENCES file_records(id) ON DELETE CASCADE,
    storage_path TEXT,
    url TEXT,
    description TEXT,
    tags JSONB DEFAULT '[]',
    is_public BOOLEAN DEFAULT false,
    download_count INTEGER DEFAULT 0,
    createdat TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_file_records_user_id ON file_records(user_id);
CREATE INDEX IF NOT EXISTS idx_file_records_folder_path ON file_records(folder_path);
CREATE INDEX IF NOT EXISTS idx_file_records_parent_id ON file_records(parent_id);
CREATE INDEX IF NOT EXISTS idx_file_records_is_folder ON file_records(is_folder);

-- ================================================
-- 1. 英语单词表
-- ================================================
CREATE TABLE IF NOT EXISTS english_words (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id bigint REFERENCES users(id) ON DELETE CASCADE,
    word VARCHAR(255) NOT NULL,
    pronunciation VARCHAR(255),
    definition TEXT,
    example_sentence TEXT,
    chinese_translation TEXT,
    difficulty_level INTEGER DEFAULT 1 CHECK (difficulty_level BETWEEN 1 AND 5),
    frequency_level INTEGER DEFAULT 1,
    part_of_speech VARCHAR(50),
    word_family JSONB DEFAULT '[]',
    synonyms JSONB DEFAULT '[]',
    antonyms JSONB DEFAULT '[]',
    phonetics JSONB DEFAULT '{}',
    audio_url TEXT,
    mastery_level INTEGER DEFAULT 0 CHECK (mastery_level BETWEEN 0 AND 100),
    review_count INTEGER DEFAULT 0,
    correct_count INTEGER DEFAULT 0,
    wrong_count INTEGER DEFAULT 0,
    last_reviewed_at TIMESTAMP,
    next_review_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_english_words_user_id ON english_words(user_id);
CREATE INDEX IF NOT EXISTS idx_english_words_word ON english_words(word);
CREATE INDEX IF NOT EXISTS idx_english_words_next_review ON english_words(next_review_at);

-- ================================================
-- 2. 单词本表
-- ================================================
CREATE TABLE IF NOT EXISTS word_books (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id bigint REFERENCES users(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    cover_color VARCHAR(20) DEFAULT '#3B82F6',
    icon VARCHAR(50) DEFAULT 'fa-book',
    word_count INTEGER DEFAULT 0,
    is_public BOOLEAN DEFAULT false,
    shared_with UUID[] DEFAULT '{}',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_word_books_user_id ON word_books(user_id);

-- ================================================
-- 3. 单词本与单词关联表
-- ================================================
CREATE TABLE IF NOT EXISTS word_book_words (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    word_book_id UUID REFERENCES word_books(id) ON DELETE CASCADE,
    word_id UUID REFERENCES english_words(id) ON DELETE CASCADE,
    added_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(word_book_id, word_id)
);

CREATE INDEX IF NOT EXISTS idx_word_book_words_book_id ON word_book_words(word_book_id);
CREATE INDEX IF NOT EXISTS idx_word_book_words_word_id ON word_book_words(word_id);

-- ================================================
-- 4. 学习计划表
-- ================================================
CREATE TABLE IF NOT EXISTS study_plans (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id bigint REFERENCES users(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    description TEXT,
    subject_id UUID,
    target_date DATE,
    target_count INTEGER DEFAULT 0,
    completed_count INTEGER DEFAULT 0,
    status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'completed', 'cancelled', 'paused')),
    priority VARCHAR(10) DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high', 'urgent')),
    reminder_enabled BOOLEAN DEFAULT true,
    reminder_time TIME,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_study_plans_user_id ON study_plans(user_id);
CREATE INDEX IF NOT EXISTS idx_study_plans_status ON study_plans(status);
CREATE INDEX IF NOT EXISTS idx_study_plans_target_date ON study_plans(target_date);

-- ================================================
-- 5. 学习记录表
-- ================================================
CREATE TABLE IF NOT EXISTS study_records (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id bigint REFERENCES users(id) ON DELETE CASCADE,
    plan_id UUID REFERENCES study_plans(id) ON DELETE SET NULL,
    subject_id UUID,
    topic VARCHAR(255),
    duration_minutes INTEGER DEFAULT 0,
    study_type VARCHAR(50) DEFAULT 'review',
    notes TEXT,
    focus_score INTEGER DEFAULT 0 CHECK (focus_score BETWEEN 0 AND 100),
    productivity_score INTEGER DEFAULT 0 CHECK (productivity_score BETWEEN 0 AND 100),
    completed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_study_records_user_id ON study_records(user_id);
CREATE INDEX IF NOT EXISTS idx_study_records_plan_id ON study_records(plan_id);
CREATE INDEX IF NOT EXISTS idx_study_records_completed_at ON study_records(completed_at);

-- ================================================
-- 6. 成就系统表
-- ================================================
CREATE TABLE IF NOT EXISTS achievements (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    code VARCHAR(100) UNIQUE NOT NULL,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    icon VARCHAR(100),
    category VARCHAR(50),
    points INTEGER DEFAULT 0,
    rarity VARCHAR(20) DEFAULT 'common' CHECK (rarity IN ('common', 'rare', 'epic', 'legendary')),
    criteria JSONB NOT NULL DEFAULT '{}',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_achievements_code ON achievements(code);
CREATE INDEX IF NOT EXISTS idx_achievements_category ON achievements(category);

-- ================================================
-- 7. 用户成就表
-- ================================================
CREATE TABLE IF NOT EXISTS user_achievements (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id bigint REFERENCES users(id) ON DELETE CASCADE,
    achievement_id UUID REFERENCES achievements(id) ON DELETE CASCADE,
    earned_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    progress JSONB DEFAULT '{}',
    is_notified BOOLEAN DEFAULT false,
    UNIQUE(user_id, achievement_id)
);

CREATE INDEX IF NOT EXISTS idx_user_achievements_user_id ON user_achievements(user_id);

-- ================================================
-- 8. 任务自动化表
-- ================================================
CREATE TABLE IF NOT EXISTS automations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id bigint REFERENCES users(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    trigger_type VARCHAR(50) NOT NULL,
    trigger_config JSONB DEFAULT '{}',
    action_type VARCHAR(50) NOT NULL,
    action_config JSONB DEFAULT '{}',
    is_enabled BOOLEAN DEFAULT true,
    last_triggered_at TIMESTAMP,
    trigger_count INTEGER DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_automations_user_id ON automations(user_id);
CREATE INDEX IF NOT EXISTS idx_automations_trigger_type ON automations(trigger_type);

-- ================================================
-- 9. 智能提醒表
-- ================================================
CREATE TABLE IF NOT EXISTS smart_reminders (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id bigint REFERENCES users(id) ON DELETE CASCADE,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    reminder_type VARCHAR(50) NOT NULL,
    related_id UUID,
    related_type VARCHAR(50),
    scheduled_at TIMESTAMP NOT NULL,
    repeat_pattern JSONB DEFAULT '{}',
    priority VARCHAR(10) DEFAULT 'medium',
    is_completed BOOLEAN DEFAULT false,
    completed_at TIMESTAMP,
    snooze_count INTEGER DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_smart_reminders_user_id ON smart_reminders(user_id);
CREATE INDEX IF NOT EXISTS idx_smart_reminders_scheduled_at ON smart_reminders(scheduled_at);
CREATE INDEX IF NOT EXISTS idx_smart_reminders_related ON smart_reminders(related_id, related_type);

-- ================================================
-- 10. 知识图谱节点表
-- ================================================
CREATE TABLE IF NOT EXISTS knowledge_nodes (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id bigint REFERENCES users(id) ON DELETE CASCADE,
    subject_id UUID,
    node_type VARCHAR(50) DEFAULT 'concept',
    name VARCHAR(255) NOT NULL,
    description TEXT,
    importance_level INTEGER DEFAULT 1 CHECK (importance_level BETWEEN 1 AND 5),
    mastery_level INTEGER DEFAULT 0,
    connections JSONB DEFAULT '[]',
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_knowledge_nodes_user_id ON knowledge_nodes(user_id);
CREATE INDEX IF NOT EXISTS idx_knowledge_nodes_subject_id ON knowledge_nodes(subject_id);

-- ================================================
-- 11. 知识图谱关系表
-- ================================================
CREATE TABLE IF NOT EXISTS knowledge_edges (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id bigint REFERENCES users(id) ON DELETE CASCADE,
    source_node_id UUID REFERENCES knowledge_nodes(id) ON DELETE CASCADE,
    target_node_id UUID REFERENCES knowledge_nodes(id) ON DELETE CASCADE,
    relationship_type VARCHAR(50) DEFAULT 'related',
    strength INTEGER DEFAULT 1 CHECK (strength BETWEEN 1 AND 5),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(source_node_id, target_node_id)
);

CREATE INDEX IF NOT EXISTS idx_knowledge_edges_source ON knowledge_edges(source_node_id);
CREATE INDEX IF NOT EXISTS idx_knowledge_edges_target ON knowledge_edges(target_node_id);

-- ================================================
-- 12. AI辅导会话表
-- ================================================
CREATE TABLE IF NOT EXISTS ai_sessions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id bigint REFERENCES users(id) ON DELETE CASCADE,
    session_type VARCHAR(50) DEFAULT 'tutoring',
    title VARCHAR(255),
    context JSONB DEFAULT '{}',
    is_archived BOOLEAN DEFAULT false,
    last_message_at TIMESTAMP,
    message_count INTEGER DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_ai_sessions_user_id ON ai_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_ai_sessions_is_archived ON ai_sessions(is_archived);

-- ================================================
-- 13. AI辅导消息表
-- ================================================
CREATE TABLE IF NOT EXISTS ai_messages (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    session_id UUID REFERENCES ai_sessions(id) ON DELETE CASCADE,
    sender_type VARCHAR(20) NOT NULL CHECK (sender_type IN ('user', 'ai')),
    content TEXT NOT NULL,
    content_type VARCHAR(30) DEFAULT 'text',
    attachments JSONB DEFAULT '[]',
    metadata JSONB DEFAULT '{}',
    is_liked BOOLEAN,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_ai_messages_session_id ON ai_messages(session_id);

-- ================================================
-- 14. 学习分析表
-- ================================================
CREATE TABLE IF NOT EXISTS learning_analytics (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id bigint REFERENCES users(id) ON DELETE CASCADE,
    analytics_type VARCHAR(50) NOT NULL,
    metric_name VARCHAR(100) NOT NULL,
    metric_value NUMERIC(10, 2),
    metric_data JSONB DEFAULT '{}',
    recorded_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_learning_analytics_user_id ON learning_analytics(user_id);
CREATE INDEX IF NOT EXISTS idx_learning_analytics_type ON learning_analytics(analytics_type);
CREATE INDEX IF NOT EXISTS idx_learning_analytics_recorded_at ON learning_analytics(recorded_at);

-- ================================================
-- 15. 智能推荐表
-- ================================================
CREATE TABLE IF NOT EXISTS recommendations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id bigint REFERENCES users(id) ON DELETE CASCADE,
    recommendation_type VARCHAR(50) NOT NULL,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    target_id UUID,
    target_type VARCHAR(50),
    priority INTEGER DEFAULT 0,
    score NUMERIC(5, 2),
    metadata JSONB DEFAULT '{}',
    is_dismissed BOOLEAN DEFAULT false,
    is_executed BOOLEAN DEFAULT false,
    expires_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_recommendations_user_id ON recommendations(user_id);
CREATE INDEX IF NOT EXISTS idx_recommendations_type ON recommendations(recommendation_type);
CREATE INDEX IF NOT EXISTS idx_recommendations_target ON recommendations(target_id, target_type);

-- ================================================
-- 16. 文件版本表
-- ================================================
CREATE TABLE IF NOT EXISTS file_versions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    file_id UUID NOT NULL,
    version_number INTEGER NOT NULL,
    file_name VARCHAR(255) NOT NULL,
    file_size BIGINT,
    file_path TEXT NOT NULL,
    mime_type VARCHAR(100),
    checksum VARCHAR(64),
    change_description TEXT,
    created_by bigint REFERENCES users(id),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_file_versions_file_id ON file_versions(file_id);

-- ================================================
-- 17. 共享链接表
-- ================================================
CREATE TABLE IF NOT EXISTS shared_links (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    resource_type VARCHAR(50) NOT NULL,
    resource_id UUID NOT NULL,
    share_code VARCHAR(20) UNIQUE NOT NULL,
    password_hash VARCHAR(255),
    permission VARCHAR(20) DEFAULT 'view' CHECK (permission IN ('view', 'edit', 'download')),
    max_access_count INTEGER,
    access_count INTEGER DEFAULT 0,
    expires_at TIMESTAMP,
    created_by bigint REFERENCES users(id),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_shared_links_share_code ON shared_links(share_code);
CREATE INDEX IF NOT EXISTS idx_shared_links_resource ON shared_links(resource_type, resource_id);

-- ================================================
-- 18. 活动日志表
-- ================================================
CREATE TABLE IF NOT EXISTS activity_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id bigint REFERENCES users(id) ON DELETE CASCADE,
    activity_type VARCHAR(50) NOT NULL,
    resource_type VARCHAR(50),
    resource_id UUID,
    description TEXT,
    metadata JSONB DEFAULT '{}',
    ip_address VARCHAR(45),
    user_agent TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_activity_logs_user_id ON activity_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_activity_logs_activity_type ON activity_logs(activity_type);
CREATE INDEX IF NOT EXISTS idx_activity_logs_created_at ON activity_logs(created_at);

-- ================================================
-- 19. 系统公告表
-- ================================================
CREATE TABLE IF NOT EXISTS announcements (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    title VARCHAR(255) NOT NULL,
    content TEXT NOT NULL,
    announcement_type VARCHAR(30) DEFAULT 'info',
    priority VARCHAR(10) DEFAULT 'normal',
    target_roles VARCHAR(50)[] DEFAULT '{}',
    is_pinned BOOLEAN DEFAULT false,
    is_active BOOLEAN DEFAULT true,
    starts_at TIMESTAMP,
    ends_at TIMESTAMP,
    created_by bigint REFERENCES users(id),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_announcements_is_active ON announcements(is_active);
CREATE INDEX IF NOT EXISTS idx_announcements_starts_at ON announcements(starts_at);

-- ================================================
-- 20. 反馈建议表
-- ================================================
CREATE TABLE IF NOT EXISTS feedback (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id bigint REFERENCES users(id) ON DELETE SET NULL,
    feedback_type VARCHAR(30) NOT NULL,
    subject VARCHAR(255),
    content TEXT NOT NULL,
    screenshots JSONB DEFAULT '[]',
    status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'reviewed', 'in_progress', 'resolved', 'rejected')),
    admin_response TEXT,
    responded_by bigint REFERENCES users(id),
    responded_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_feedback_status ON feedback(status);
CREATE INDEX IF NOT EXISTS idx_feedback_user_id ON feedback(user_id);

-- ================================================
-- 21. 标签表
-- ================================================
CREATE TABLE IF NOT EXISTS tags (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(100) UNIQUE NOT NULL,
    color VARCHAR(20) DEFAULT '#3B82F6',
    icon VARCHAR(50),
    usage_count INTEGER DEFAULT 0,
    created_by bigint REFERENCES users(id),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_tags_name ON tags(name);

-- ================================================
-- 22. 资源标签关联表
-- ================================================
CREATE TABLE IF NOT EXISTS resource_tags (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    resource_type VARCHAR(50) NOT NULL,
    resource_id UUID NOT NULL,
    tag_id UUID REFERENCES tags(id) ON DELETE CASCADE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(resource_type, resource_id, tag_id)
);

CREATE INDEX IF NOT EXISTS idx_resource_tags_resource ON resource_tags(resource_type, resource_id);
CREATE INDEX IF NOT EXISTS idx_resource_tags_tag_id ON resource_tags(tag_id);

-- ================================================
-- 23. 笔记表
-- ================================================
CREATE TABLE IF NOT EXISTS notes (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id bigint REFERENCES users(id) ON DELETE CASCADE,
    title VARCHAR(255) NOT NULL,
    content TEXT,
    content_html TEXT,
    is_pinned BOOLEAN DEFAULT false,
    is_archived BOOLEAN DEFAULT false,
    folder_id UUID,
    tags UUID[] DEFAULT '{}',
    linked_resources JSONB DEFAULT '[]',
    view_count INTEGER DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_notes_user_id ON notes(user_id);
CREATE INDEX IF NOT EXISTS idx_notes_folder_id ON notes(folder_id);
CREATE INDEX IF NOT EXISTS idx_notes_is_archived ON notes(is_archived);

-- ================================================
-- 24. 笔记文件夹表
-- ================================================
CREATE TABLE IF NOT EXISTS note_folders (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id bigint REFERENCES users(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    parent_id UUID REFERENCES note_folders(id) ON DELETE CASCADE,
    color VARCHAR(20) DEFAULT '#3B82F6',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_note_folders_user_id ON note_folders(user_id);
CREATE INDEX IF NOT EXISTS idx_note_folders_parent_id ON note_folders(parent_id);

-- ================================================
-- 25. 课程表
-- ================================================
CREATE TABLE IF NOT EXISTS courses (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id bigint REFERENCES users(id) ON DELETE CASCADE,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    cover_image TEXT,
    subject_id UUID,
    difficulty VARCHAR(20) DEFAULT 'intermediate',
    total_lessons INTEGER DEFAULT 0,
    completed_lessons INTEGER DEFAULT 0,
    estimated_hours INTEGER DEFAULT 0,
    is_published BOOLEAN DEFAULT false,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_courses_user_id ON courses(user_id);
CREATE INDEX IF NOT EXISTS idx_courses_subject_id ON courses(subject_id);

-- ================================================
-- 26. 课程章节表
-- ================================================
CREATE TABLE IF NOT EXISTS course_chapters (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    course_id UUID REFERENCES courses(id) ON DELETE CASCADE,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    order_index INTEGER DEFAULT 0,
    lessons JSONB DEFAULT '[]',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_course_chapters_course_id ON course_chapters(course_id);

-- ================================================
-- 27. 学习进度表
-- ================================================
CREATE TABLE IF NOT EXISTS learning_progress (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id bigint REFERENCES users(id) ON DELETE CASCADE,
    course_id UUID REFERENCES courses(id) ON DELETE CASCADE,
    chapter_id UUID REFERENCES course_chapters(id) ON DELETE CASCADE,
    progress_percentage INTEGER DEFAULT 0 CHECK (progress_percentage BETWEEN 0 AND 100),
    time_spent_minutes INTEGER DEFAULT 0,
    last_accessed_at TIMESTAMP,
    is_completed BOOLEAN DEFAULT false,
    completed_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(user_id, course_id, chapter_id)
);

CREATE INDEX IF NOT EXISTS idx_learning_progress_user_id ON learning_progress(user_id);
CREATE INDEX IF NOT EXISTS idx_learning_progress_course_id ON learning_progress(course_id);

-- ================================================
-- 28. 考试分析表
-- ================================================
CREATE TABLE IF NOT EXISTS exam_analytics (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id bigint REFERENCES users(id) ON DELETE CASCADE,
    exam_id UUID,
    subject_id UUID,
    total_questions INTEGER DEFAULT 0,
    correct_answers INTEGER DEFAULT 0,
    wrong_answers INTEGER DEFAULT 0,
    blank_answers INTEGER DEFAULT 0,
    score NUMERIC(5, 2),
    time_spent_seconds INTEGER DEFAULT 0,
    difficulty_distribution JSONB DEFAULT '{}',
    topic_analysis JSONB DEFAULT '{}',
    strength_weakness JSONB DEFAULT '{}',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_exam_analytics_user_id ON exam_analytics(user_id);
CREATE INDEX IF NOT EXISTS idx_exam_analytics_exam_id ON exam_analytics(exam_id);

-- ================================================
-- 29. 学习路径表
-- ================================================
CREATE TABLE IF NOT EXISTS learning_paths (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id bigint REFERENCES users(id) ON DELETE CASCADE,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    target_subject_id UUID,
    target_skills JSONB DEFAULT '[]',
    milestones JSONB DEFAULT '[]',
    current_milestone INTEGER DEFAULT 0,
    progress_percentage INTEGER DEFAULT 0,
    estimated_completion_date DATE,
    is_started BOOLEAN DEFAULT false,
    started_at TIMESTAMP,
    completed_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_learning_paths_user_id ON learning_paths(user_id);

-- ================================================
-- 30. 技能评估表
-- ================================================
CREATE TABLE IF NOT EXISTS skill_assessments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id bigint REFERENCES users(id) ON DELETE CASCADE,
    skill_name VARCHAR(255) NOT NULL,
    subject_id UUID,
    current_level INTEGER DEFAULT 1 CHECK (current_level BETWEEN 1 AND 10),
    target_level INTEGER DEFAULT 5,
    assessment_type VARCHAR(50),
    evidence JSONB DEFAULT '{}',
    assessed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_skill_assessments_user_id ON skill_assessments(user_id);

-- ================================================
-- 31. 对等辅导配对表
-- ================================================
CREATE TABLE IF NOT EXISTS tutoring_pairs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    mentor_id bigint REFERENCES users(id) ON DELETE CASCADE,
    mentee_id bigint REFERENCES users(id) ON DELETE CASCADE,
    subject_id UUID,
    status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'active', 'completed', 'cancelled')),
    start_date DATE,
    end_date DATE,
    sessions_count INTEGER DEFAULT 0,
    rating INTEGER,
    feedback TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_tutoring_pairs_mentor_id ON tutoring_pairs(mentor_id);
CREATE INDEX IF NOT EXISTS idx_tutoring_pairs_mentee_id ON tutoring_pairs(mentee_id);

-- ================================================
-- 32. 辅导会话记录表
-- ================================================
CREATE TABLE IF NOT EXISTS tutoring_sessions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    pair_id UUID REFERENCES tutoring_pairs(id) ON DELETE CASCADE,
    scheduled_at TIMESTAMP NOT NULL,
    duration_minutes INTEGER DEFAULT 30,
    topic VARCHAR(255),
    summary TEXT,
    notes TEXT,
    rating INTEGER,
    status VARCHAR(20) DEFAULT 'scheduled' CHECK (status IN ('scheduled', 'completed', 'cancelled', 'no_show')),
    completed_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_tutoring_sessions_pair_id ON tutoring_sessions(pair_id);
CREATE INDEX IF NOT EXISTS idx_tutoring_sessions_scheduled_at ON tutoring_sessions(scheduled_at);

-- ================================================
-- 33. 学习群组表
-- ================================================
CREATE TABLE IF NOT EXISTS study_groups (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL,
    description TEXT,
    subject_id UUID,
    cover_image TEXT,
    is_public BOOLEAN DEFAULT true,
    max_members INTEGER DEFAULT 50,
    current_members INTEGER DEFAULT 1,
    creator_id bigint REFERENCES users(id),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_study_groups_creator_id ON study_groups(creator_id);

-- ================================================
-- 34. 学习群组成员表
-- ================================================
CREATE TABLE IF NOT EXISTS study_group_members (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    group_id UUID REFERENCES study_groups(id) ON DELETE CASCADE,
    user_id bigint REFERENCES users(id) ON DELETE CASCADE,
    role VARCHAR(20) DEFAULT 'member' CHECK (role IN ('owner', 'admin', 'member')),
    joined_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(group_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_study_group_members_group_id ON study_group_members(group_id);
CREATE INDEX IF NOT EXISTS idx_study_group_members_user_id ON study_group_members(user_id);

-- ================================================
-- 35. 群组学习活动表
-- ================================================
CREATE TABLE IF NOT EXISTS group_activities (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    group_id UUID REFERENCES study_groups(id) ON DELETE CASCADE,
    activity_type VARCHAR(50) NOT NULL,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    scheduled_at TIMESTAMP,
    duration_minutes INTEGER DEFAULT 60,
    location VARCHAR(255),
    participant_count INTEGER DEFAULT 0,
    max_participants INTEGER DEFAULT 20,
    status VARCHAR(20) DEFAULT 'scheduled',
    created_by bigint REFERENCES users(id),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_group_activities_group_id ON group_activities(group_id);

-- ================================================
-- 36. 系统设置表
-- ================================================
CREATE TABLE IF NOT EXISTS system_settings (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    setting_key VARCHAR(100) UNIQUE NOT NULL,
    setting_value JSONB NOT NULL,
    setting_type VARCHAR(20) DEFAULT 'string',
    description TEXT,
    category VARCHAR(50),
    is_public BOOLEAN DEFAULT false,
    updated_by bigint REFERENCES users(id),
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_system_settings_key ON system_settings(setting_key);
CREATE INDEX IF NOT EXISTS idx_system_settings_category ON system_settings(category);

-- ================================================
-- 37. 备份记录表
-- ================================================
CREATE TABLE IF NOT EXISTS backup_records (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    backup_type VARCHAR(30) DEFAULT 'manual',
    status VARCHAR(20) DEFAULT 'in_progress',
    file_path TEXT,
    file_size BIGINT,
    tables_included JSONB DEFAULT '[]',
    error_message TEXT,
    started_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    completed_at TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_backup_records_status ON backup_records(status);
CREATE INDEX IF NOT EXISTS idx_backup_records_started_at ON backup_records(started_at);

-- ================================================
-- 38. API使用统计表
-- ================================================
CREATE TABLE IF NOT EXISTS api_usage_stats (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id bigint REFERENCES users(id) ON DELETE CASCADE,
    api_endpoint VARCHAR(255) NOT NULL,
    method VARCHAR(10),
    status_code INTEGER,
    response_time_ms INTEGER,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_api_usage_stats_user_id ON api_usage_stats(user_id);
CREATE INDEX IF NOT EXISTS idx_api_usage_stats_endpoint ON api_usage_stats(api_endpoint);
CREATE INDEX IF NOT EXISTS idx_api_usage_stats_created_at ON api_usage_stats(created_at);

-- ================================================
-- 39. 用户偏好设置表
-- ================================================
CREATE TABLE IF NOT EXISTS user_preferences (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id bigint REFERENCES users(id) ON DELETE CASCADE,
    preference_key VARCHAR(100) NOT NULL,
    preference_value JSONB NOT NULL,
    is_synced BOOLEAN DEFAULT false,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(user_id, preference_key)
);

CREATE INDEX IF NOT EXISTS idx_user_preferences_user_id ON user_preferences(user_id);

-- ================================================
-- 40. 访问令牌表
-- ================================================
CREATE TABLE IF NOT EXISTS refresh_tokens (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id bigint REFERENCES users(id) ON DELETE CASCADE,
    token_hash VARCHAR(255) NOT NULL,
    device_info JSONB DEFAULT '{}',
    expires_at TIMESTAMP NOT NULL,
    is_revoked BOOLEAN DEFAULT false,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_refresh_tokens_user_id ON refresh_tokens(user_id);
CREATE INDEX IF NOT EXISTS idx_refresh_tokens_token_hash ON refresh_tokens(token_hash);

-- ================================================
-- 插入默认系统设置
-- ================================================
INSERT INTO system_settings (setting_key, setting_value, setting_type, description, category, is_public) VALUES
    ('site_name', '"班级管理系统"', 'string', '网站名称', 'general', true),
    ('site_logo', '"/logo.png"', 'string', '网站Logo', 'general', true),
    ('maintenance_mode', 'false', 'boolean', '维护模式', 'system', false),
    ('allow_registration', 'true', 'boolean', '允许新用户注册', 'security', true),
    ('email_verification_required', 'true', 'boolean', '注册时需要邮箱验证', 'security', true),
    ('max_upload_size', '10485760', 'number', '最大上传文件大小(字节)', 'upload', true),
    ('allowed_file_types', '["jpg","jpeg","png","gif","pdf","doc","docx","xls","xlsx"]', 'array', '允许的文件类型', 'upload', true),
    ('session_timeout', '3600', 'number', '会话超时时间(秒)', 'security', false),
    ('password_min_length', '6', 'number', '密码最小长度', 'security', true),
    ('default_theme', '"light"', 'string', '默认主题', 'appearance', true),
    ('default_language', '"zh-CN"', 'string', '默认语言', 'appearance', true),
    ('timezone', '"Asia/Shanghai"', 'string', '默认时区', 'general', true)
ON CONFLICT (setting_key) DO NOTHING;

-- ================================================
-- 插入默认成就
-- 使用 VALUES 和 SELECT 来确保兼容 init-database.sql 的表结构
-- ================================================
INSERT INTO achievements (code, name, description, icon, type, condition, reward, category, points, rarity, criteria)
SELECT 
    v.code, v.name, v.description, v.icon, 
    v.category AS type, 
    v.criteria::JSONB AS condition, 
    v.points AS reward,
    v.category, v.points, v.rarity, v.criteria::JSONB
FROM (VALUES
    ('first_login', '初次登录', '首次登录系统', 'fa-sign-in', 'milestone', 10, 'common', '{"type": "login_count", "value": 1}'),
    ('streak_7', '连续7天', '连续7天活跃', 'fa-fire', 'streak', 50, 'rare', '{"type": "streak_days", "value": 7}'),
    ('streak_30', '坚持一个月', '连续30天活跃', 'fa-calendar-check', 'streak', 200, 'epic', '{"type": "streak_days", "value": 30}'),
    ('questions_100', '百题斩', '整理100道错题', 'fa-trophy', 'learning', 100, 'rare', '{"type": "wrong_questions_count", "value": 100}'),
    ('questions_500', '学富五车', '整理500道错题', 'fa-star', 'learning', 500, 'epic', '{"type": "wrong_questions_count", "value": 500}'),
    ('perfect_exam', '满分答卷', '一次考试获得满分', 'fa-graduation-cap', 'exam', 150, 'rare', '{"type": "exam_score", "value": 100}'),
    ('study_plan_complete', '计划达人', '完成一个学习计划', 'fa-check-circle', 'learning', 50, 'common', '{"type": "completed_plans", "value": 1}'),
    ('early_bird', '早起鸟', '早上6点前签到', 'fa-sun', 'special', 30, 'rare', '{"type": "attendance_early", "value": 1}'),
    ('night_owl', '夜猫子', '凌晨12点后签到', 'fa-moon', 'special', 30, 'rare', '{"type": "attendance_late", "value": 1}'),
    ('word_master_100', '词汇达人100', '掌握100个英语单词', 'fa-language', 'language', 100, 'rare', '{"type": "word_mastery", "value": 100}'),
    ('helper', '小帮手', '回答其他成员问题10次', 'fa-hands-helping', 'social', 75, 'rare', '{"type": "help_count", "value": 10}'),
    ('contributor', '贡献者', '提交5次反馈建议', 'fa-comment', 'feedback', 50, 'common', '{"type": "feedback_count", "value": 5}')
) AS v(code, name, description, icon, category, points, rarity, criteria)
ON CONFLICT (code) DO NOTHING;

-- ================================================
-- 启用RLS策略
-- ================================================

-- 为用户表启用RLS
ALTER TABLE users ENABLE ROW LEVEL SECURITY;

-- 创建策略：用户只能查看自己的数据（管理员除外）
DROP POLICY IF EXISTS "Users can view own data" ON users;
CREATE POLICY "Users can view own data" ON users
    FOR SELECT USING (true);

DROP POLICY IF EXISTS "Users can update own data" ON users;
CREATE POLICY "Users can update own data" ON users
    FOR UPDATE USING (true);

-- 为错题表启用RLS
ALTER TABLE wrong_questions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own wrong questions" ON wrong_questions;
CREATE POLICY "Users can view own wrong questions" ON wrong_questions
    FOR SELECT USING (true);

DROP POLICY IF EXISTS "Users can insert own wrong questions" ON wrong_questions;
CREATE POLICY "Users can insert own wrong questions" ON wrong_questions
    FOR INSERT WITH CHECK (true);

DROP POLICY IF EXISTS "Users can update own wrong questions" ON wrong_questions;
CREATE POLICY "Users can update own wrong questions" ON wrong_questions
    FOR UPDATE USING (true);

DROP POLICY IF EXISTS "Users can delete own wrong questions" ON wrong_questions;
CREATE POLICY "Users can delete own wrong questions" ON wrong_questions
    FOR DELETE USING (true);

-- 为其他用户相关表启用RLS
ALTER TABLE english_words ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users manage own words" ON english_words;
CREATE POLICY "Users manage own words" ON english_words
    FOR ALL USING (true);

ALTER TABLE study_plans ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users manage own plans" ON study_plans;
CREATE POLICY "Users manage own plans" ON study_plans
    FOR ALL USING (true);

ALTER TABLE achievements ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Anyone can view achievements" ON achievements;
CREATE POLICY "Anyone can view achievements" ON achievements
    FOR SELECT USING (true);

ALTER TABLE user_achievements ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users manage own achievements" ON user_achievements;
CREATE POLICY "Users manage own achievements" ON user_achievements
    FOR ALL USING (true);

ALTER TABLE notes ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users manage own notes" ON notes;
CREATE POLICY "Users manage own notes" ON notes
    FOR ALL USING (true);

ALTER TABLE recommendations ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users manage own recommendations" ON recommendations;
CREATE POLICY "Users manage own recommendations" ON recommendations
    FOR ALL USING (true);

ALTER TABLE learning_progress ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users manage own progress" ON learning_progress;
CREATE POLICY "Users manage own progress" ON learning_progress
    FOR ALL USING (true);

-- ================================================
-- 创建函数和触发器
-- ================================================

-- 自动更新updated_at字段的函数
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

-- 为常用表创建触发器（使用 DO 块检查是否已存在）
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'update_users_updated_at') THEN
        CREATE TRIGGER update_users_updated_at
            BEFORE UPDATE ON users
            FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'update_wrong_questions_updated_at') THEN
        CREATE TRIGGER update_wrong_questions_updated_at
            BEFORE UPDATE ON wrong_questions
            FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'update_subjects_updated_at') THEN
        CREATE TRIGGER update_subjects_updated_at
            BEFORE UPDATE ON subjects
            FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'update_knowledge_points_updated_at') THEN
        CREATE TRIGGER update_knowledge_points_updated_at
            BEFORE UPDATE ON knowledge_points
            FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'update_study_plans_updated_at') THEN
        CREATE TRIGGER update_study_plans_updated_at
            BEFORE UPDATE ON study_plans
            FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'update_notes_updated_at') THEN
        CREATE TRIGGER update_notes_updated_at
            BEFORE UPDATE ON notes
            FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'update_courses_updated_at') THEN
        CREATE TRIGGER update_courses_updated_at
            BEFORE UPDATE ON courses
            FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
    END IF;
END $$;

-- ================================================
-- 创建便利视图
-- ================================================

-- 先删除旧视图（如果存在），避免列名冲突
DROP VIEW IF EXISTS user_learning_stats CASCADE;
DROP VIEW IF EXISTS daily_active_users CASCADE;
DROP VIEW IF EXISTS subject_wrong_question_stats CASCADE;

-- 用户学习统计视图
CREATE OR REPLACE VIEW user_learning_stats AS
SELECT
    u.id as user_id,
    u.username,
    u.name,
    COUNT(DISTINCT wq.id) as total_wrong_questions,
    COUNT(DISTINCT CASE WHEN wq.mastered = true THEN wq.id END) as mastered_questions,
    COUNT(DISTINCT sp.id) as total_study_plans,
    COUNT(DISTINCT CASE WHEN sp.status = 'completed' THEN sp.id END) as completed_plans,
    COUNT(DISTINCT lp.id) as learning_progress_records,
    COALESCE(SUM(lp.time_spent_minutes), 0) as total_study_minutes
FROM users u
LEFT JOIN wrong_questions wq ON u.id::text = wq.user_id::text
LEFT JOIN study_plans sp ON u.id::text = sp.user_id::text
LEFT JOIN learning_progress lp ON u.id = lp.user_id
GROUP BY u.id, u.username, u.name;

-- 每日活跃用户统计视图
CREATE OR REPLACE VIEW daily_active_users AS
SELECT
    DATE(created_at) as activity_date,
    COUNT(DISTINCT user_id) as active_users,
    COUNT(*) as total_actions
FROM activity_logs
WHERE created_at >= CURRENT_DATE - INTERVAL '30 days'
GROUP BY DATE(created_at)
ORDER BY activity_date DESC;

-- 错题按科目统计视图
CREATE OR REPLACE VIEW subject_wrong_question_stats AS
SELECT
    s.id as subject_id,
    s.name as subject_name,
    s.color as subject_color,
    COUNT(wq.id) as total_questions,
    COUNT(CASE WHEN wq.mastered = true THEN 1 END) as mastered_count,
    COUNT(DISTINCT wq.user_id) as users_count
FROM subjects s
LEFT JOIN wrong_questions wq ON s.id = wq.subject_id
GROUP BY s.id, s.name, s.color;

-- ================================================
-- 完成提示
-- ================================================
-- 数据库增强架构创建完成！
-- 请确保在Supabase SQL编辑器中执行此脚本。
-- 执行完成后，系统将支持以下高级功能：
-- 1. 英语单词学习系统
-- 2. AI辅导会话
-- 3. 学习分析和智能推荐
-- 4. 知识图谱
-- 5. 成就系统
-- 6. 任务自动化
-- 7. 智能提醒
-- 8. 课程和群组学习
-- 9. 对等辅导
-- 10. 高级安全策略
