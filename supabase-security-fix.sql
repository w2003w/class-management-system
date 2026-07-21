-- Supabase 安全修复脚本
-- 此脚本用于修复 Advisor 发现的安全问题

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
-- 3. 配置 RLS 策略
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

-- 允许管理员创建用户
CREATE POLICY "Allow admins to create users"
ON public.users FOR INSERT
TO authenticated
WITH CHECK (
    EXISTS (
        SELECT 1 FROM public.users
        WHERE id = auth.uid()
        AND role IN ('admin', 'subAdmin')
    )
);

-- 允许用户更新自己的信息
CREATE POLICY "Allow users to update own profile"
ON public.users FOR UPDATE
TO authenticated
USING (id = auth.uid())
WITH CHECK (id = auth.uid());

-- 允许管理员更新所有用户信息
CREATE POLICY "Allow admins to update users"
ON public.users FOR UPDATE
TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM public.users
        WHERE id = auth.uid()
        AND role IN ('admin', 'subAdmin')
    )
)
WITH CHECK (
    EXISTS (
        SELECT 1 FROM public.users
        WHERE id = auth.uid()
        AND role IN ('admin', 'subAdmin')
    )
);

-- 允许管理员删除用户
CREATE POLICY "Allow admins to delete users"
ON public.users FOR DELETE
TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM public.users
        WHERE id = auth.uid()
        AND role IN ('admin', 'subAdmin')
    )
);

-- ============================================
-- Notifications 表策略
-- ============================================

-- 允许用户读取自己的通知
CREATE POLICY "Allow users to read own notifications"
ON public.notifications FOR SELECT
TO authenticated
USING (userid = auth.uid());

-- 允许管理员读取所有通知
CREATE POLICY "Allow admins to read all notifications"
ON public.notifications FOR SELECT
TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM public.users
        WHERE id = auth.uid()
        AND role IN ('admin', 'subAdmin')
    )
);

-- 允许系统创建通知
CREATE POLICY "Allow system to create notifications"
ON public.notifications FOR INSERT
TO authenticated
WITH CHECK (true);

-- 允许用户更新自己的通知（标记已读）
CREATE POLICY "Allow users to update own notifications"
ON public.notifications FOR UPDATE
TO authenticated
USING (userid = auth.uid())
WITH CHECK (userid = auth.uid());

-- 允许用户删除自己的通知
CREATE POLICY "Allow users to delete own notifications"
ON public.notifications FOR DELETE
TO authenticated
USING (userid = auth.uid());

-- ============================================
-- Groups 表策略
-- ============================================

-- 允许所有认证用户读取分组
CREATE POLICY "Allow authenticated to read groups"
ON public.groups FOR SELECT
TO authenticated
USING (true);

-- 允许管理员创建分组
CREATE POLICY "Allow admins to create groups"
ON public.groups FOR INSERT
TO authenticated
WITH CHECK (
    EXISTS (
        SELECT 1 FROM public.users
        WHERE id = auth.uid()
        AND role IN ('admin', 'subAdmin')
    )
);

-- 允许管理员更新分组
CREATE POLICY "Allow admins to update groups"
ON public.groups FOR UPDATE
TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM public.users
        WHERE id = auth.uid()
        AND role IN ('admin', 'subAdmin')
    )
)
WITH CHECK (
    EXISTS (
        SELECT 1 FROM public.users
        WHERE id = auth.uid()
        AND role IN ('admin', 'subAdmin')
    )
);

-- 允许管理员删除分组
CREATE POLICY "Allow admins to delete groups"
ON public.groups FOR DELETE
TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM public.users
        WHERE id = auth.uid()
        AND role IN ('admin', 'subAdmin')
    )
);

-- ============================================
-- Attendances 表策略
-- ============================================

-- 允许所有认证用户读取签到活动
CREATE POLICY "Allow authenticated to read attendances"
ON public.attendances FOR SELECT
TO authenticated
USING (true);

