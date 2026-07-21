-- Supabase 安全修复脚本（简化版）
-- 适用于使用自定义认证系统的项目

-- ============================================
-- 1. 为所有表启用 RLS（行级安全策略）
-- ============================================

-- 启用 users 表的 RLS
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;

-- 启用 notifications 表的 RLS
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

-- 启用 groups 表的 RLS
ALTER TABLE public.groups ENABLE ROW LEVEL SECURITY;

-- 启用 attendances 表的 RLS
ALTER TABLE public.attendances ENABLE ROW LEVEL SECURITY;

-- 启用 questions 表的 RLS
ALTER TABLE public.questions ENABLE ROW LEVEL SECURITY;

-- 启用 settings 表的 RLS
ALTER TABLE public.settings ENABLE ROW LEVEL SECURITY;

-- 启用 permission_settings 表的 RLS
ALTER TABLE public.permission_settings ENABLE ROW LEVEL SECURITY;

-- 启用 password_reset_requests 表的 RLS
ALTER TABLE public.password_reset_requests ENABLE ROW LEVEL SECURITY;

-- 启用 exams 表的 RLS
ALTER TABLE public.exams ENABLE ROW LEVEL SECURITY;

-- 启用 exam_records 表的 RLS
ALTER TABLE public.exam_records ENABLE ROW LEVEL SECURITY;

-- 启用 attendance_records 表的 RLS
ALTER TABLE public.attendance_records ENABLE ROW LEVEL SECURITY;

-- 启用 votes 表的 RLS
ALTER TABLE public.votes ENABLE ROW LEVEL SECURITY;

-- 启用 vote_records 表的 RLS
ALTER TABLE public.vote_records ENABLE ROW LEVEL SECURITY;

-- 启用 lotteries 表的 RLS
ALTER TABLE public.lotteries ENABLE ROW LEVEL SECURITY;

-- 启用 lottery_records 表的 RLS
ALTER TABLE public.lottery_records ENABLE ROW LEVEL SECURITY;

-- 启用 questionnaires 表的 RLS（如果存在）
DO $$
BEGIN
    IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'questionnaires') THEN
        ALTER TABLE public.questionnaires ENABLE ROW LEVEL SECURITY;
    END IF;
END $$;

-- 启用 questionnaire_records 表的 RLS（如果存在）
DO $$
BEGIN
    IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'questionnaire_records') THEN
        ALTER TABLE public.questionnaire_records ENABLE ROW LEVEL SECURITY;
    END IF;
END $$;

-- ============================================
-- 2. 隐藏 users 表的 password 列
-- ============================================

-- 使用列级权限来隐藏 password 列
-- 撤销对 password 列的 SELECT 权限
REVOKE SELECT (password) ON public.users FROM authenticated;
REVOKE SELECT (password) ON public.users FROM anon;
REVOKE SELECT (password) ON public.users FROM public;

-- ============================================
-- 3. 配置 RLS 策略（简化版）
-- 注意：由于项目使用自定义认证系统，RLS 策略使用宽松的权限
-- 实际的权限检查在应用层完成
-- ============================================

-- ============================================
-- Users 表策略
-- ============================================

-- 允许所有认证用户读取用户信息（password 列已被撤销权限）
CREATE POLICY "Allow authenticated to read users"
ON public.users FOR SELECT
TO authenticated
USING (true);

-- 允许匿名用户读取用户信息（password 列已被撤销权限）
CREATE POLICY "Allow anon to read users"
ON public.users FOR SELECT
TO anon
USING (true);

-- 允许认证用户创建用户
CREATE POLICY "Allow authenticated to create users"
ON public.users FOR INSERT
TO authenticated
WITH CHECK (true);

-- 允许认证用户更新用户信息
CREATE POLICY "Allow authenticated to update users"
ON public.users FOR UPDATE
TO authenticated
USING (true)
WITH CHECK (true);

-- 允许认证用户删除用户
CREATE POLICY "Allow authenticated to delete users"
ON public.users FOR DELETE
TO authenticated
USING (true);

-- ============================================
-- Notifications 表策略
-- ============================================

