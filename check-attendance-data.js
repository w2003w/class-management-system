// 检查本地存储中的签到记录
console.log('=== 检查本地存储中的签到记录 ===');

// 读取本地存储中的签到记录
const attendanceRecords = JSON.parse(localStorage.getItem('attendanceRecords') || '[]');
console.log('签到记录数量:', attendanceRecords.length);

// 检查每条记录的结构
if (attendanceRecords.length > 0) {
    console.log('\n=== 第一条记录结构 ===');
    console.log(attendanceRecords[0]);
    
    // 检查是否有 signTime 字段
    console.log('\n=== 检查字段 ===');
    attendanceRecords.forEach((record, index) => {
        console.log(`记录 ${index + 1}:`);
        console.log(`  有 signTime:`, 'signTime' in record);
        console.log(`  有 createdAt:`, 'createdAt' in record);
        console.log(`  signTime 值:`, record.signTime);
        console.log(`  createdAt 值:`, record.createdAt);
    });
}

// 测试日期比较
console.log('\n=== 测试日期比较 ===');
const today = new Date();
const todayStr = today.toDateString();
console.log('今天的日期字符串:', todayStr);

// 测试记录中的日期
if (attendanceRecords.length > 0) {
    attendanceRecords.forEach((record, index) => {
        const recordDate = record.signTime || record.createdAt;
        if (recordDate) {
            const recordDateStr = new Date(recordDate).toDateString();
            console.log(`记录 ${index + 1} 日期字符串:`, recordDateStr);
            console.log(`是否与今天相同:`, recordDateStr === todayStr);
        }
    });
}

// 测试本周日期范围
console.log('\n=== 测试本周日期范围 ===');
const days = ['周一', '周二', '周三', '周四', '周五', '周六', '周日'];
const weekStart = new Date(today);
const dayOfWeek = today.getDay();
const diff = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
weekStart.setDate(today.getDate() + diff);

console.log('本周一:', weekStart.toDateString());

// 计算本周每天的日期
const weekDates = days.map((_, index) => {
    const date = new Date(weekStart);
    date.setDate(weekStart.getDate() + index);
    return date.toDateString();
});

console.log('本周日期范围:', weekDates);

// 测试过滤逻辑
console.log('\n=== 测试过滤逻辑 ===');
const filteredRecords = attendanceRecords.filter(r => {
    const recordDate = r.signTime || r.signedAt || r.checkInTime || r.createdAt;
    if (!recordDate) return false;
    const recordDateStr = new Date(recordDate).toDateString();
    return weekDates.includes(recordDateStr);
});

console.log('本周签到记录数量:', filteredRecords.length);
console.log('本周签到记录:', filteredRecords);