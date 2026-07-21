-- 聊天功能补建表（在已有 supabase-schema.sql 执行后运行此脚本）
-- 适用于 Supabase SQL Editor

-- ============================================================
-- 1. 聊天会话表
-- ============================================================
CREATE TABLE IF NOT EXISTS chat_conversations (
    id TEXT PRIMARY KEY,
    name TEXT,
    type TEXT DEFAULT 'private',
    participants JSONB DEFAULT '[]'::jsonb,
    created_by TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    last_message_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    unread_count JSONB DEFAULT '{}'::jsonb,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================================
-- 2. 聊天消息表
-- ============================================================
CREATE TABLE IF NOT EXISTS chat_messages (
    id TEXT PRIMARY KEY,
    conversation_id TEXT NOT NULL DEFAULT 'global',
    sender_id TEXT,
    content TEXT NOT NULL,
    type TEXT DEFAULT 'text',
    metadata JSONB DEFAULT '{}'::jsonb,
    status TEXT DEFAULT 'sent',
    read_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================================
-- 3. 索引
-- ============================================================
CREATE INDEX IF NOT EXISTS idx_chat_messages_conversation
    ON chat_messages(conversation_id);

CREATE INDEX IF NOT EXISTS idx_chat_messages_created_at
    ON chat_messages(created_at DESC);

CREATE INDEX IF NOT EXISTS idx_chat_messages_sender
    ON chat_messages(sender_id);

CREATE INDEX IF NOT EXISTS idx_chat_conversations_last_message
    ON chat_conversations(last_message_at DESC);

-- ============================================================
-- 4. 预置全局群聊会话
-- ============================================================
INSERT INTO chat_conversations (id, name, type, participants, created_by, last_message_at, unread_count)
VALUES ('global', '班级群聊', 'group', '[]'::jsonb, 'system', NOW(), '{}'::jsonb)
ON CONFLICT (id) DO NOTHING;

-- ============================================================
-- 5. RLS 策略（与现有表保持一致：匿名可读写）
-- ============================================================
ALTER TABLE chat_conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE chat_messages ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow anonymous read access to chat_conversations" ON chat_conversations;
DROP POLICY IF EXISTS "Allow anonymous insert to chat_conversations" ON chat_conversations;
DROP POLICY IF EXISTS "Allow anonymous update to chat_conversations" ON chat_conversations;
DROP POLICY IF EXISTS "Allow anonymous delete to chat_conversations" ON chat_conversations;

CREATE POLICY "Allow anonymous read access to chat_conversations" ON chat_conversations
    FOR SELECT USING (true);

CREATE POLICY "Allow anonymous insert to chat_conversations" ON chat_conversations
    FOR INSERT WITH CHECK (true);

CREATE POLICY "Allow anonymous update to chat_conversations" ON chat_conversations
    FOR UPDATE USING (true);

CREATE POLICY "Allow anonymous delete to chat_conversations" ON chat_conversations
    FOR DELETE USING (true);

DROP POLICY IF EXISTS "Allow anonymous read access to chat_messages" ON chat_messages;
DROP POLICY IF EXISTS "Allow anonymous insert to chat_messages" ON chat_messages;
DROP POLICY IF EXISTS "Allow anonymous update to chat_messages" ON chat_messages;
DROP POLICY IF EXISTS "Allow anonymous delete to chat_messages" ON chat_messages;

CREATE POLICY "Allow anonymous read access to chat_messages" ON chat_messages
    FOR SELECT USING (true);

CREATE POLICY "Allow anonymous insert to chat_messages" ON chat_messages
    FOR INSERT WITH CHECK (true);

CREATE POLICY "Allow anonymous update to chat_messages" ON chat_messages
    FOR UPDATE USING (true);

CREATE POLICY "Allow anonymous delete to chat_messages" ON chat_messages
    FOR DELETE USING (true);
