import streamlit as st
import base64
import time
import datetime
import db

st.set_page_config(page_title="PDF阅读追踪", layout="wide", initial_sidebar_state="expanded")

IDLE_TIMEOUT = 60  # 1分钟无操作则停止计时


def format_duration(seconds):
    """格式化时长"""
    if seconds < 60:
        return f"{seconds}秒"
    elif seconds < 3600:
        minutes = seconds // 60
        secs = seconds % 60
        return f"{minutes}分{secs}秒"
    else:
        hours = seconds // 3600
        minutes = (seconds % 3600) // 60
        secs = seconds % 60
        return f"{hours}时{minutes}分{secs}秒"


def get_user_session_id():
    """获取当前用户的session_id"""
    if 'user_session_id' not in st.session_state:
        import uuid
        st.session_state.user_session_id = str(uuid.uuid4())
    return st.session_state.user_session_id


def pdf_reader_page():
    st.title("📖 PDF阅读中心")
    
    user_session_id = get_user_session_id()
    
    st.sidebar.markdown("### 用户信息")
    st.sidebar.write(f"Session ID: {user_session_id[:12]}...")
    
    tab1, tab2 = st.tabs(["📚 我的PDF", "📊 我的阅读统计"])
    
    with tab1:
        st.header("我可以阅读的PDF")
        
        permissions = db.get_user_pdf_permissions(user_session_id)
        
        if not permissions:
            st.warning("您暂无权限阅读任何PDF，请联系管理员")
        else:
            pdf_list = []
            for perm in permissions:
                pdf = db.get_pdf_by_id(perm['pdf_id'])
                if pdf:
                    pdf_list.append(pdf)
            
            if pdf_list:
                selected_pdf_id = st.selectbox(
                    "选择要阅读的PDF",
                    options=[pdf['id'] for pdf in pdf_list],
                    format_func=lambda x: next(f"{p['file_name']} ({p['file_size']/1024:.1f}KB)" for p in pdf_list if p['id'] == x),
                    key="pdf_select"
                )
                
                if selected_pdf_id:
                    selected_pdf = db.get_pdf_by_id(selected_pdf_id)
                    if selected_pdf:
                        st.markdown("---")
                        
                        if 'reading_state' not in st.session_state:
                            st.session_state.reading_state = {}
                        
                        state_key = f"pdf_{selected_pdf_id}"
                        if state_key not in st.session_state.reading_state:
                            st.session_state.reading_state[state_key] = {
                                'is_reading': False,
                                'session_id': None,
                                'start_time': None,
                                'last_activity': None,
                                'accumulated_time': 0,
                                'paused': False
                            }
                        
                        state = st.session_state.reading_state[state_key]
                        
                        col1, col2, col3 = st.columns(3)
                        with col1:
                            st.metric("阅读状态", "📖 阅读中" if state['is_reading'] else "⏸️ 未开始")
                        with col2:
                            current_time = state['accumulated_time']
                            if state['is_reading'] and not state['paused']:
                                elapsed = int(time.time() - state['last_activity'])
                                current_time += elapsed
                            st.metric("本次阅读时长", format_duration(current_time))
                        with col3:
                            if state['last_activity'] and state['is_reading']:
                                idle_time = int(time.time() - state['last_activity'])
                                if idle_time > IDLE_TIMEOUT:
                                    st.metric("闲置时间", f"{idle_time}秒 (已超时)")
                                else:
                                    st.metric("闲置时间", f"{idle_time}秒")
                            else:
                                st.metric("闲置时间", "-")
                        
                        st.markdown("---")
                        
                        idle_time = 0
                        if state['is_reading'] and state['last_activity']:
                            idle_time = int(time.time() - state['last_activity'])
                        
                        if state['is_reading'] and idle_time > IDLE_TIMEOUT:
                            st.warning(f"⏰ 您已闲置超过{IDLE_TIMEOUT}秒，计时已暂停。点击'继续阅读'恢复计时。")
                            state['paused'] = True
                        
                        pdf_display_col, control_col = st.columns([3, 1])
                        
                        with pdf_display_col:
                            st.markdown("#### 📄 PDF内容预览")
                            st.info("请在下方查看PDF内容，阅读时保持页面活跃以继续计时")
                            
                            try:
                                pdf_bytes = base64.b64decode(selected_pdf['file_data'])
                                st.download_button(
                                    label="📥 下载PDF文件",
                                    data=pdf_bytes,
                                    file_name=selected_pdf['file_name'],
                                    mime="application/pdf",
                                    key="download_pdf"
                                )
                            except Exception as e:
                                st.error(f"无法加载PDF: {e}")
                        
                        with control_col:
                            st.markdown("#### ⏱️ 阅读控制")
                            
                            if not state['is_reading']:
                                if st.button("▶️ 开始阅读", key="start_reading", type="primary"):
                                    session = db.start_reading_session(selected_pdf_id, user_session_id)
                                    if session:
                                        state['is_reading'] = True
                                        state['session_id'] = session['id']
                                        state['start_time'] = time.time()
                                        state['last_activity'] = time.time()
                                        state['accumulated_time'] = 0
                                        state['paused'] = False
                                        st.success("✅ 阅读已开始，计时器已启动")
                                        st.rerun()
                            
                            elif state['paused']:
                                if st.button("▶️ 继续阅读", key="resume_reading", type="primary"):
                                    state['paused'] = False
                                    state['last_activity'] = time.time()
                                    st.success("✅ 计时已恢复")
                                    st.rerun()
                            
                            else:
                                if st.button("⏸️ 暂停阅读", key="pause_reading"):
                                    elapsed = int(time.time() - state['last_activity'])
                                    state['accumulated_time'] += elapsed
                                    state['paused'] = True
                                    
                                    if state['session_id']:
                                        db.pause_reading_session(state['session_id'], state['accumulated_time'])
                                    
                                    st.info("⏸️ 已暂停，继续阅读时恢复计时")
                                    st.rerun()
                            
                            st.markdown("---")
                            
                            if state['is_reading']:
                                if st.button("⏹️ 结束阅读", key="stop_reading"):
                                    elapsed = int(time.time() - state['last_activity'])
                                    state['accumulated_time'] += elapsed
                                    
                                    if state['session_id']:
                                        db.stop_reading_session(state['session_id'], state['accumulated_time'])
                                    
                                    db.update_reading_stats(user_session_id, selected_pdf_id, state['accumulated_time'])
                                    
                                    state['is_reading'] = False
                                    state['session_id'] = None
                                    state['start_time'] = None
                                    state['last_activity'] = None
                                    state['accumulated_time'] = 0
                                    state['paused'] = False
                                    
                                    st.success("✅ 阅读会话已结束，时长已保存")
                                    st.rerun()
                            
                            st.markdown("---")
                            st.caption("💡 提示：1分钟无操作将自动暂停计时")
                        
                        st.markdown("---")
                        st.markdown("#### 📱 移动端提示")
                        st.info("在手机上阅读时，请保持页面活跃状态。滑动屏幕或点击按钮可重置闲置计时器。")
            
            st.markdown("---")
            st.subheader("操作提示")
            st.success("✅ 每次阅读新PDF或切换PDF时，请点击'开始阅读'按钮启动计时")
            st.info("💡 系统会在您关闭页面或结束阅读时自动保存阅读时长")
    
    with tab2:
        st.header("我的阅读统计")
        
        stats = db.get_user_reading_stats(user_session_id)
        
        if stats:
            total_reading = sum(s.get('total_reading_seconds', 0) for s in stats)
            total_reads = sum(s.get('read_count', 0) for s in stats)
            pdfs_read = len(stats)
            
            col1, col2, col3 = st.columns(3)
            with col1:
                st.metric("总阅读时长", format_duration(total_reading))
            with col2:
                st.metric("总阅读次数", total_reads)
            with col3:
                st.metric("阅读PDF数量", pdfs_read)
            
            st.markdown("---")
            st.subheader("各PDF阅读详情")
            
            for stat in stats:
                pdf_name = stat.get('pdf_files', {}).get('file_name', '未知PDF') if isinstance(stat.get('pdf_files'), dict) else '未知PDF'
                with st.expander(f"📄 {pdf_name}"):
                    col1, col2, col3 = st.columns(3)
                    with col1:
                        st.metric("阅读时长", format_duration(stat.get('total_reading_seconds', 0)))
                    with col2:
                        st.metric("阅读次数", stat.get('read_count', 0))
                    with col3:
                        last_read = stat.get('last_read_at', 'N/A')
                        if last_read:
                            st.metric("最后阅读", last_read[:16] if len(last_read) >= 16 else last_read)
        else:
            st.info("暂无阅读记录，快去选择一本PDF开始阅读吧！")


if __name__ == "__main__":
    pdf_reader_page()