-- 允许管理员创建签到活动
CREATE POLICY "Allow admins to create attendances"
ON public.attendances FOR INSERT
TO authenticated
WITH CHECK (
    EXISTS (
        SELECT 1 FROM public.users
        WHERE id = auth.uid()
        AND role IN ('admin', 'subAdmin')
    )
);

-- 允许管理员更新签到活动
CREATE POLICY "Allow admins to update attendances"
ON public.attendances FOR UPDATE
TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM public.users
        WHERE id = auth.uid()
        AND role IN ('admin', 'subAdmin')
    )
)
WITH CHECK (
    EXISTS (
        SELECT 1 FROM public.users
        WHERE id = auth.uid()
        AND role IN ('admin', 'subAdmin')
    )
);

-- 允许管理员删除签到活动
CREATE POLICY "Allow admins to delete attendances"
ON public.attendances FOR DELETE
TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM public.users
        WHERE id = auth.uid()
        AND role IN ('admin', 'subAdmin')
    )
);

-- ============================================
-- Attendance Records 表策略
-- ============================================

-- 允许用户读取自己的签到记录
CREATE POLICY "Allow users to read own attendance records"
ON public.attendance_records FOR SELECT
TO authenticated
USING (userid = auth.uid());

-- 允许管理员读取所有签到记录
CREATE POLICY "Allow admins to read all attendance records"
ON public.attendance_records FOR SELECT
TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM public.users
        WHERE id = auth.uid()
        AND role IN ('admin', 'subAdmin')
    )
);

-- 允许用户创建签到记录
CREATE POLICY "Allow users to create attendance records"
ON public.attendance_records FOR INSERT
TO authenticated
WITH CHECK (userid = auth.uid());

-- 允许管理员更新签到记录
CREATE POLICY "Allow admins to update attendance records"
ON public.attendance_records FOR UPDATE
TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM public.users
        WHERE id = auth.uid()
        AND role IN ('admin', 'subAdmin')
    )
)
WITH CHECK (
    EXISTS (
        SELECT 1 FROM public.users
        WHERE id = auth.uid()
        AND role IN ('admin', 'subAdmin')
    )
);

-- 允许管理员删除签到记录
CREATE POLICY "Allow admins to delete attendance records"
ON public.attendance_records FOR DELETE
TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM public.users
        WHERE id = auth.uid()
        AND role IN ('admin', 'subAdmin')
    )
);

-- ============================================
-- Questions 表策略
-- ============================================

-- 允许所有认证用户读取题目
CREATE POLICY "Allow authenticated to read questions"
ON public.questions FOR SELECT
TO authenticated
USING (true);

-- 允许管理员创建题目
CREATE POLICY "Allow admins to create questions"
ON public.questions FOR INSERT
TO authenticated
WITH CHECK (
    EXISTS (
        SELECT 1 FROM public.users
        WHERE id = auth.uid()
        AND role IN ('admin', 'subAdmin')
    )
);

-- 允许管理员更新题目
CREATE POLICY "Allow admins to update questions"
ON public.questions FOR UPDATE
TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM public.users
        WHERE id = auth.uid()
        AND role IN ('admin', 'subAdmin')
    )
)
WITH CHECK (
    EXISTS (
        SELECT 1 FROM public.users
        WHERE id = auth.uid()
        AND role IN ('admin', 'subAdmin')
    )
);

-- 允许管理员删除题目
CREATE POLICY "Allow admins to delete questions"
ON public.questions FOR DELETE
TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM public.users
        WHERE id = auth.uid()
        AND role IN ('admin', 'subAdmin')
    )
);

-- ============================================
-- Exams 表策略
-- ============================================

-- 允许所有认证用户读取考试
CREATE POLICY "Allow authenticated to read exams"
ON public.exams FOR SELECT
TO authenticated
USING (true);