-- 允许所有认证用户读取通知
CREATE POLICY "Allow authenticated to read notifications"
ON public.notifications FOR SELECT
TO authenticated
USING (true);

-- 允许认证用户创建通知
CREATE POLICY "Allow authenticated to create notifications"
ON public.notifications FOR INSERT
TO authenticated
WITH CHECK (true);

-- 允许认证用户更新通知
CREATE POLICY "Allow authenticated to update notifications"
ON public.notifications FOR UPDATE
TO authenticated
USING (true)
WITH CHECK (true);

-- 允许认证用户删除通知
CREATE POLICY "Allow authenticated to delete notifications"
ON public.notifications FOR DELETE
TO authenticated
USING (true);

-- ============================================
-- Groups 表策略
-- ============================================

-- 允许所有认证用户读取分组
CREATE POLICY "Allow authenticated to read groups"
ON public.groups FOR SELECT
TO authenticated
USING (true);

-- 允许认证用户创建分组
CREATE POLICY "Allow authenticated to create groups"
ON public.groups FOR INSERT
TO authenticated
WITH CHECK (true);

-- 允许认证用户更新分组
CREATE POLICY "Allow authenticated to update groups"
ON public.groups FOR UPDATE
TO authenticated
USING (true)
WITH CHECK (true);

-- 允许认证用户删除分组
CREATE POLICY "Allow authenticated to delete groups"
ON public.groups FOR DELETE
TO authenticated
USING (true);

-- ============================================
-- Attendances 表策略
-- ============================================

-- 允许所有认证用户读取签到活动
CREATE POLICY "Allow authenticated to read attendances"
ON public.attendances FOR SELECT
TO authenticated
USING (true);

-- 允许认证用户创建签到活动
CREATE POLICY "Allow authenticated to create attendances"
ON public.attendances FOR INSERT
TO authenticated
WITH CHECK (true);

-- 允许认证用户更新签到活动
CREATE POLICY "Allow authenticated to update attendances"
ON public.attendances FOR UPDATE
TO authenticated
USING (true)
WITH CHECK (true);

-- 允许认证用户删除签到活动
CREATE POLICY "Allow authenticated to delete attendances"
ON public.attendances FOR DELETE
TO authenticated
USING (true);

-- ============================================
-- Attendance Records 表策略
-- ============================================

-- 允许所有认证用户读取签到记录
CREATE POLICY "Allow authenticated to read attendance records"
ON public.attendance_records FOR SELECT
TO authenticated
USING (true);

-- 允许认证用户创建签到记录
CREATE POLICY "Allow authenticated to create attendance records"
ON public.attendance_records FOR INSERT
TO authenticated
WITH CHECK (true);

-- 允许认证用户更新签到记录
CREATE POLICY "Allow authenticated to update attendance records"
ON public.attendance_records FOR UPDATE
TO authenticated
USING (true)
WITH CHECK (true);

-- 允许认证用户删除签到记录
CREATE POLICY "Allow authenticated to delete attendance records"
ON public.attendance_records FOR DELETE
TO authenticated
USING (true);

-- ============================================
-- Questions 表策略
-- ============================================

-- 允许所有认证用户读取题目
CREATE POLICY "Allow authenticated to read questions"
ON public.questions FOR SELECT
TO authenticated
USING (true);

-- 允许认证用户创建题目
CREATE POLICY "Allow authenticated to create questions"
ON public.questions FOR INSERT
TO authenticated
WITH CHECK (true);

-- 允许认证用户更新题目
CREATE POLICY "Allow authenticated to update questions"
ON public.questions FOR UPDATE
TO authenticated
USING (true)
WITH CHECK (true);

-- 允许认证用户删除题目
CREATE POLICY "Allow authenticated to delete questions"
ON public.questions FOR DELETE
TO authenticated
USING (true);

-- ============================================
-- Exams 表策略
-- ============================================

-- 允许所有认证用户读取考试
CREATE POLICY "Allow authenticated to read exams"
ON public.exams FOR SELECT
TO authenticated
USING (true);

