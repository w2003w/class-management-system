# Supabase 数据库优化方案

## 1. 添加数据库索引

在 Supabase SQL Editor 中执行：

```sql
-- 用户表索引
CREATE INDEX IF NOT EXISTS idx_users_username ON users(username);
CREATE INDEX IF NOT EXISTS idx_users_role ON users(role);
CREATE INDEX IF NOT EXISTS idx_users_status ON users(status);
CREATE INDEX IF NOT EXISTS idx_users_groupid ON users(groupId);

-- 考试记录索引
CREATE INDEX IF NOT EXISTS idx_exam_records_examid ON exam_records(examId);
CREATE INDEX IF NOT EXISTS idx_exam_records_userid ON exam_records(userId);
CREATE INDEX IF NOT EXISTS idx_exam_records_submittedat ON exam_records(submittedAt);

-- 投票记录索引
CREATE INDEX IF NOT EXISTS idx_vote_records_voteid ON vote_records(voteId);
CREATE INDEX IF NOT EXISTS idx_vote_records_userid ON vote_records(userId);

-- 签到记录索引
CREATE INDEX IF NOT EXISTS idx_attendance_records_attendanceid ON attendance_records(attendanceId);
CREATE INDEX IF NOT EXISTS idx_attendance_records_userid ON attendance_records(userId);
CREATE INDEX IF NOT EXISTS idx_attendance_records_signedat ON attendance_records(signedAt);

-- 抽奖记录索引
CREATE INDEX IF NOT EXISTS idx_lottery_records_lotteryid ON lottery_records(lotteryId);
CREATE INDEX IF NOT EXISTS idx_lottery_records_userid ON lottery_records(userId);

-- 问卷记录索引
CREATE INDEX IF NOT EXISTS idx_questionnaire_records_questionnaireid ON questionnaire_records(questionnaireid);
CREATE INDEX IF NOT EXISTS idx_questionnaire_records_userid ON questionnaire_records(userid);

-- 通知索引
CREATE INDEX IF NOT EXISTS idx_notifications_userid ON notifications(userId);
CREATE INDEX IF NOT EXISTS idx_notifications_createdat ON notifications(createdAt DESC);
CREATE INDEX IF NOT EXISTS idx_notifications_isread ON notifications(userId, isRead);
```

## 2. 启用连接池（PgBouncer）

Supabase 默认已启用 PgBouncer，无需额外配置。

## 3. 设置合理的 RLS 策略

```sql
-- 为高频查询添加索引以优化 RLS
CREATE INDEX IF NOT EXISTS idx_users_id_role ON users(id, role);
```

## 4. 数据库清理策略

```sql
-- 定期清理过期数据（可以设置定时任务）
-- 清理30天前的已读通知
DELETE FROM notifications 
WHERE isRead = true 
AND createdAt < NOW() - INTERVAL '30 days';

-- 清理1年前的签到记录
DELETE FROM attendance_records 
WHERE signedAt < NOW() - INTERVAL '1 year';
```
