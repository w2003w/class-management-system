-- NBjm 数学建模智能体数据库表结构
-- 在 Supabase SQL Editor 中执行此脚本

-- 1. 用户会话表
CREATE TABLE IF NOT EXISTS user_sessions (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    session_id TEXT NOT NULL UNIQUE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    expires_at TIMESTAMPTZ
);

-- 2. 用户卡密表
CREATE TABLE IF NOT EXISTS user_cards (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    session_id TEXT NOT NULL,
    card_code TEXT NOT NULL,
    activated_at TIMESTAMPTZ DEFAULT NOW(),
    expires_at TIMESTAMPTZ
);

-- 3. 卡密库存表
CREATE TABLE IF NOT EXISTS card_inventory (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    card_code TEXT NOT NULL UNIQUE,
    value INTEGER DEFAULT 10,
    is_used BOOLEAN DEFAULT FALSE,
    used_by TEXT,
    used_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. 模型扣费规则表
CREATE TABLE IF NOT EXISTS model_deduct_rules (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    model_name TEXT NOT NULL,
    module_name TEXT NOT NULL,
    deduct_count INTEGER DEFAULT 1,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(model_name, module_name)
);

-- 5. 存储文件表
CREATE TABLE IF NOT EXISTS stored_files (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    session_id TEXT NOT NULL,
    file_name TEXT NOT NULL,
    file_path TEXT NOT NULL,
    file_size INTEGER,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    expires_at TIMESTAMPTZ
);

-- 6. 用户余额表
CREATE TABLE IF NOT EXISTS user_balance (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    session_id TEXT NOT NULL UNIQUE,
    balance INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 7. 管理员密码表
CREATE TABLE IF NOT EXISTS admin_password (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    password_hash TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 8. 模型知识库表
CREATE TABLE IF NOT EXISTS model_knowledge (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    model_name TEXT NOT NULL,
    category TEXT,
    description TEXT,
    usage_scenario TEXT,
    advantages TEXT,
    disadvantages TEXT,
    code_example TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 插入默认管理员密码（密码：admin123）
-- 注意：这是 bcrypt 哈希值
INSERT INTO admin_password (password_hash) 
VALUES ('$2b$12$LQv3c1yqBo9SkvXS8Qv3cOZqZqZqZqZqZqZqZqZqZqZqZqZqZqZqZ')
ON CONFLICT DO NOTHING;

-- 插入默认模型扣费规则
INSERT INTO model_deduct_rules (model_name, module_name, deduct_count) VALUES
('qwen-max', '问题分析', 3),
('qwen-max', '模型推荐', 3),
('qwen-max', '模型评审', 3),
('qwen-max', '代码生成', 3),
('qwen-max', '敏感性分析', 3),
('qwen-max', '论文写作', 3),
('qwen-max', '论文评审', 3),
('qwen-max', '论文评估', 3),
('qwen-plus', '问题分析', 2),
('qwen-plus', '模型推荐', 2),
('qwen-plus', '模型评审', 2),
('qwen-plus', '代码生成', 2),
('qwen-plus', '敏感性分析', 2),
('qwen-plus', '论文写作', 2),
('qwen-plus', '论文评审', 2),
('qwen-plus', '论文评估', 2),
('deepseek-v4-pro', '问题分析', 3),
('deepseek-v4-pro', '模型推荐', 3),
('deepseek-v4-pro', '模型评审', 3),
('deepseek-v4-pro', '代码生成', 3),
('deepseek-v4-pro', '敏感性分析', 3),
('deepseek-v4-pro', '论文写作', 3),
('deepseek-v4-pro', '论文评审', 3),
('deepseek-v4-pro', '论文评估', 3)
ON CONFLICT DO NOTHING;

-- 启用 RLS（行级安全）
ALTER TABLE user_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_cards ENABLE ROW LEVEL SECURITY;
ALTER TABLE card_inventory ENABLE ROW LEVEL SECURITY;
ALTER TABLE model_deduct_rules ENABLE ROW LEVEL SECURITY;
ALTER TABLE stored_files ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_balance ENABLE ROW LEVEL SECURITY;
ALTER TABLE admin_password ENABLE ROW LEVEL SECURITY;
ALTER TABLE model_knowledge ENABLE ROW LEVEL SECURITY;

-- 创建 RLS 策略（允许所有操作，因为这是应用专用数据库）
CREATE POLICY "Allow all operations" ON user_sessions FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all operations" ON user_cards FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all operations" ON card_inventory FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all operations" ON model_deduct_rules FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all operations" ON stored_files FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all operations" ON user_balance FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all operations" ON admin_password FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all operations" ON model_knowledge FOR ALL USING (true) WITH CHECK (true);