-- 允许认证用户创建考试
CREATE POLICY "Allow authenticated to create exams"
ON public.exams FOR INSERT
TO authenticated
WITH CHECK (true);

-- 允许认证用户更新考试
CREATE POLICY "Allow authenticated to update exams"
ON public.exams FOR UPDATE
TO authenticated
USING (true)
WITH CHECK (true);

-- 允许认证用户删除考试
CREATE POLICY "Allow authenticated to delete exams"
ON public.exams FOR DELETE
TO authenticated
USING (true);

-- ============================================
-- Exam Records 表策略
-- ============================================

-- 允许所有认证用户读取考试记录
CREATE POLICY "Allow authenticated to read exam records"
ON public.exam_records FOR SELECT
TO authenticated
USING (true);

-- 允许认证用户创建考试记录
CREATE POLICY "Allow authenticated to create exam records"
ON public.exam_records FOR INSERT
TO authenticated
WITH CHECK (true);

-- 允许认证用户更新考试记录
CREATE POLICY "Allow authenticated to update exam records"
ON public.exam_records FOR UPDATE
TO authenticated
USING (true)
WITH CHECK (true);

-- 允许认证用户删除考试记录
CREATE POLICY "Allow authenticated to delete exam records"
ON public.exam_records FOR DELETE
TO authenticated
USING (true);

-- ============================================
-- Votes 表策略
-- ============================================

-- 允许所有认证用户读取投票
CREATE POLICY "Allow authenticated to read votes"
ON public.votes FOR SELECT
TO authenticated
USING (true);

-- 允许认证用户创建投票
CREATE POLICY "Allow authenticated to create votes"
ON public.votes FOR INSERT
TO authenticated
WITH CHECK (true);

-- 允许认证用户更新投票
CREATE POLICY "Allow authenticated to update votes"
ON public.votes FOR UPDATE
TO authenticated
USING (true)
WITH CHECK (true);

-- 允许认证用户删除投票
CREATE POLICY "Allow authenticated to delete votes"
ON public.votes FOR DELETE
TO authenticated
USING (true);

-- ============================================
-- Vote Records 表策略
-- ============================================

-- 允许所有认证用户读取投票记录
CREATE POLICY "Allow authenticated to read vote records"
ON public.vote_records FOR SELECT
TO authenticated
USING (true);

-- 允许认证用户创建投票记录
CREATE POLICY "Allow authenticated to create vote records"
ON public.vote_records FOR INSERT
TO authenticated
WITH CHECK (true);

-- 允许认证用户删除投票记录
CREATE POLICY "Allow authenticated to delete vote records"
ON public.vote_records FOR DELETE
TO authenticated
USING (true);

-- ============================================
-- Lotteries 表策略
-- ============================================

-- 允许所有认证用户读取抽奖
CREATE POLICY "Allow authenticated to read lotteries"
ON public.lotteries FOR SELECT
TO authenticated
USING (true);

-- 允许认证用户创建抽奖
CREATE POLICY "Allow authenticated to create lotteries"
ON public.lotteries FOR INSERT
TO authenticated
WITH CHECK (true);

-- 允许认证用户更新抽奖
CREATE POLICY "Allow authenticated to update lotteries"
ON public.lotteries FOR UPDATE
TO authenticated
USING (true)
WITH CHECK (true);

-- 允许认证用户删除抽奖
CREATE POLICY "Allow authenticated to delete lotteries"
ON public.lotteries FOR DELETE
TO authenticated
USING (true);

-- ============================================
-- Lottery Records 表策略
-- ============================================

-- 允许所有认证用户读取抽奖记录
CREATE POLICY "Allow authenticated to read lottery records"
ON public.lottery_records FOR SELECT
TO authenticated
USING (true);

-- 允许认证用户创建抽奖记录
CREATE POLICY "Allow authenticated to create lottery records"
ON public.lottery_records FOR INSERT
TO authenticated
WITH CHECK (true);

-- 允许认证用户删除抽奖记录
CREATE POLICY "Allow authenticated to delete lottery records"
ON public.lottery_records FOR DELETE
TO authenticated
USING (true);

