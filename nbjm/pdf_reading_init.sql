-- ============================================================
-- PDF 阅读追踪系统 - Supabase 数据库初始化脚本
-- 请在 Supabase SQL Editor 中执行此脚本
-- 全部使用 IF NOT EXISTS，可安全重复执行
-- ============================================================

-- 1. PDF 文件表（存储管理员上传的PDF）
CREATE TABLE IF NOT EXISTS pdf_files (
    id BIGSERIAL PRIMARY KEY,
    file_name TEXT NOT NULL,
    file_data TEXT NOT NULL,  -- base64 编码的 PDF 数据
    file_size INTEGER DEFAULT 0,
    uploaded_by TEXT NOT NULL,  -- 管理员 session_id
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. PDF 授权表（指定哪些用户可以阅读）
CREATE TABLE IF NOT EXISTS pdf_permissions (
    id BIGSERIAL PRIMARY KEY,
    pdf_id INTEGER NOT NULL REFERENCES pdf_files(id) ON DELETE CASCADE,
    user_session_id TEXT NOT NULL,  -- 用户的 session_id
    user_name TEXT,  -- 用户名（可选）
    can_read BOOLEAN DEFAULT true,
    granted_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(pdf_id, user_session_id)
);

-- 3. PDF 阅读会话表（记录每次阅读的开始和结束）
CREATE TABLE IF NOT EXISTS pdf_reading_sessions (
    id BIGSERIAL PRIMARY KEY,
    pdf_id INTEGER NOT NULL REFERENCES pdf_files(id) ON DELETE CASCADE,
    user_session_id TEXT NOT NULL,
    user_name TEXT,
    start_time TIMESTAMPTZ NOT NULL,
    end_time TIMESTAMPTZ,
    duration_seconds INTEGER DEFAULT 0,
    status TEXT DEFAULT 'active'  -- active, paused, completed, abandoned
);

-- 4. PDF 阅读日志表（记录每一次状态变化）
CREATE TABLE IF NOT EXISTS pdf_reading_logs (
    id BIGSERIAL PRIMARY KEY,
    session_id INTEGER NOT NULL REFERENCES pdf_reading_sessions(id) ON DELETE CASCADE,
    action TEXT NOT NULL,  -- start, pause, resume, stop, complete
    duration_seconds INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 5. 用户阅读总览表（聚合统计）
CREATE TABLE IF NOT EXISTS pdf_reading_stats (
    id BIGSERIAL PRIMARY KEY,
    user_session_id TEXT NOT NULL,
    pdf_id INTEGER NOT NULL REFERENCES pdf_files(id) ON DELETE CASCADE,
    total_reading_seconds INTEGER DEFAULT 0,
    last_read_at TIMESTAMPTZ,
    read_count INTEGER DEFAULT 1,
    UNIQUE(user_session_id, pdf_id)
);

-- ============================================================
-- 索引
-- ============================================================
CREATE INDEX IF NOT EXISTS idx_pdf_files_uploader ON pdf_files(uploaded_by);
CREATE INDEX IF NOT EXISTS idx_pdf_permissions_user ON pdf_permissions(user_session_id);
CREATE INDEX IF NOT EXISTS idx_pdf_permissions_pdf ON pdf_permissions(pdf_id);
CREATE INDEX IF NOT EXISTS idx_pdf_sessions_user ON pdf_reading_sessions(user_session_id);
CREATE INDEX IF NOT EXISTS idx_pdf_sessions_pdf ON pdf_reading_sessions(pdf_id);
CREATE INDEX IF NOT EXISTS idx_pdf_sessions_status ON pdf_reading_sessions(status);
CREATE INDEX IF NOT EXISTS idx_pdf_logs_session ON pdf_reading_logs(session_id);
CREATE INDEX IF NOT EXISTS idx_pdf_stats_user ON pdf_reading_stats(user_session_id);
CREATE INDEX IF NOT EXISTS idx_pdf_stats_pdf ON pdf_reading_stats(pdf_id);

-- ============================================================
-- 行级安全策略（允许公开访问，应用层做权限控制）
-- ============================================================
ALTER TABLE pdf_files ENABLE ROW LEVEL SECURITY;
ALTER TABLE pdf_permissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE pdf_reading_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE pdf_reading_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE pdf_reading_stats ENABLE ROW LEVEL SECURITY;

DO $$
DECLARE
    tbl TEXT;
BEGIN
    FOR tbl IN 
        SELECT unnest(ARRAY[
            'pdf_files', 'pdf_permissions', 'pdf_reading_sessions',
            'pdf_reading_logs', 'pdf_reading_stats'
        ])
    LOOP
        EXECUTE format('DROP POLICY IF EXISTS "Allow all on %I" ON %I', tbl, tbl);
        EXECUTE format('CREATE POLICY "Allow all on %I" ON %I FOR ALL USING (true) WITH CHECK (true)', tbl, tbl);
    END LOOP;
END $$;

-- ============================================================
-- 完成
-- ============================================================
SELECT 'PDF 阅读追踪系统数据库初始化完成' AS result;