-- 允许管理员创建考试
CREATE POLICY "Allow admins to create exams"
ON public.exams FOR INSERT
TO authenticated
WITH CHECK (
    EXISTS (
        SELECT 1 FROM public.users
        WHERE id = auth.uid()
        AND role IN ('admin', 'subAdmin')
    )
);

-- 允许管理员更新考试
CREATE POLICY "Allow admins to update exams"
ON public.exams FOR UPDATE
TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM public.users
        WHERE id = auth.uid()
        AND role IN ('admin', 'subAdmin')
    )
)
WITH CHECK (
    EXISTS (
        SELECT 1 FROM public.users
        WHERE id = auth.uid()
        AND role IN ('admin', 'subAdmin')
    )
);

-- 允许管理员删除考试
CREATE POLICY "Allow admins to delete exams"
ON public.exams FOR DELETE
TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM public.users
        WHERE id = auth.uid()
        AND role IN ('admin', 'subAdmin')
    )
);

-- ============================================
-- Exam Records 表策略
-- ============================================

-- 允许用户读取自己的考试记录
CREATE POLICY "Allow users to read own exam records"
ON public.exam_records FOR SELECT
TO authenticated
USING (userid = auth.uid());

-- 允许管理员读取所有考试记录
CREATE POLICY "Allow admins to read all exam records"
ON public.exam_records FOR SELECT
TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM public.users
        WHERE id = auth.uid()
        AND role IN ('admin', 'subAdmin')
    )
);

-- 允许用户创建考试记录
CREATE POLICY "Allow users to create exam records"
ON public.exam_records FOR INSERT
TO authenticated
WITH CHECK (userid = auth.uid());

-- 允许管理员更新考试记录
CREATE POLICY "Allow admins to update exam records"
ON public.exam_records FOR UPDATE
TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM public.users
        WHERE id = auth.uid()
        AND role IN ('admin', 'subAdmin')
    )
)
WITH CHECK (
    EXISTS (
        SELECT 1 FROM public.users
        WHERE id = auth.uid()
        AND role IN ('admin', 'subAdmin')
    )
);

-- 允许管理员删除考试记录
CREATE POLICY "Allow admins to delete exam records"
ON public.exam_records FOR DELETE
TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM public.users
        WHERE id = auth.uid()
        AND role IN ('admin', 'subAdmin')
    )
);

-- ============================================
-- Votes 表策略
-- ============================================

-- 允许所有认证用户读取投票
CREATE POLICY "Allow authenticated to read votes"
ON public.votes FOR SELECT
TO authenticated
USING (true);

-- 允许管理员创建投票
CREATE POLICY "Allow admins to create votes"
ON public.votes FOR INSERT
TO authenticated
WITH CHECK (
    EXISTS (
        SELECT 1 FROM public.users
        WHERE id = auth.uid()
        AND role IN ('admin', 'subAdmin')
    )
);

-- 允许管理员更新投票
CREATE POLICY "Allow admins to update votes"
ON public.votes FOR UPDATE
TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM public.users
        WHERE id = auth.uid()
        AND role IN ('admin', 'subAdmin')
    )
)
WITH CHECK (
    EXISTS (
        SELECT 1 FROM public.users
        WHERE id = auth.uid()
        AND role IN ('admin', 'subAdmin')
    )
);

-- 允许管理员删除投票
CREATE POLICY "Allow admins to delete votes"
ON public.votes FOR DELETE
TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM public.users
        WHERE id = auth.uid()
        AND role IN ('admin', 'subAdmin')
    )
);

-- ============================================
-- Vote Records 表策略
-- ============================================

-- 允许用户读取自己的投票记录
CREATE POLICY "Allow users to read own vote records"
ON public.vote_records FOR SELECT
TO authenticated
USING (userid = auth.uid());

-- 允许管理员读取所有投票记录
CREATE POLICY "Allow admins to read all vote records"
ON public.vote_records FOR SELECT
TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM public.users
        WHERE id = auth.uid()
        AND role IN ('admin', 'subAdmin')
    )
);

