const PDFReadingService = {
    IDLE_TIMEOUT: 60, // 1分钟无操作暂停计时
    
    // ==================== PDF文件管理 ====================
    
    async uploadPdf(file, uploadedBy) {
        const arrayBuffer = await file.arrayBuffer();
        const base64 = this._arrayBufferToBase64(arrayBuffer);
        
        const { data, error } = await SupabaseService.supabase
            .from('pdf_files')
            .insert({
                file_name: file.name,
                file_data: base64,
                file_size: file.size,
                uploaded_by: uploadedBy,
                created_at: new Date().toISOString()
            })
            .select()
            .single();
        
        if (error) throw error;
        return data;
    },
    
    async getAllPdfs() {
        const { data, error } = await SupabaseService.supabase
            .from('pdf_files')
            .select('*')
            .order('created_at', { ascending: false });
        
        if (error) throw error;
        return data;
    },
    
    async getPdfById(id) {
        const { data, error } = await SupabaseService.supabase
            .from('pdf_files')
            .select('*')
            .eq('id', id)
            .single();
        
        if (error) throw error;
        return data;
    },
    
    async deletePdf(id) {
        const { error } = await SupabaseService.supabase
            .from('pdf_files')
            .delete()
            .eq('id', id);
        
        if (error) throw error;
    },
    
    // ==================== 权限管理 ====================
    
    async grantPermission(pdfId, userSessionId, userName = null) {
        const { data, error } = await SupabaseService.supabase
            .from('pdf_permissions')
            .upsert({
                pdf_id: pdfId,
                user_session_id: userSessionId,
                user_name: userName,
                can_read: true,
                granted_at: new Date().toISOString()
            }, { onConflict: 'pdf_id,user_session_id' })
            .select();
        
        if (error) throw error;
        return data;
    },
    
    async revokePermission(pdfId, userSessionId) {
        const { error } = await SupabaseService.supabase
            .from('pdf_permissions')
            .update({ can_read: false })
            .eq('pdf_id', pdfId)
            .eq('user_session_id', userSessionId);
        
        if (error) throw error;
    },
    
    async getPdfPermissions(pdfId) {
        const { data, error } = await SupabaseService.supabase
            .from('pdf_permissions')
            .select('*')
            .eq('pdf_id', pdfId)
            .eq('can_read', true);
        
        if (error) throw error;
        return data;
    },
    
    async getUserPermissions(userSessionId) {
        const { data, error } = await SupabaseService.supabase
            .from('pdf_permissions')
            .select('pdf_id, user_name, can_read')
            .eq('user_session_id', userSessionId)
            .eq('can_read', true);
        
        if (error) throw error;
        return data;
    },
    
    async checkPermission(pdfId, userSessionId) {
        const { data, error } = await SupabaseService.supabase
            .from('pdf_permissions')
            .select('id')
            .eq('pdf_id', pdfId)
            .eq('user_session_id', userSessionId)
            .eq('can_read', true)
            .single();
        
        if (error) return false;
        return !!data;
    },
    
    // ==================== 阅读会话 ====================
    
    async startReadingSession(pdfId, userSessionId, userName = null) {
        const now = new Date().toISOString();
        
        const { data, error } = await SupabaseService.supabase
            .from('pdf_reading_sessions')
            .insert({
                pdf_id: pdfId,
                user_session_id: userSessionId,
                user_name: userName,
                start_time: now,
                status: 'active'
            })
            .select()
            .single();
        
        if (error) throw error;
        
        if (data) {
            await this._addReadingLog(data.id, 'start', 0);
        }
        
        return data;
    },
    
    async pauseReadingSession(sessionId, durationSeconds) {
        const now = new Date().toISOString();
        
        const { error } = await SupabaseService.supabase
            .from('pdf_reading_sessions')
            .update({
                end_time: now,
                duration_seconds: durationSeconds,
                status: 'paused'
            })
            .eq('id', sessionId);
        
        if (error) throw error;
        await this._addReadingLog(sessionId, 'pause', durationSeconds);
    },
    
    async stopReadingSession(sessionId, durationSeconds) {
        const now = new Date().toISOString();
        
        const { error } = await SupabaseService.supabase
            .from('pdf_reading_sessions')
            .update({
                end_time: now,
                duration_seconds: durationSeconds,
                status: 'completed'
            })
            .eq('id', sessionId);
        
        if (error) throw error;
        await this._addReadingLog(sessionId, 'stop', durationSeconds);
    },
    
    async abandonReadingSession(sessionId, durationSeconds) {
        const now = new Date().toISOString();
        
        const { error } = await SupabaseService.supabase
            .from('pdf_reading_sessions')
            .update({
                end_time: now,
                duration_seconds: durationSeconds,
                status: 'abandoned'
            })
            .eq('id', sessionId);
        
        if (error) throw error;
        await this._addReadingLog(sessionId, 'abandon', durationSeconds);
    },
    
    async getActiveSession(userSessionId, pdfId) {
        const { data, error } = await SupabaseService.supabase
            .from('pdf_reading_sessions')
            .select('*')
            .eq('user_session_id', userSessionId)
            .eq('pdf_id', pdfId)
            .eq('status', 'active')
            .order('start_time', { ascending: false })
            .limit(1);
        
        if (error) throw error;
        return data && data.length > 0 ? data[0] : null;
    },
    
    async _addReadingLog(sessionId, action, durationSeconds) {
        await SupabaseService.supabase
            .from('pdf_reading_logs')
            .insert({
                session_id: sessionId,
                action: action,
                duration_seconds: durationSeconds,
                created_at: new Date().toISOString()
            });
    },
    
    // ==================== 阅读统计 ====================
    
    async updateReadingStats(userSessionId, pdfId, durationSeconds) {
        const now = new Date().toISOString();
        
        // 检查是否已有记录
        const { data: existing } = await SupabaseService.supabase
            .from('pdf_reading_stats')
            .select('*')
            .eq('user_session_id', userSessionId)
            .eq('pdf_id', pdfId)
            .single();
        
        if (existing) {
            const newTotal = (existing.total_reading_seconds || 0) + durationSeconds;
            const newCount = (existing.read_count || 0) + 1;
            
            await SupabaseService.supabase
                .from('pdf_reading_stats')
                .update({
                    total_reading_seconds: newTotal,
                    last_read_at: now,
                    read_count: newCount
                })
                .eq('id', existing.id);
        } else {
            await SupabaseService.supabase
                .from('pdf_reading_stats')
                .insert({
                    user_session_id: userSessionId,
                    pdf_id: pdfId,
                    total_reading_seconds: durationSeconds,
                    last_read_at: now,
                    read_count: 1
                });
        }
    },
    
    async getUserReadingStats(userSessionId) {
        const { data, error } = await SupabaseService.supabase
            .from('pdf_reading_stats')
            .select(`
                *,
                pdf_files (file_name)
            `)
            .eq('user_session_id', userSessionId)
            .order('last_read_at', { ascending: false });
        
        if (error) throw error;
        return data;
    },
    
    async getPdfReadingStats(pdfId) {
        const { data, error } = await SupabaseService.supabase
            .from('pdf_reading_stats')
            .select('*')
            .eq('pdf_id', pdfId)
            .order('total_reading_seconds', { ascending: false });
        
        if (error) throw error;
        return data;
    },
    
    async getAllReadingStats() {
        const { data, error } = await SupabaseService.supabase
            .from('pdf_reading_stats')
            .select(`
                *,
                pdf_files (file_name)
            `)
            .order('last_read_at', { ascending: false });
        
        if (error) throw error;
        return data;
    },
    
    // ==================== 工具函数 ====================
    
    _arrayBufferToBase64(buffer) {
        let binary = '';
        const bytes = new Uint8Array(buffer);
        for (let i = 0; i < bytes.byteLength; i++) {
            binary += String.fromCharCode(bytes[i]);
        }
        return btoa(binary);
    },
    
    _base64ToArrayBuffer(base64) {
        const binaryString = atob(base64);
        const bytes = new Uint8Array(binaryString.length);
        for (let i = 0; i < binaryString.length; i++) {
            bytes[i] = binaryString.charCodeAt(i);
        }
        return bytes.buffer;
    },
    
    formatDuration(seconds) {
        if (seconds < 60) {
            return `${seconds}秒`;
        } else if (seconds < 3600) {
            const minutes = Math.floor(seconds / 60);
            const secs = seconds % 60;
            return `${minutes}分${secs}秒`;
        } else {
            const hours = Math.floor(seconds / 3600);
            const minutes = Math.floor((seconds % 3600) / 60);
            const secs = seconds % 60;
            return `${hours}时${minutes}分${secs}秒`;
        }
    }
};

// 初始化检查
if (typeof SupabaseService !== 'undefined' && SupabaseService.initialized) {
    console.log('PDFReadingService initialized');
}