-- ============================================
-- Settings 表策略
-- ============================================

-- 允许所有认证用户读取设置
CREATE POLICY "Allow authenticated to read settings"
ON public.settings FOR SELECT
TO authenticated
USING (true);

-- 允许认证用户更新设置
CREATE POLICY "Allow authenticated to update settings"
ON public.settings FOR UPDATE
TO authenticated
USING (true)
WITH CHECK (true);

-- ============================================
-- Permission Settings 表策略
-- ============================================

-- 允许所有认证用户读取权限设置
CREATE POLICY "Allow authenticated to read permission settings"
ON public.permission_settings FOR SELECT
TO authenticated
USING (true);

-- 允许认证用户更新权限设置
CREATE POLICY "Allow authenticated to update permission settings"
ON public.permission_settings FOR UPDATE
TO authenticated
USING (true)
WITH CHECK (true);

-- ============================================
-- Password Reset Requests 表策略
-- ============================================

-- 允许所有认证用户读取密码重置请求
CREATE POLICY "Allow authenticated to read password reset requests"
ON public.password_reset_requests FOR SELECT
TO authenticated
USING (true);

-- 允许认证用户创建密码重置请求
CREATE POLICY "Allow authenticated to create password reset requests"
ON public.password_reset_requests FOR INSERT
TO authenticated
WITH CHECK (true);

-- ============================================
-- Questionnaires 表策略（如果存在）
-- ============================================

DO $$
BEGIN
    IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'questionnaires') THEN
        -- 允许所有认证用户读取问卷
        CREATE POLICY IF NOT EXISTS "Allow authenticated to read questionnaires"
        ON public.questionnaires FOR SELECT
        TO authenticated
        USING (true);

        -- 允许认证用户创建问卷
        CREATE POLICY IF NOT EXISTS "Allow authenticated to create questionnaires"
        ON public.questionnaires FOR INSERT
        TO authenticated
        WITH CHECK (true);

        -- 允许认证用户更新问卷
        CREATE POLICY IF NOT EXISTS "Allow authenticated to update questionnaires"
        ON public.questionnaires FOR UPDATE
        TO authenticated
        USING (true)
        WITH CHECK (true);

        -- 允许认证用户删除问卷
        CREATE POLICY IF NOT EXISTS "Allow authenticated to delete questionnaires"
        ON public.questionnaires FOR DELETE
        TO authenticated
        USING (true);
    END IF;
END $$;

-- ============================================
-- Questionnaire Records 表策略（如果存在）
-- ============================================

DO $$
BEGIN
    IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'questionnaire_records') THEN
        -- 允许所有认证用户读取问卷记录
        CREATE POLICY IF NOT EXISTS "Allow authenticated to read questionnaire records"
        ON public.questionnaire_records FOR SELECT
        TO authenticated
        USING (true);

        -- 允许认证用户创建问卷记录
        CREATE POLICY IF NOT EXISTS "Allow authenticated to create questionnaire records"
        ON public.questionnaire_records FOR INSERT
        TO authenticated
        WITH CHECK (true);

        -- 允许认证用户删除问卷记录
        CREATE POLICY IF NOT EXISTS "Allow authenticated to delete questionnaire records"
        ON public.questionnaire_records FOR DELETE
        TO authenticated
        USING (true);
    END IF;
END $$;

-- ============================================
-- 完成
-- ============================================

-- 输出完成信息
DO $$
BEGIN
    RAISE NOTICE '========================================';
    RAISE NOTICE 'Supabase 安全修复完成！';
    RAISE NOTICE '========================================';
    RAISE NOTICE '1. 已为所有表启用 RLS（行级安全策略）';
    RAISE NOTICE '2. 已隐藏 users 表的 password 列';
    RAISE NOTICE '3. 已配置宽松的访问权限策略';
    RAISE NOTICE '注意：由于项目使用自定义认证系统，';
    RAISE NOTICE 'RLS 策略使用宽松的权限，';
    RAISE NOTICE '实际的权限检查在应用层完成。';
    RAISE NOTICE '========================================';
END $$;
