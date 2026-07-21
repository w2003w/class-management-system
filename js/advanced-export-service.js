const AdvancedExportService = {
    initialized: false,
    exportFormats: ['csv', 'excel', 'pdf', 'json', 'xml'],
    
    async init() {
        if (this.initialized) return;
        
        this.initialized = true;
        console.log('[AdvancedExportService] 导出服务初始化完成');
    },
    
    async exportToCSV(data, options = {}) {
        const {
            filename = 'export',
            headers = null,
            delimiter = ',',
            includeHeaders = true,
            encoding = 'utf-8'
        } = options;
        
        console.log('[AdvancedExportService] 导出CSV...');
        
        try {
            const csvContent = this.generateCSV(data, headers, delimiter, includeHeaders);
            const BOM = '\uFEFF';
            const blob = new Blob([BOM + csvContent], { type: 'text/csv;charset=utf-8' });
            
            this.downloadBlob(blob, `${filename}.csv`);
            
            console.log('[AdvancedExportService] CSV导出成功');
            return { success: true, filename: `${filename}.csv` };
        } catch (error) {
            console.error('[AdvancedExportService] CSV导出失败:', error);
            return { success: false, error: error.message };
        }
    },
    
    generateCSV(data, headers, delimiter, includeHeaders) {
        if (!data || data.length === 0) {
            return '';
        }
        
        const headerRow = headers || Object.keys(data[0]);
        
        let csv = '';
        
        if (includeHeaders) {
            csv += headerRow.map(h => this.escapeCSVValue(h)).join(delimiter) + '\n';
        }
        
        data.forEach(row => {
            const values = headerRow.map(header => {
                const value = this.getNestedValue(row, header);
                return this.escapeCSVValue(value);
            });
            csv += values.join(delimiter) + '\n';
        });
        
        return csv;
    },
    
    escapeCSVValue(value) {
        if (value === undefined || value === null) {
            return '';
        }
        
        const str = String(value);
        
        if (str.includes(delimiter) || str.includes('"') || str.includes('\n')) {
            return `"${str.replace(/"/g, '""')}"`;
        }
        
        return str;
    },
    
    getNestedValue(obj, path) {
        if (!path) return '';
        return path.split('.').reduce((current, key) => {
            return current && current[key] !== undefined ? current[key] : '';
        }, obj);
    },
    
    async exportToExcel(data, options = {}) {
        const {
            filename = 'export',
            sheetName = 'Sheet1',
            headers = null,
            title = null
        } = options;
        
        console.log('[AdvancedExportService] 导出Excel...');
        
        try {
            const headerRow = headers || Object.keys(data[0] || {});
            const ws_data = [];
            
            if (title) {
                ws_data.push([title]);
                ws_data.push([]);
            }
            
            if (headers || data.length > 0) {
                ws_data.push(headerRow.map(h => this.formatHeader(h)));
            }
            
            data.forEach(row => {
                const rowData = headerRow.map(header => {
                    const value = this.getNestedValue(row, header);
                    return this.formatExcelValue(value);
                });
                ws_data.push(rowData);
            });
            
            const csvContent = ws_data.map(row => 
                row.map(cell => this.escapeCSVValue(cell)).join(',')
            ).join('\n');
            
            const BOM = '\uFEFF';
            const blob = new Blob([BOM + csvContent], { type: 'text/csv;charset=utf-8' });
            
            this.downloadBlob(blob, `${filename}.csv`);
            
            console.log('[AdvancedExportService] Excel导出成功');
            return { success: true, filename: `${filename}.csv` };
        } catch (error) {
            console.error('[AdvancedExportService] Excel导出失败:', error);
            return { success: false, error: error.message };
        }
    },
    
    formatHeader(key) {
        return key
            .replace(/_/g, ' ')
            .replace(/([A-Z])/g, ' $1')
            .replace(/^./, str => str.toUpperCase())
            .trim();
    },
    
    formatExcelValue(value) {
        if (value === undefined || value === null) {
            return '';
        }
        
        if (value instanceof Date) {
            return this.formatDate(value, 'YYYY-MM-DD HH:mm:ss');
        }
        
        if (typeof value === 'boolean') {
            return value ? '是' : '否';
        }
        
        if (typeof value === 'object') {
            return JSON.stringify(value);
        }
        
        return String(value);
    },
    
    formatDate(date, format = 'YYYY-MM-DD') {
        const d = typeof date === 'string' ? new Date(date) : date;
        
        const year = d.getFullYear();
        const month = String(d.getMonth() + 1).padStart(2, '0');
        const day = String(d.getDate()).padStart(2, '0');
        const hours = String(d.getHours()).padStart(2, '0');
        const minutes = String(d.getMinutes()).padStart(2, '0');
        const seconds = String(d.getSeconds()).padStart(2, '0');
        
        return format
            .replace('YYYY', year)
            .replace('MM', month)
            .replace('DD', day)
            .replace('HH', hours)
            .replace('mm', minutes)
            .replace('ss', seconds);
    },
    
    async exportToPDF(data, options = {}) {
        const {
            filename = 'export',
            title = '数据导出',
            headers = null,
            orientation = 'portrait',
            margins = { top: 20, right: 20, bottom: 20, left: 20 }
        } = options;
        
        console.log('[AdvancedExportService] 导出PDF...');
        
        try {
            const headerRow = headers || Object.keys(data[0] || {});
            
            let html = `
                <!DOCTYPE html>
                <html>
                <head>
                    <meta charset="UTF-8">
                    <title>${title}</title>
                    <style>
                        body {
                            font-family: Arial, sans-serif;
                            margin: ${margins.top}px ${margins.right}px ${margins.bottom}px ${margins.left}px;
                        }
                        h1 {
                            text-align: center;
                            color: #333;
                            margin-bottom: 20px;
                        }
                        table {
                            width: 100%;
                            border-collapse: collapse;
                            margin-bottom: 20px;
                        }
                        th, td {
                            border: 1px solid #ddd;
                            padding: 8px;
                            text-align: left;
                        }
                        th {
                            background-color: #f5f5f5;
                            font-weight: bold;
                        }
                        tr:nth-child(even) {
                            background-color: #fafafa;
                        }
                        .footer {
                            text-align: center;
                            color: #666;
                            font-size: 12px;
                            margin-top: 20px;
                        }
                    </style>
                </head>
                <body>
                    <h1>${title}</h1>
                    <table>
                        <thead>
                            <tr>
                                ${headerRow.map(h => `<th>${this.formatHeader(h)}</th>`).join('')}
                            </tr>
                        </thead>
                        <tbody>
                            ${data.map(row => `
                                <tr>
                                    ${headerRow.map(h => `<td>${this.formatExcelValue(this.getNestedValue(row, h))}</td>`).join('')}
                                </tr>
                            `).join('')}
                        </tbody>
                    </table>
                    <div class="footer">
                        导出时间: ${this.formatDate(new Date(), 'YYYY-MM-DD HH:mm:ss')}
                    </div>
                </body>
                </html>
            `;
            
            const printWindow = window.open('', '_blank');
            printWindow.document.write(html);
            printWindow.document.close();
            
            setTimeout(() => {
                printWindow.print();
            }, 500);
            
            console.log('[AdvancedExportService] PDF导出成功');
            return { success: true, filename: `${filename}.pdf` };
        } catch (error) {
            console.error('[AdvancedExportService] PDF导出失败:', error);
            return { success: false, error: error.message };
        }
    },
    
    async exportToJSON(data, options = {}) {
        const {
            filename = 'export',
            prettyPrint = true,
            encoding = 'utf-8'
        } = options;
        
        console.log('[AdvancedExportService] 导出JSON...');
        
        try {
            const jsonContent = prettyPrint 
                ? JSON.stringify(data, null, 2)
                : JSON.stringify(data);
            
            const blob = new Blob([jsonContent], { type: 'application/json;charset=utf-8' });
            
            this.downloadBlob(blob, `${filename}.json`);
            
            console.log('[AdvancedExportService] JSON导出成功');
            return { success: true, filename: `${filename}.json` };
        } catch (error) {
            console.error('[AdvancedExportService] JSON导出失败:', error);
            return { success: false, error: error.message };
        }
    },
    
    async exportToXML(data, options = {}) {
        const {
            filename = 'export',
            rootName = 'data',
            itemName = 'item'
        } = options;
        
        console.log('[AdvancedExportService] 导出XML...');
        
        try {
            let xml = '<?xml version="1.0" encoding="UTF-8"?>\n';
            xml += `<${rootName}>\n`;
            
            data.forEach(item => {
                xml += `  <${itemName}>\n`;
                for (const [key, value] of Object.entries(item)) {
                    const safeValue = String(value || '').replace(/&/g, '&amp;')
                        .replace(/</g, '&lt;')
                        .replace(/>/g, '&gt;')
                        .replace(/"/g, '&quot;')
                        .replace(/'/g, '&apos;');
                    xml += `    <${this.toXMLTag(key)}>${safeValue}</${this.toXMLTag(key)}>\n`;
                }
                xml += `  </${itemName}>\n`;
            });
            
            xml += `</${rootName}>`;
            
            const blob = new Blob([xml], { type: 'application/xml;charset=utf-8' });
            
            this.downloadBlob(blob, `${filename}.xml`);
            
            console.log('[AdvancedExportService] XML导出成功');
            return { success: true, filename: `${filename}.xml` };
        } catch (error) {
            console.error('[AdvancedExportService] XML导出失败:', error);
            return { success: false, error: error.message };
        }
    },
    
    toXMLTag(name) {
        return name
            .replace(/\s+/g, '_')
            .replace(/[^a-zA-Z0-9_]/g, '')
            .replace(/^(\d)/, '_$1');
    },
    
    downloadBlob(blob, filename) {
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = filename;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
    },
    
    async exportUsers(users, options = {}) {
        const data = users.map(user => ({
            username: user.username,
            email: user.email,
            role: this.getRoleName(user.role),
            department: user.department || '',
            class: user.class_name || '',
            status: this.getStatusName(user.status),
            created_at: this.formatDate(user.created_at, 'YYYY-MM-DD HH:mm')
        }));
        
        return this.exportToCSV(data, {
            filename: options.filename || 'users',
            headers: ['username', 'email', 'role', 'department', 'class', 'status', 'created_at']
        });
    },
    
    async exportAttendances(attendances, options = {}) {
        const data = attendances.map(att => ({
            name: att.name,
            type: this.getAttendanceTypeName(att.type),
            scope: this.getScopeName(att.scope),
            location: att.location_name || '',
            start_time: this.formatDate(att.start_time, 'YYYY-MM-DD HH:mm'),
            end_time: this.formatDate(att.end_time, 'YYYY-MM-DD HH:mm'),
            created_by: att.created_by
        }));
        
        return this.exportToCSV(data, {
            filename: options.filename || 'attendances',
            headers: ['name', 'type', 'scope', 'location', 'start_time', 'end_time', 'created_by']
        });
    },
    
    async exportWrongQuestions(questions, options = {}) {
        const data = questions.map(q => ({
            subject: q.subject_name || '',
            type: q.type_name || '',
            knowledge: q.knowledge_name || '',
            content: q.content || '',
            answer: q.answer || '',
            my_answer: q.my_answer || '',
            analysis: q.analysis || '',
            wrong_count: q.wrong_count || 0,
            mastered: q.mastered ? '已掌握' : '未掌握',
            created_at: this.formatDate(q.created_at, 'YYYY-MM-DD')
        }));
        
        return this.exportToCSV(data, {
            filename: options.filename || 'wrong_questions',
            headers: ['subject', 'type', 'knowledge', 'content', 'answer', 'my_answer', 'analysis', 'wrong_count', 'mastered', 'created_at']
        });
    },
    
    async exportGrades(records, options = {}) {
        const data = records.map(record => ({
            exam_name: record.exam_name || '',
            student_name: record.student_name || '',
            score: record.score || 0,
            submitted_at: this.formatDate(record.submitted_at, 'YYYY-MM-DD HH:mm')
        }));
        
        return this.exportToCSV(data, {
            filename: options.filename || 'grades',
            headers: ['exam_name', 'student_name', 'score', 'submitted_at']
        });
    },
    
    getRoleName(role) {
        const names = {
            admin: '管理员',
            subAdmin: '副管理员',
            member: '成员'
        };
        return names[role] || role;
    },
    
    getStatusName(status) {
        const names = {
            active: '启用',
            inactive: '禁用',
            banned: '封禁'
        };
        return names[status] || status;
    },
    
    getAttendanceTypeName(type) {
        const names = {
            normal: '普通签到',
            course: '课程签到',
            event: '活动签到'
        };
        return names[type] || type;
    },
    
    getScopeName(scope) {
        const names = {
            all: '全体成员',
            group: '指定分组',
            selected: '指定成员'
        };
        return names[scope] || scope;
    }
};

window.AdvancedExportService = AdvancedExportService;