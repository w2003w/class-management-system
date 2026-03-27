-- Supabase 数据库函数 - 用于高性能批量操作

-- 1. 批量提交考试答案函数
CREATE OR REPLACE FUNCTION submit_exam_answers(
    p_exam_id BIGINT,
    p_user_id BIGINT,
    p_answers JSONB
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_result JSONB;
BEGIN
    -- 使用 UPSERT 批量插入/更新
    INSERT INTO exam_records (examId, userId, answers, submittedAt)
    VALUES (p_exam_id, p_user_id, p_answers, NOW())
    ON CONFLICT (examId, userId)
    DO UPDATE SET
        answers = EXCLUDED.answers,
        submittedAt = EXCLUDED.submittedAt
    RETURNING to_jsonb(exam_records.*) INTO v_result;
    
    RETURN v_result;
END;
$$;

-- 2. 批量签到函数
CREATE OR REPLACE FUNCTION batch_attendance_sign(
    p_attendance_id BIGINT,
    p_user_ids BIGINT[],
    p_location JSONB DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_count INTEGER := 0;
    v_user_id BIGINT;
BEGIN
    FOREACH v_user_id IN ARRAY p_user_ids
    LOOP
        INSERT INTO attendance_records (attendanceId, userId, signedAt, location)
        VALUES (p_attendance_id, v_user_id, NOW(), p_location)
        ON CONFLICT (attendanceId, userId)
        DO UPDATE SET
            signedAt = EXCLUDED.signedAt,
            location = EXCLUDED.location
        WHERE attendance_records.attendanceId = p_attendance_id 
        AND attendance_records.userId = v_user_id;
        
        v_count := v_count + 1;
    END LOOP;
    
    RETURN jsonb_build_object(
        'success', true,
        'count', v_count
    );
END;
$$;

-- 3. 获取考试统计（优化版）
CREATE OR REPLACE FUNCTION get_exam_statistics(p_exam_id BIGINT)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_total INTEGER;
    v_submitted INTEGER;
    v_avg_score NUMERIC;
    v_max_score INTEGER;
    v_min_score INTEGER;
BEGIN
    SELECT 
        COUNT(*),
        COUNT(CASE WHEN submittedAt IS NOT NULL THEN 1 END),
        AVG(score),
        MAX(score),
        MIN(score)
    INTO v_total, v_submitted, v_avg_score, v_max_score, v_min_score
    FROM exam_records
    WHERE examId = p_exam_id;
    
    RETURN jsonb_build_object(
        'total', v_total,
        'submitted', v_submitted,
        'averageScore', ROUND(v_avg_score, 2),
        'maxScore', v_max_score,
        'minScore', v_min_score,
        'passRate', CASE 
            WHEN v_submitted > 0 THEN ROUND((v_submitted::NUMERIC / v_total) * 100, 2)
            ELSE 0 
        END
    );
END;
$$;

-- 4. 清理过期数据函数
CREATE OR REPLACE FUNCTION cleanup_old_data()
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_deleted_notifications INTEGER;
    v_deleted_attendance INTEGER;
BEGIN
    -- 删除30天前的已读通知
    DELETE FROM notifications 
    WHERE isRead = true 
    AND createdAt < NOW() - INTERVAL '30 days';
    GET DIAGNOSTICS v_deleted_notifications = ROW_COUNT;
    
    -- 删除1年前的签到记录
    DELETE FROM attendance_records 
    WHERE signedAt < NOW() - INTERVAL '1 year';
    GET DIAGNOSTICS v_deleted_attendance = ROW_COUNT;
    
    RETURN jsonb_build_object(
        'deletedNotifications', v_deleted_notifications,
        'deletedAttendanceRecords', v_deleted_attendance,
        'timestamp', NOW()
    );
END;
$$;

-- 5. 获取用户活动统计
CREATE OR REPLACE FUNCTION get_user_activity_stats(p_user_id BIGINT)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_exam_count INTEGER;
    v_attendance_count INTEGER;
    v_vote_count INTEGER;
BEGIN
    SELECT COUNT(*) INTO v_exam_count
    FROM exam_records WHERE userId = p_user_id;
    
    SELECT COUNT(*) INTO v_attendance_count
    FROM attendance_records WHERE userId = p_user_id;
    
    SELECT COUNT(*) INTO v_vote_count
    FROM vote_records WHERE userId = p_user_id;
    
    RETURN jsonb_build_object(
        'examCount', v_exam_count,
        'attendanceCount', v_attendance_count,
        'voteCount', v_vote_count,
        'totalActivities', v_exam_count + v_attendance_count + v_vote_count
    );
END;
$$;

-- 6. 批量插入用户（用于导入）
CREATE OR REPLACE FUNCTION batch_insert_users(p_users JSONB)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_user JSONB;
    v_count INTEGER := 0;
    v_errors JSONB := '[]'::JSONB;
BEGIN
    FOR v_user IN SELECT * FROM jsonb_array_elements(p_users)
    LOOP
        BEGIN
            INSERT INTO users (username, password, name, role, status, groupId, createdAt)
            VALUES (
                v_user->>'username',
                v_user->>'password',
                v_user->>'name',
                COALESCE(v_user->>'role', 'user'),
                COALESCE(v_user->>'status', 'active'),
                (v_user->>'groupId')::BIGINT,
                NOW()
            );
            v_count := v_count + 1;
        EXCEPTION WHEN OTHERS THEN
            v_errors := v_errors || jsonb_build_object(
                'username', v_user->>'username',
                'error', SQLERRM
            );
        END;
    END LOOP;
    
    RETURN jsonb_build_object(
        'success', true,
        'inserted', v_count,
        'errors', v_errors
    );
END;
$$;

-- 7. 获取实时在线人数（基于最近活动）
CREATE OR REPLACE FUNCTION get_online_users(p_minutes INTEGER DEFAULT 5)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_count INTEGER;
BEGIN
    -- 统计最近有活动的用户
    SELECT COUNT(DISTINCT userId) INTO v_count
    FROM (
        SELECT userId FROM exam_records 
        WHERE submittedAt > NOW() - (p_minutes || ' minutes')::INTERVAL
        UNION
        SELECT userId FROM attendance_records 
        WHERE signedAt > NOW() - (p_minutes || ' minutes')::INTERVAL
        UNION
        SELECT userId FROM vote_records 
        WHERE createdAt > NOW() - (p_minutes || ' minutes')::INTERVAL
    ) recent_activity;
    
    RETURN v_count;
END;
$$;

-- 8. 优化查询：获取带缓存的统计数据
CREATE OR REPLACE FUNCTION get_cached_stats()
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_result JSONB;
BEGIN
    -- 使用物化视图或临时表缓存统计数据
    SELECT data INTO v_result
    FROM stats_cache
    WHERE key = 'dashboard_stats'
    AND updated_at > NOW() - INTERVAL '1 minute';
    
    IF v_result IS NULL THEN
        -- 重新计算
        SELECT jsonb_build_object(
            'userCount', (SELECT COUNT(*) FROM users),
            'examCount', (SELECT COUNT(*) FROM exams),
            'attendanceCount', (SELECT COUNT(*) FROM attendances),
            'voteCount', (SELECT COUNT(*) FROM votes),
            'onlineUsers', get_online_users(5),
            'timestamp', NOW()
        ) INTO v_result;
        
        -- 更新缓存
        INSERT INTO stats_cache (key, data, updated_at)
        VALUES ('dashboard_stats', v_result, NOW())
        ON CONFLICT (key)
        DO UPDATE SET data = EXCLUDED.data, updated_at = EXCLUDED.updated_at;
    END IF;
    
    RETURN v_result;
END;
$$;

-- 创建统计缓存表
CREATE TABLE IF NOT EXISTS stats_cache (
    key TEXT PRIMARY KEY,
    data JSONB NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 创建索引
CREATE INDEX IF NOT EXISTS idx_stats_cache_updated ON stats_cache(updated_at);

-- 添加RLS策略
ALTER TABLE stats_cache ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow all access" ON stats_cache FOR ALL USING (true) WITH CHECK (true);
