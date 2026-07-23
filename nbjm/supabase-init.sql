-- ============================================================
-- NBjm 数学建模智能体 - Supabase 数据库初始化脚本
-- 请在 Supabase SQL Editor 中执行此脚本
-- 全部使用 IF NOT EXISTS，可安全重复执行
-- ============================================================

-- 1. 系统配置表
CREATE TABLE IF NOT EXISTS system_config (
    key TEXT PRIMARY KEY,
    value TEXT,
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. 用户会话表
CREATE TABLE IF NOT EXISTS user_sessions (
    session_id TEXT PRIMARY KEY,
    data JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. 卡密表
CREATE TABLE IF NOT EXISTS card_codes (
    code TEXT PRIMARY KEY,
    amount INTEGER DEFAULT 0,
    balance INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. 卡密使用日志表
CREATE TABLE IF NOT EXISTS card_usage_log (
    id BIGSERIAL PRIMARY KEY,
    code TEXT NOT NULL,
    session_id TEXT NOT NULL,
    amount INTEGER DEFAULT 0,
    used_at TIMESTAMPTZ DEFAULT NOW()
);

-- 5. 用户余额表
CREATE TABLE IF NOT EXISTS user_cards (
    session_id TEXT PRIMARY KEY,
    balance INTEGER DEFAULT 0,
    card_code TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 6. 扣费历史表
CREATE TABLE IF NOT EXISTS deduction_history (
    id BIGSERIAL PRIMARY KEY,
    session_id TEXT NOT NULL,
    amount INTEGER DEFAULT 0,
    step TEXT DEFAULT '',
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 7. 文件存储表（强制重建，确保 schema 正确）
DROP TABLE IF EXISTS stored_files CASCADE;
CREATE TABLE stored_files (
    id BIGSERIAL PRIMARY KEY,
    session_id TEXT NOT NULL,
    file_key TEXT NOT NULL,
    file_name TEXT,
    file_data TEXT,
    file_size INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 8. 模型扣费规则表
CREATE TABLE IF NOT EXISTS model_deduct_rules (
    id BIGSERIAL PRIMARY KEY,
    model_name TEXT NOT NULL,
    module_name TEXT NOT NULL,
    deduct_count INTEGER DEFAULT 1,
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- 索引
-- ============================================================
CREATE INDEX IF NOT EXISTS idx_user_sessions_created ON user_sessions(created_at);
CREATE INDEX IF NOT EXISTS idx_card_usage_log_code ON card_usage_log(code);
CREATE INDEX IF NOT EXISTS idx_card_usage_log_session ON card_usage_log(session_id);
CREATE INDEX IF NOT EXISTS idx_deduction_history_session ON deduction_history(session_id);
CREATE INDEX IF NOT EXISTS idx_stored_files_session ON stored_files(session_id);
CREATE INDEX IF NOT EXISTS idx_stored_files_key ON stored_files(session_id, file_key);
CREATE INDEX IF NOT EXISTS idx_model_deduct_rules_model ON model_deduct_rules(model_name, module_name);

-- ============================================================
-- 行级安全策略（允许公开访问）
-- ============================================================
ALTER TABLE system_config ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE card_codes ENABLE ROW LEVEL SECURITY;
ALTER TABLE card_usage_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_cards ENABLE ROW LEVEL SECURITY;
ALTER TABLE deduction_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE stored_files ENABLE ROW LEVEL SECURITY;
ALTER TABLE model_deduct_rules ENABLE ROW LEVEL SECURITY;

-- 为每张表创建完全公开的访问策略
DO $$
DECLARE
    tbl TEXT;
BEGIN
    FOR tbl IN 
        SELECT unnest(ARRAY[
            'system_config', 'user_sessions', 'card_codes', 'card_usage_log',
            'user_cards', 'deduction_history', 'stored_files', 'model_deduct_rules'
        ])
    LOOP
        EXECUTE format('DROP POLICY IF EXISTS "Allow all on %I" ON %I', tbl, tbl);
        EXECUTE format('CREATE POLICY "Allow all on %I" ON %I FOR ALL USING (true) WITH CHECK (true)', tbl, tbl);
    END LOOP;
END $$;

-- ============================================================
-- 初始化数据
-- ============================================================
INSERT INTO system_config (key, value) VALUES ('mode', 'mode1')
ON CONFLICT (key) DO NOTHING;

-- ============================================================
-- 完成
-- ============================================================
SELECT 'NBjm 数据库初始化完成' AS result;
