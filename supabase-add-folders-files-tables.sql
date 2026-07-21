-- 文件夹表
CREATE TABLE IF NOT EXISTS folders (
    id BIGINT PRIMARY KEY,
    name TEXT NOT NULL,
    ownerid BIGINT NOT NULL,
    members TEXT DEFAULT '',
    createdat TIMESTAMPTZ DEFAULT NOW(),
    files JSONB DEFAULT '[]'
);

-- 添加缺失的列到folders表
ALTER TABLE folders ADD COLUMN IF NOT EXISTS createdat TIMESTAMPTZ DEFAULT NOW();
ALTER TABLE folders ADD COLUMN IF NOT EXISTS files JSONB DEFAULT '[]';

-- 文件表
CREATE TABLE IF NOT EXISTS files (
    id BIGINT PRIMARY KEY,
    name TEXT NOT NULL,
    size INTEGER,
    type TEXT,
    folderid BIGINT NOT NULL,
    foldername TEXT,
    ownerid BIGINT NOT NULL,
    uploadername TEXT,
    foldermembers TEXT DEFAULT '',
    uploadedat TIMESTAMPTZ DEFAULT NOW(),
    url TEXT
);

-- 启用 Row Level Security
ALTER TABLE folders ENABLE ROW LEVEL SECURITY;
ALTER TABLE files ENABLE ROW LEVEL SECURITY;

-- 允许匿名读取（开发模式）
-- 先删除已存在的策略
DROP POLICY IF EXISTS "Allow all access" ON folders;
DROP POLICY IF EXISTS "Allow all access" ON files;

-- 创建新的策略
CREATE POLICY "Allow all access" ON folders FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all access" ON files FOR ALL USING (true) WITH CHECK (true);
