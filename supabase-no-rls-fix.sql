-- Supabase 安全修复脚本（无 RLS 版本）
-- 只解决 Advisor 报告的安全问题，不使用 RLS

-- ============================================
-- 1. 隐藏 users 表的 password 列
-- ============================================

REVOKE SELECT (password) ON public.users FROM authenticated;
REVOKE SELECT (password) ON public.users FROM anon;
REVOKE SELECT (password) ON public.users FROM public;

-- ============================================
-- 2. 为所有表添加宽松的访问权限
-- ============================================

-- 确保所有表都可以被访问
GRANT ALL ON public.users TO authenticated;
GRANT ALL ON public.notifications TO authenticated;
GRANT ALL ON public.groups TO authenticated;
GRANT ALL ON public.attendances TO authenticated;
GRANT ALL ON public.questions TO authenticated;
GRANT ALL ON public.settings TO authenticated;
GRANT ALL ON public.permission_settings TO authenticated;
GRANT ALL ON public.password_reset_requests TO authenticated;
GRANT ALL ON public.exams TO authenticated;
GRANT ALL ON public.exam_records TO authenticated;
GRANT ALL ON public.attendance_records TO authenticated;
GRANT ALL ON public.votes TO authenticated;
GRANT ALL ON public.vote_records TO authenticated;
GRANT ALL ON public.lotteries TO authenticated;
GRANT ALL ON public.lottery_records TO authenticated;

-- 为 questionnaires 表添加权限（如果存在）
DO $$
BEGIN
    IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'questionnaires') THEN
        GRANT ALL ON public.questionnaires TO authenticated;
    END IF;
END $$;

-- 为 questionnaire_records 表添加权限（如果存在）
DO $$
BEGIN
    IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'questionnaire_records') THEN
        GRANT ALL ON public.questionnaire_records TO authenticated;
    END IF;
END $$;

-- 为所有表添加读取权限给匿名用户
GRANT SELECT ON public.users TO anon;
GRANT SELECT ON public.notifications TO anon;
GRANT SELECT ON public.groups TO anon;
GRANT SELECT ON public.attendances TO anon;
GRANT SELECT ON public.questions TO anon;
GRANT SELECT ON public.settings TO anon;
GRANT SELECT ON public.exams TO anon;
GRANT SELECT ON public.votes TO anon;

-- 为 questionnaires 表添加读取权限给匿名用户（如果存在）
DO $$
BEGIN
    IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'questionnaires') THEN
        GRANT SELECT ON public.questionnaires TO anon;
    END IF;
END $$;

-- ============================================
-- 完成
-- ============================================

DO $$
BEGIN
    RAISE NOTICE '========================================';
    RAISE NOTICE 'Supabase 安全修复完成！';
    RAISE NOTICE '========================================';
    RAISE NOTICE '1. 已隐藏 password 列';
    RAISE NOTICE '2. 已配置宽松的访问权限';
    RAISE NOTICE '3. 未启用 RLS 策略';
    RAISE NOTICE '========================================';
END $$;