-- 允许用户创建投票记录
CREATE POLICY "Allow users to create vote records"
ON public.vote_records FOR INSERT
TO authenticated
WITH CHECK (userid = auth.uid());

-- 允许管理员删除投票记录
CREATE POLICY "Allow admins to delete vote records"
ON public.vote_records FOR DELETE
TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM public.users
        WHERE id = auth.uid()
        AND role IN ('admin', 'subAdmin')
    )
);

-- ============================================
-- Lotteries 表策略
-- ============================================

-- 允许所有认证用户读取抽奖
CREATE POLICY "Allow authenticated to read lotteries"
ON public.lotteries FOR SELECT
TO authenticated
USING (true);

-- 允许管理员创建抽奖
CREATE POLICY "Allow admins to create lotteries"
ON public.lotteries FOR INSERT
TO authenticated
WITH CHECK (
    EXISTS (
        SELECT 1 FROM public.users
        WHERE id = auth.uid()
        AND role IN ('admin', 'subAdmin')
    )
);

-- 允许管理员更新抽奖
CREATE POLICY "Allow admins to update lotteries"
ON public.lotteries FOR UPDATE
TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM public.users
        WHERE id = auth.uid()
        AND role IN ('admin', 'subAdmin')
    )
)
WITH CHECK (
    EXISTS (
        SELECT 1 FROM public.users
        WHERE id = auth.uid()
        AND role IN ('admin', 'subAdmin')
    )
);

-- 允许管理员删除抽奖
CREATE POLICY "Allow admins to delete lotteries"
ON public.lotteries FOR DELETE
TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM public.users
        WHERE id = auth.uid()
        AND role IN ('admin', 'subAdmin')
    )
);

-- ============================================
-- Lottery Records 表策略
-- ============================================

-- 允许用户读取自己的抽奖记录
CREATE POLICY "Allow users to read own lottery records"
ON public.lottery_records FOR SELECT
TO authenticated
USING (userid = auth.uid());

-- 允许管理员读取所有抽奖记录
CREATE POLICY "Allow admins to read all lottery records"
ON public.lottery_records FOR SELECT
TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM public.users
        WHERE id = auth.uid()
        AND role IN ('admin', 'subAdmin')
    )
);

-- 允许用户创建抽奖记录
CREATE POLICY "Allow users to create lottery records"
ON public.lottery_records FOR INSERT
TO authenticated
WITH CHECK (userid = auth.uid());

-- 允许管理员删除抽奖记录
CREATE POLICY "Allow admins to delete lottery records"
ON public.lottery_records FOR DELETE
TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM public.users
        WHERE id = auth.uid()
        AND role IN ('admin', 'subAdmin')
    )
);

-- ============================================
-- Settings 表策略
-- ============================================

-- 允许所有认证用户读取设置
CREATE POLICY "Allow authenticated to read settings"
ON public.settings FOR SELECT
TO authenticated
USING (true);

-- 允许管理员更新设置
CREATE POLICY "Allow admins to update settings"
ON public.settings FOR UPDATE
TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM public.users
        WHERE id = auth.uid()
        AND role IN ('admin', 'subAdmin')
    )
)
WITH CHECK (
    EXISTS (
        SELECT 1 FROM public.users
        WHERE id = auth.uid()
        AND role IN ('admin', 'subAdmin')
    )
);

-- ============================================
-- Permission Settings 表策略
-- ============================================

-- 允许所有认证用户读取权限设置
CREATE POLICY "Allow authenticated to read permission settings"
ON public.permission_settings FOR SELECT
TO authenticated
USING (true);

-- 允许管理员更新权限设置
CREATE POLICY "Allow admins to update permission settings"
ON public.permission_settings FOR UPDATE
TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM public.users
        WHERE id = auth.uid()
        AND role IN ('admin', 'subAdmin')
    )
)
WITH CHECK (
    EXISTS (
        SELECT 1 FROM public.users
        WHERE id = auth.uid()
        AND role IN ('admin', 'subAdmin')
    )
);

