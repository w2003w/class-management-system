import streamlit as st
import base64
import time
import pandas as pd
import db

st.set_page_config(page_title="PDF阅读追踪 - 管理员", layout="wide", initial_sidebar_state="expanded")


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


def pdf_admin_page():
    st.title("📚 PDF阅读追踪 - 管理员控制台")
    
    if 'admin_session_id' not in st.session_state:
        import uuid
        st.session_state.admin_session_id = f"admin_{str(uuid.uuid4())[:8]}"
    
    admin_session_id = st.session_state.admin_session_id
    
    tab1, tab2, tab3 = st.tabs(["📤 PDF上传与管理", "👥 权限管理", "📊 阅读统计"])
    
    with tab1:
        st.header("PDF文件管理")
        
        uploaded_file = st.file_uploader("上传PDF文件", type=['pdf'])
        if uploaded_file:
            file_bytes = uploaded_file.read()
            file_size = len(file_bytes)
            file_data_b64 = base64.b64encode(file_bytes).decode('utf-8')
            
            col1, col2, col3 = st.columns(3)
            with col1:
                st.metric("文件名", uploaded_file.name)
            with col2:
                st.metric("文件大小", f"{file_size / 1024:.1f} KB")
            with col3:
                st.metric("编码大小", f"{len(file_data_b64) / 1024:.1f} KB")
            
            if st.button("确认上传", key="confirm_upload"):
                result = db.upload_pdf(
                    uploaded_file.name,
                    file_data_b64,
                    file_size,
                    admin_session_id
                )
                if result:
                    st.success(f"✅ PDF上传成功！ID: {result['id']}")
                    st.rerun()
                else:
                    st.error("❌ 上传失败")
        
        st.markdown("---")
        st.subheader("已上传的PDF文件")
        
        pdfs = db.get_all_pdfs()
        if pdfs:
            for pdf in pdfs:
                with st.expander(f"📄 {pdf['file_name']} (ID: {pdf['id']})"):
                    col1, col2, col3 = st.columns(3)
                    with col1:
                        st.metric("文件大小", f"{pdf['file_size'] / 1024:.1f} KB")
                    with col2:
                        st.metric("上传时间", pdf.get('created_at', 'N/A')[:19] if pdf.get('created_at') else 'N/A')
                    with col3:
                        permissions = db.get_pdf_permissions(pdf['id'])
                        active_permissions = [p for p in permissions if p.get('can_read')]
                        st.metric("授权人数", len(active_permissions))
                    
                    col4, col5 = st.columns(2)
                    with col4:
                        if st.button("删除此PDF", key=f"delete_{pdf['id']}"):
                            db.delete_pdf(pdf['id'])
                            st.success("已删除")
                            st.rerun()
                    with col5:
                        if st.button("查看授权", key=f"view_perm_{pdf['id']}"):
                            st.session_state['view_permissions_pdf_id'] = pdf['id']
                            st.rerun()
        else:
            st.info("暂无PDF文件，请上传")
    
    with tab2:
        st.header("权限管理")
        
        pdfs = db.get_all_pdfs()
        if not pdfs:
            st.warning("请先上传PDF文件")
        else:
            selected_pdf_id = st.selectbox(
                "选择PDF文件",
                options=[pdf['id'] for pdf in pdfs],
                format_func=lambda x: next(f"{p['file_name']}" for p in pdfs if p['id'] == x),
                key="perm_pdf_select"
            )
            
            if selected_pdf_id:
                selected_pdf = db.get_pdf_by_id(selected_pdf_id)
                if selected_pdf:
                    st.info(f"当前选择：{selected_pdf['file_name']}")
                    
                    st.subheader("授权新用户")
                    new_user_id = st.text_input("用户Session ID", key="new_user_id", placeholder="用户的session_id")
                    new_user_name = st.text_input("用户名（可选）", key="new_user_name", placeholder="用户昵称")
                    
                    if st.button("授权用户", key="grant_perm"):
                        if new_user_id:
                            db.grant_pdf_permission(selected_pdf_id, new_user_id, new_user_name or None)
                            st.success(f"✅ 已授权用户 {new_user_id[:8]}...")
                            st.rerun()
                        else:
                            st.warning("请输入用户Session ID")
                    
                    st.markdown("---")
                    st.subheader("当前授权用户列表")
                    
                    permissions = db.get_pdf_permissions(selected_pdf_id)
                    active_perms = [p for p in permissions if p.get('can_read')]
                    
                    if active_perms:
                        for perm in active_perms:
                            col1, col2, col3 = st.columns([3, 2, 1])
                            with col1:
                                st.write(f"👤 {perm.get('user_name', perm['user_session_id'][:8])}")
                            with col2:
                                st.write(f"ID: {perm['user_session_id'][:8]}...")
                            with col3:
                                if st.button("撤销", key=f"revoke_{perm['id']}"):
                                    db.revoke_pdf_permission(selected_pdf_id, perm['user_session_id'])
                                    st.success("已撤销")
                                    st.rerun()
                    else:
                        st.info("暂无授权用户")
    
    with tab3:
        st.header("阅读统计")
        
        stats = db.get_all_reading_stats()
        
        if stats:
            col1, col2, col3 = st.columns(3)
            with col1:
                total_reading = sum(s.get('total_reading_seconds', 0) for s in stats)
                st.metric("总阅读时长", format_duration(total_reading))
            with col2:
                total_reads = sum(s.get('read_count', 0) for s in stats)
                st.metric("总阅读次数", total_reads)
            with col3:
                unique_users = len(set(s['user_session_id'] for s in stats))
                st.metric("阅读人数", unique_users)
            
            st.markdown("---")
            
            tab_pdf, tab_user = st.tabs(["按PDF查看", "按用户查看"])
            
            with tab_pdf:
                pdf_stats = {}
                for stat in stats:
                    pdf_name = stat.get('pdf_files', {}).get('file_name', '未知PDF') if isinstance(stat.get('pdf_files'), dict) else '未知PDF'
                    if pdf_name not in pdf_stats:
                        pdf_stats[pdf_name] = {'total_seconds': 0, 'reads': 0, 'users': set()}
                    pdf_stats[pdf_name]['total_seconds'] += stat.get('total_reading_seconds', 0)
                    pdf_stats[pdf_name]['reads'] += stat.get('read_count', 0)
                    pdf_stats[pdf_name]['users'].add(stat['user_session_id'])
                
                for pdf_name, data in pdf_stats.items():
                    with st.expander(f"📄 {pdf_name}"):
                        col1, col2, col3 = st.columns(3)
                        with col1:
                            st.metric("总阅读时长", format_duration(data['total_seconds']))
                        with col2:
                            st.metric("阅读次数", data['reads'])
                        with col3:
                            st.metric("阅读人数", len(data['users']))
                
                st.markdown("---")
                st.subheader("详细统计表格")
                table_data = []
                for stat in stats:
                    pdf_name = stat.get('pdf_files', {}).get('file_name', '未知') if isinstance(stat.get('pdf_files'), dict) else '未知'
                    table_data.append({
                        'PDF文件': pdf_name,
                        '用户ID': stat['user_session_id'][:12] + '...',
                        '阅读时长': format_duration(stat.get('total_reading_seconds', 0)),
                        '阅读次数': stat.get('read_count', 0),
                        '最后阅读': stat.get('last_read_at', 'N/A')[:19] if stat.get('last_read_at') else 'N/A'
                    })
                if table_data:
                    df = pd.DataFrame(table_data)
                    st.dataframe(df, use_container_width=True)
            
            with tab_user:
                user_stats = {}
                for stat in stats:
                    uid = stat['user_session_id']
                    if uid not in user_stats:
                        user_stats[uid] = {'total_seconds': 0, 'reads': 0, 'pdfs': set()}
                    user_stats[uid]['total_seconds'] += stat.get('total_reading_seconds', 0)
                    user_stats[uid]['reads'] += stat.get('read_count', 0)
                    pdf_name = stat.get('pdf_files', {}).get('file_name', '未知') if isinstance(stat.get('pdf_files'), dict) else '未知'
                    user_stats[uid]['pdfs'].add(pdf_name)
                
                sorted_users = sorted(user_stats.items(), key=lambda x: x[1]['total_seconds'], reverse=True)
                
                for uid, data in sorted_users:
                    with st.expander(f"👤 用户 {uid[:12]}..."):
                        col1, col2, col3 = st.columns(3)
                        with col1:
                            st.metric("总阅读时长", format_duration(data['total_seconds']))
                        with col2:
                            st.metric("阅读次数", data['reads'])
                        with col3:
                            st.metric("阅读PDF数", len(data['pdfs']))
                        st.write(f"阅读的PDF：{', '.join(data['pdfs'])}")
        else:
            st.info("暂无阅读记录")


if __name__ == "__main__":
    pdf_admin_page()
