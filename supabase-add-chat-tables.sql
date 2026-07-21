-- 聊天功能补建表（在已有 supabase-schema.sql 执行后运行此脚本）
-- 适用于 Supabase SQL Editor

-- ============================================================
-- 1. 聊天会话表
-- ============================================================
CREATE TABLE IF NOT EXISTS chat_conversations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT,
    type TEXT DEFAULT 'private' CHECK (type IN ('private', 'group')),
    participants UUID[] NOT NULL,
    last_message TEXT,
    last_message_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_by bigint REFERENCES users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    unread_count JSONB DEFAULT '{}'::jsonb
);

-- ============================================================
-- 2. 聊天消息表
-- ============================================================
CREATE TABLE IF NOT EXISTS chat_messages (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    conversation_id UUID REFERENCES chat_conversations(id) ON DELETE CASCADE,
    sender_id bigint REFERENCES users(id),
    content TEXT NOT NULL,
    type TEXT DEFAULT 'text' CHECK (type IN ('text', 'image', 'file', 'system')),
    metadata JSONB,
    status TEXT DEFAULT 'sent' CHECK (status IN ('sending', 'sent', 'delivered', 'read', 'failed')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    read_at TIMESTAMP WITH TIME ZONE
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
VALUES ('00000000-0000-0000-0000-000000000001', '班级群聊', 'group', '{}', NULL, NOW(), '{}'::jsonb)
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