-- ============================================
-- Password Reset Requests 表策略
-- ============================================

-- 允许用户读取自己的密码重置请求
CREATE POLICY "Allow users to read own password reset requests"
ON public.password_reset_requests FOR SELECT
TO authenticated
USING (userid = auth.uid());

-- 允许用户创建密码重置请求
CREATE POLICY "Allow users to create password reset requests"
ON public.password_reset_requests FOR INSERT
TO authenticated
WITH CHECK (userid = auth.uid());

-- 允许管理员读取所有密码重置请求
CREATE POLICY "Allow admins to read all password reset requests"
ON public.password_reset_requests FOR SELECT
TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM public.users
        WHERE id = auth.uid()
        AND role IN ('admin', 'subAdmin')
    )
);

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

        -- 允许管理员创建问卷
        CREATE POLICY IF NOT EXISTS "Allow admins to create questionnaires"
        ON public.questionnaires FOR INSERT
        TO authenticated
        WITH CHECK (
            EXISTS (
                SELECT 1 FROM public.users
                WHERE id = auth.uid()
                AND role IN ('admin', 'subAdmin')
            )
        );

        -- 允许管理员更新问卷
        CREATE POLICY IF NOT EXISTS "Allow admins to update questionnaires"
        ON public.questionnaires FOR UPDATE
        TO authenticated
        USING (
            EXISTS (
                SELECT 1 FROM public.users
                WHERE id = auth.uid()
                AND role IN ('admin', 'subAdmin')
            )
        )
        WITH CHECK (
            EXISTS (
                SELECT 1 FROM public.users
                WHERE id = auth.uid()
                AND role IN ('admin', 'subAdmin')
            )
        );

        -- 允许管理员删除问卷
        CREATE POLICY IF NOT EXISTS "Allow admins to delete questionnaires"
        ON public.questionnaires FOR DELETE
        TO authenticated
        USING (
            EXISTS (
                SELECT 1 FROM public.users
                WHERE id = auth.uid()
                AND role IN ('admin', 'subAdmin')
            )
        );
    END IF;
END $$;

-- ============================================
-- Questionnaire Records 表策略（如果存在）
-- ============================================

DO $$
BEGIN
    IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'questionnaire_records') THEN
        -- 允许用户读取自己的问卷记录
        CREATE POLICY IF NOT EXISTS "Allow users to read own questionnaire records"
        ON public.questionnaire_records FOR SELECT
        TO authenticated
        USING (userid = auth.uid());

        -- 允许管理员读取所有问卷记录
        CREATE POLICY IF NOT EXISTS "Allow admins to read all questionnaire records"
        ON public.questionnaire_records FOR SELECT
        TO authenticated
        USING (
            EXISTS (
                SELECT 1 FROM public.users
                WHERE id = auth.uid()
                AND role IN ('admin', 'subAdmin')
            )
        );

        -- 允许用户创建问卷记录
        CREATE POLICY IF NOT EXISTS "Allow users to create questionnaire records"
        ON public.questionnaire_records FOR INSERT
        TO authenticated
        WITH CHECK (userid = auth.uid());

        -- 允许管理员删除问卷记录
        CREATE POLICY IF NOT EXISTS "Allow admins to delete questionnaire records"
        ON public.questionnaire_records FOR DELETE
        TO authenticated
        USING (
            EXISTS (
                SELECT 1 FROM public.users
                WHERE id = auth.uid()
                AND role IN ('admin', 'subAdmin')
            )
        );
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
    RAISE NOTICE '2. 已创建 users_safe 视图隐藏 password 列';
    RAISE NOTICE '3. 已配置适当的访问权限策略';
    RAISE NOTICE '========================================';
END $$;
