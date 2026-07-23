import streamlit as st
import json
import os
import base64
import tempfile
import pandas as pd
import db
import theme

st.set_page_config(page_title="管理员控制台", layout="wide", initial_sidebar_state="expanded")

is_dark = theme.apply_theme()

# ---- 辅助函数 ----

def _has_module2_uploads(session_id):
    """判断用户是否在模块二上传过文件（非游客）"""
    # 检查 session data 中是否有模块二相关字段
    session_data = db.get_session_data(session_id)
    if not session_data:
        return False
    # 检查是否有上传文件记录或模型选择
    upload_keys = [
        'problem_file', 'image_file', 'data_file', 'analysis_file',
        'analysis_model', 'comprehensive_model'
    ]
    for q in range(1, 6):
        upload_keys.extend([
            f'code_upload_q{q}', f'code_model_q{q}',
            f'paper_model_q{q}', f'paper_result_q{q}', f'paper_image_q{q}'
        ])
    for key in upload_keys:
        if key in session_data and session_data[key]:
            return True
    # 也检查 stored_files 表中是否有 upload_ 前缀的文件
    files = db.get_session_files(session_id)
    for f in files:
        if f.get('file_key', '').startswith('upload_'):
            return True
    return False


def _get_active_sessions():
    """获取所有有效会话（排除游客）"""
    sessions = db.get_all_sessions()
    return {sid: data for sid, data in sessions.items() if _has_module2_uploads(sid)}

st.markdown("""
<style>
.sidebar-toggle-btn {
    border: none;
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 20px;
    box-shadow: 2px 2px 10px rgba(0,0,0,0.2);
    transition: all 0.3s ease;
}
.sidebar-toggle-btn:hover {
    right: -20px;
    box-shadow: 4px 4px 15px rgba(0,0,0,0.3);
}
.sidebar-toggle-btn.collapsed {
    right: calc(100% - 25px);
}
.auto-refresh-indicator {
    position: fixed;
    bottom: 20px;
    right: 20px;
    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
    color: white;
    padding: 10px 20px;
    border-radius: 25px;
    font-size: 14px;
    box-shadow: 2px 2px 10px rgba(0,0,0,0.2);
    z-index: 1000;
}
</style>
<script>
let refreshInterval = 60000;
let countdown = refreshInterval / 1000;
let timer = setInterval(function() {
    countdown--;
    if (countdown <= 0) {
        location.reload();
    }
}, 1000);
</script>
""", unsafe_allow_html=True)

# ---- 数据层：全部使用 Supabase (db.py) ----

def save_result_file(file, session_id, file_key):
    """保存管理员上传的结果文件到 Supabase"""
    db.save_file(session_id, f"result_{file_key}", file.name, file.getvalue())
    return f"result_{file_key}"

def save_user_uploaded_file(file, session_id, file_key):
    """保存用户上传的文件到 Supabase"""
    db.save_file(session_id, f"upload_{file_key}", file.name, file.getvalue())
    return f"upload_{file_key}"

def get_result_file_data(session_id, file_key):
    """获取管理员上传的结果文件 (file_name, file_data) 或 (None, None)"""
    return db.get_file(session_id, f"result_{file_key}")

def get_user_uploaded_file_data(session_id, file_key):
    """获取用户上传的文件 (file_name, file_data) 或 (None, None)"""
    return db.get_file(session_id, f"upload_{file_key}")

def delete_result_file(session_id, file_key):
    """删除管理员上传的结果文件"""
    db.delete_file(session_id, f"result_{file_key}")
    return True

def get_file_preview_from_data(file_name, file_data):
    """根据文件数据生成预览"""
    if not file_name or not file_data:
        return "文件不存在"
    
    file_ext = file_name.split('.')[-1].lower()
    
    try:
        if file_ext in ['txt', 'py', 'md']:
            content = file_data.decode('utf-8', errors='ignore')
            return content[:2000] if len(content) > 2000 else content
        elif file_ext in ['csv']:
            import io
            df = pd.read_csv(io.BytesIO(file_data))
            return df.to_string(index=False)[:2000]
        elif file_ext in ['xls', 'xlsx']:
            import io
            df = pd.read_excel(io.BytesIO(file_data))
            return df.to_string(index=False)[:2000]
        elif file_ext in ['png', 'jpg', 'jpeg', 'gif']:
            return "图片文件"
        elif file_ext in ['pdf', 'docx']:
            return f"文档文件: {file_name}"
        else:
            return f"文件: {file_name}"
    except Exception as e:
        return f"无法预览文件: {str(e)}"

def get_current_mode():
    return db.get_current_mode()

def set_current_mode(mode):
    db.set_current_mode(mode)

def main():
    if 'sidebar_collapsed' not in st.session_state:
        st.session_state['sidebar_collapsed'] = False
    
    if st.session_state['sidebar_collapsed']:
        st.markdown('<div class="sidebar-toggle-btn collapsed" onclick="window.parent.document.querySelector(\'.css-1lcbmhc\').classList.remove(\'sidebar-collapsed\'); window.parent.document.dispatchEvent(new Event(\'resize\')); location.reload();">▶</div>', unsafe_allow_html=True)
        st.sidebar.markdown("""
            <style>
            .css-1lcbmhc {
                width: 50px !important;
                min-width: 50px !important;
            }
            .css-1lcbmhc * {
                display: none !important;
            }
            .css-1lcbmhc::before {
                content: '◀';
                display: flex !important;
                align-items: center;
                justify-content: center;
                height: 100%;
                font-size: 24px;
                color: #667eea;
                cursor: pointer;
            }
            </style>
        """, unsafe_allow_html=True)
    else:
        st.markdown('<div class="sidebar-toggle-btn" onclick="window.parent.document.querySelector(\'.css-1lcbmhc\').classList.add(\'sidebar-collapsed\'); window.parent.document.dispatchEvent(new Event(\'resize\')); location.reload();">▶</div>', unsafe_allow_html=True)
        st.sidebar.title("管理员控制台")
    
    st.sidebar.markdown("---")
    st.sidebar.subheader("主题切换")
    # 确保 theme 已初始化
    if 'theme' not in st.session_state:
        st.session_state['theme'] = 'light'
    theme_icon = "🌙" if st.session_state['theme'] == 'light' else "☀️"
    if st.sidebar.button(f"{theme_icon} {'切换暗色' if st.session_state['theme'] == 'light' else '切换亮色'}", key="theme_toggle"):
        st.session_state['theme'] = 'dark' if st.session_state['theme'] == 'light' else 'light'
        st.rerun()
    
    st.sidebar.markdown("---")
    st.sidebar.subheader("网站呈现方式")
    
    current_mode = get_current_mode()
    
    mode_options = [
        ("第一种方式（不变）", "mode1"),
        ("第二种方式（表演模式）", "mode2")
    ]
    
    selected_mode_label = next(label for label, mode in mode_options if mode == current_mode)
    st.sidebar.markdown(f"**当前模式**: {selected_mode_label}")
    
    if st.sidebar.button("切换到第一种方式", key="switch_mode1", disabled=current_mode == "mode1"):
        set_current_mode("mode1")
        st.success("已切换到第一种方式")
        st.rerun()
    
    if st.sidebar.button("切换到第二种方式", key="switch_mode2", disabled=current_mode == "mode2"):
        set_current_mode("mode2")
        st.success("已切换到第二种方式")
        st.rerun()
    
    st.sidebar.markdown("---")
    
    tab = st.sidebar.radio("管理功能", ["用户会话管理", "结果上传管理", "卡密管理", "模型费用管理", "用户文件管理"], key="admin_tab")
    
    if tab == "用户会话管理":
        manage_user_sessions()
    elif tab == "结果上传管理":
        manage_result_uploads()
    elif tab == "卡密管理":
        manage_card_codes()
    elif tab == "模型费用管理":
        manage_model_deduct_rules()
    else:
        manage_user_files()

def manage_user_sessions():
    st.subheader("📋 用户会话管理")
    
    sessions = _get_active_sessions()
    session_ids = list(sessions.keys())
    
    if not session_ids:
        st.info("暂无用户会话")
        return
    
    selected_session = st.selectbox("选择用户会话", session_ids, key="session_select")
    
    if selected_session:
        session_data = sessions[selected_session]
        st.markdown(f"**会话ID**: {selected_session}")
        st.markdown(f"**创建时间**: {session_data.get('created_at', '未知')}")
        
        st.markdown("---")
        st.markdown("### 📤 用户上传信息")
        
        if 'problem_file' in session_data:
            st.markdown(f"**题目文档**: {session_data['problem_file']}")
            fname, fdata = get_user_uploaded_file_data(selected_session, 'problem_file')
            if fname and fdata:
                st.download_button(label="下载题目文档", data=fdata, file_name=fname, key="download_problem_file_btn")
        
        if 'image_file' in session_data:
            st.markdown(f"**重要配图**: {session_data['image_file']}")
            fname, fdata = get_user_uploaded_file_data(selected_session, 'image_file')
            if fname and fdata:
                st.download_button(label="下载重要配图", data=fdata, file_name=fname, key="download_image_file_btn")
        
        if 'data_file' in session_data:
            st.markdown(f"**数据文件**: {session_data['data_file']}")
            fname, fdata = get_user_uploaded_file_data(selected_session, 'data_file')
            if fname and fdata:
                st.download_button(label="下载数据文件", data=fdata, file_name=fname, key="download_data_file_btn")
        
        if 'problem_content' in session_data:
            with st.expander("查看提取的问题内容"):
                st.text(session_data['problem_content'])
        
        if 'analysis_file' in session_data:
            st.markdown(f"**问题分析文档**: {session_data['analysis_file']}")
            fname, fdata = get_user_uploaded_file_data(selected_session, 'analysis_file')
            if fname and fdata:
                st.download_button(label="下载问题分析文档", data=fdata, file_name=fname, key="download_analysis_upload_btn")
        
        for q_num in range(1, 6):
            code_key = f'code_upload_q{q_num}'
            if code_key in session_data and session_data[code_key]:
                st.markdown(f"**问题{q_num}代码文件**: {session_data[code_key]}")
                fname, fdata = get_user_uploaded_file_data(selected_session, code_key)
                if fname and fdata:
                    st.download_button(label=f"下载问题{q_num}代码文件", data=fdata, file_name=fname, key=f"download_code_upload_q{q_num}_btn")
        
        for q_num in range(1, 6):
            result_key = f'paper_result_q{q_num}'
            if result_key in session_data and session_data[result_key]:
                st.markdown(f"**问题{q_num}运行结果文件**: {session_data[result_key]}")
                fname, fdata = get_user_uploaded_file_data(selected_session, result_key)
                if fname and fdata:
                    st.download_button(label=f"下载问题{q_num}运行结果", data=fdata, file_name=fname, key=f"download_result_upload_q{q_num}_btn")
        
        for q_num in range(1, 6):
            image_key = f'paper_image_q{q_num}'
            if image_key in session_data and session_data[image_key]:
                st.markdown(f"**问题{q_num}结果图**: {session_data[image_key]}")
                fname, fdata = get_user_uploaded_file_data(selected_session, image_key)
                if fname and fdata:
                    st.download_button(label=f"下载问题{q_num}结果图", data=fdata, file_name=fname, key=f"download_image_upload_q{q_num}_btn")
        
        st.markdown("---")
        st.markdown("### 📊 模型选择")
        
        if 'analysis_model' in session_data:
            st.markdown(f"**问题分析模型**: {session_data['analysis_model']}")
        
        for q_num in range(1, 6):
            if f'code_model_q{q_num}' in session_data:
                st.markdown(f"**问题{q_num}代码模型**: {session_data[f'code_model_q{q_num}']}")
        
        for q_num in range(1, 6):
            if f'paper_model_q{q_num}' in session_data:
                st.markdown(f"**问题{q_num}论文模型**: {session_data[f'paper_model_q{q_num}']}")
        
        if 'comprehensive_model' in session_data:
            st.markdown(f"**综合写作模型**: {session_data['comprehensive_model']}")
        
        if st.button("删除会话", key="delete_session_btn"):
            db.delete_session(selected_session)
            db.delete_session_files(selected_session)
            st.success("会话已删除")
            st.rerun()

def manage_card_codes():
    st.subheader("🔐 卡密管理")
    
    tab1, tab2, tab3, tab4 = st.tabs(["创建卡密", "卡密充值", "卡密列表", "用户绑定"])
    
    with tab1:
        st.markdown("#### 创建新卡密")
        amount = st.number_input("卡密初始余额", min_value=1, max_value=10000, value=100)
        count = st.number_input("生成数量", min_value=1, max_value=100, value=1)
        
        if st.button("生成卡密", key="generate_cards"):
            codes = db.create_card_codes(amount, count)
            st.success(f"成功生成 {count} 个卡密！")
            for code in codes:
                st.code(code)
    
    with tab2:
        st.markdown("#### 卡密充值")
        card_codes_list = db.get_all_card_codes()
        if not card_codes_list:
            st.info("暂无卡密")
        else:
            code_options = [c['code'] for c in card_codes_list]
            selected_code = st.selectbox("选择卡密", code_options, key="recharge_card_select")
            
            if selected_code:
                card = db.get_card_code(selected_code)
                if card:
                    st.info(f"卡密当前余额: {card.get('balance', 0)} 次")
                    
                    recharge_amount = st.number_input("充值次数", min_value=1, max_value=10000, value=100)
                    
                    if st.button("确认充值", key="confirm_recharge_btn"):
                        success, msg = db.add_card_balance(selected_code, recharge_amount)
                        if success:
                            st.success(msg)
                        else:
                            st.error(msg)
        
    with tab3:
        st.markdown("#### 卡密列表")
        card_codes_list = db.get_all_card_codes()
        if not card_codes_list:
            st.info("暂无卡密")
        else:
            data = []
            for card in card_codes_list:
                usage_log = db.get_card_usage_log(card['code'])
                data.append({
                    '卡密': card['code'],
                    '初始余额': card['amount'],
                    '当前余额': card.get('balance', 0),
                    '使用次数': len(usage_log),
                    '创建时间': card.get('created_at', '')
                })
            df = pd.DataFrame(data)
            st.dataframe(df, use_container_width=True)
            
            import io
            output = io.BytesIO()
            with pd.ExcelWriter(output, engine='openpyxl') as writer:
                df.to_excel(writer, index=False, sheet_name='卡密列表')
            output.seek(0)
            
            st.download_button(
                label="📥 下载卡密列表",
                data=output,
                file_name="卡密列表.xlsx",
                mime="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
                key="download_card_list"
            )
            
            st.markdown("---")
            st.markdown("#### 使用明细")
            code_options = [c['code'] for c in card_codes_list]
            selected_code = st.selectbox("选择卡密查看明细", code_options, key="card_detail_select")
            if selected_code:
                usage_log = db.get_card_usage_log(selected_code)
                if usage_log:
                    log_data = []
                    for log in usage_log:
                        log_data.append({
                            '用户会话ID': log.get('session_id', ''),
                            '使用时间': log.get('used_at', '')
                        })
                    st.dataframe(pd.DataFrame(log_data), use_container_width=True)
                else:
                    st.info("该卡密尚未被使用")
    
    with tab4:
        st.markdown("#### 用户绑定")
        user_cards_list = db.get_all_user_cards()
        if not user_cards_list:
            st.info("暂无用户激活卡密")
        else:
            data = []
            for card in user_cards_list:
                history = db.get_deduction_history(card['session_id'])
                sid = card['session_id']
                data.append({
                    '会话ID': sid[:10] + '...' if len(sid) > 10 else sid,
                    '余额(次)': card.get('balance', 0),
                    '使用记录数': len(history)
                })
            df = pd.DataFrame(data)
            st.dataframe(df, use_container_width=True)

def manage_result_uploads():
    st.subheader("📤 结果上传管理")
    
    sessions = _get_active_sessions()
    session_ids = list(sessions.keys())
    
    if not session_ids:
        st.info("暂无用户会话")
        return
    
    selected_session = st.selectbox("选择用户会话", session_ids, key="result_session_select")
    
    if selected_session:
        session_data = sessions[selected_session]
        
        st.markdown("---")
        st.markdown("### 第一部分：题目解析结果")
        
        analysis_file = st.file_uploader("上传题目解析结果文件", type=['txt', 'md', 'docx', 'pdf'], key="analysis_file_upload")
        deduct_count_analysis = st.number_input("扣除次数", min_value=0, max_value=100, value=1, key="deduct_analysis")
        
        col1, col2 = st.columns(2)
        with col1:
            if st.button("上传并保存题目解析结果", key="save_analysis_btn"):
                if analysis_file:
                    save_result_file(analysis_file, selected_session, 'analysis')
                    db.update_session_data(selected_session, {'analysis_deduct_count': deduct_count_analysis})
                    st.success("题目解析结果已上传")
                else:
                    st.warning("请先选择文件")
        with col2:
            if st.button("清除题目解析结果", key="clear_analysis_btn"):
                delete_result_file(selected_session, 'analysis')
                db.update_session_data(selected_session, {'analysis_deduct_count': 0})
                st.success("题目解析结果已清除")
        
        fname, fdata = get_result_file_data(selected_session, 'analysis')
        if fname and fdata:
            with st.expander("预览文件内容"):
                st.text(get_file_preview_from_data(fname, fdata))
        
        st.markdown("---")
        st.markdown("### 第二部分：问题分析结果")
        
        problem_analysis_file = st.file_uploader("上传问题分析结果文件", type=['txt', 'md', 'docx', 'pdf'], key="problem_analysis_file_upload")
        deduct_count_problem_analysis = st.number_input("扣除次数", min_value=0, max_value=100, value=1, key="deduct_problem_analysis")
        
        col1, col2 = st.columns(2)
        with col1:
            if st.button("上传并保存问题分析结果", key="save_problem_analysis_btn"):
                if problem_analysis_file:
                    save_result_file(problem_analysis_file, selected_session, 'problem_analysis')
                    db.update_session_data(selected_session, {'problem_analysis_deduct_count': deduct_count_problem_analysis})
                    st.success("问题分析结果已上传")
                else:
                    st.warning("请先选择文件")
        with col2:
            if st.button("清除问题分析结果", key="clear_problem_analysis_btn"):
                delete_result_file(selected_session, 'problem_analysis')
                db.update_session_data(selected_session, {'problem_analysis_deduct_count': 0})
                st.success("问题分析结果已清除")
        
        fname, fdata = get_result_file_data(selected_session, 'problem_analysis')
        if fname and fdata:
            with st.expander("预览文件内容"):
                st.text(get_file_preview_from_data(fname, fdata))
        
        st.markdown("---")
        st.markdown("### 第三部分：代码生成结果")
        
        for q_num in range(1, 6):
            st.markdown(f"#### 问题{q_num}代码")
            code_file = st.file_uploader(f"上传问题{q_num}代码文件", type=['py', 'txt'], key=f"code_file_q{q_num}_upload")
            deduct_count_code = st.number_input(f"问题{q_num}扣除次数", min_value=0, max_value=100, value=1, key=f"deduct_code_q{q_num}")
            
            col1, col2 = st.columns(2)
            with col1:
                if st.button(f"上传并保存问题{q_num}代码", key=f'save_code_q{q_num}_btn'):
                    if code_file:
                        save_result_file(code_file, selected_session, f'code_q{q_num}')
                        db.update_session_data(selected_session, {f'code_deduct_count_q{q_num}': deduct_count_code})
                        st.success(f"问题{q_num}代码已上传")
                    else:
                        st.warning("请先选择文件")
            with col2:
                if st.button(f"清除问题{q_num}代码", key=f'clear_code_q{q_num}_btn'):
                    delete_result_file(selected_session, f'code_q{q_num}')
                    db.update_session_data(selected_session, {f'code_deduct_count_q{q_num}': 0})
                    st.success(f"问题{q_num}代码已清除")
            
            fname, fdata = get_result_file_data(selected_session, f'code_q{q_num}')
            if fname and fdata:
                with st.expander(f"预览问题{q_num}代码内容"):
                    st.text(get_file_preview_from_data(fname, fdata))
        
        st.markdown("---")
        st.markdown("### 第四部分：论文写作结果")
        
        for q_num in range(1, 6):
            st.markdown(f"#### 问题{q_num}模型建立与求解")
            paper_file = st.file_uploader(f"上传问题{q_num}论文文件", type=['txt', 'md', 'docx', 'pdf'], key=f"paper_file_q{q_num}_upload")
            deduct_count_paper = st.number_input(f"问题{q_num}扣除次数", min_value=0, max_value=100, value=1, key=f"deduct_paper_q{q_num}")
            
            col1, col2 = st.columns(2)
            with col1:
                if st.button(f"上传并保存问题{q_num}论文", key=f'save_paper_q{q_num}_btn'):
                    if paper_file:
                        save_result_file(paper_file, selected_session, f'paper_q{q_num}')
                        db.update_session_data(selected_session, {f'paper_deduct_count_q{q_num}': deduct_count_paper})
                        st.success(f"问题{q_num}论文已上传")
                    else:
                        st.warning("请先选择文件")
            with col2:
                if st.button(f"清除问题{q_num}论文", key=f'clear_paper_q{q_num}_btn'):
                    delete_result_file(selected_session, f'paper_q{q_num}')
                    db.update_session_data(selected_session, {f'paper_deduct_count_q{q_num}': 0})
                    st.success(f"问题{q_num}论文已清除")
            
            fname, fdata = get_result_file_data(selected_session, f'paper_q{q_num}')
            if fname and fdata:
                with st.expander(f"预览问题{q_num}论文内容"):
                    st.text(get_file_preview_from_data(fname, fdata))
        
        st.markdown("---")
        st.markdown("### 综合写作部分")
        
        comprehensive_file = st.file_uploader("上传综合写作内容文件", type=['txt', 'md', 'docx', 'pdf'], key="comprehensive_file_upload")
        deduct_count_comprehensive = st.number_input("扣除次数", min_value=0, max_value=100, value=1, key="deduct_comprehensive")
        
        col1, col2 = st.columns(2)
        with col1:
            if st.button("上传并保存综合写作内容", key="save_comprehensive_btn"):
                if comprehensive_file:
                    save_result_file(comprehensive_file, selected_session, 'comprehensive')
                    db.update_session_data(selected_session, {'comprehensive_deduct_count': deduct_count_comprehensive})
                    st.success("综合写作内容已上传")
                else:
                    st.warning("请先选择文件")
        with col2:
            if st.button("清除综合写作内容", key="clear_comprehensive_btn"):
                delete_result_file(selected_session, 'comprehensive')
                db.update_session_data(selected_session, {'comprehensive_deduct_count': 0})
                st.success("综合写作内容已清除")
        
        fname, fdata = get_result_file_data(selected_session, 'comprehensive')
        if fname and fdata:
            with st.expander("预览综合写作内容"):
                st.text(get_file_preview_from_data(fname, fdata))
        
        st.markdown("---")
        st.markdown("### 排版后论文")
        
        formatted_file = st.file_uploader("上传排版后论文文件", type=['txt', 'md', 'docx', 'pdf'], key="formatted_file_upload")
        deduct_count_formatted = st.number_input("扣除次数", min_value=0, max_value=100, value=1, key="deduct_formatted")
        
        col1, col2 = st.columns(2)
        with col1:
            if st.button("上传并保存排版后论文", key="save_formatted_btn"):
                if formatted_file:
                    save_result_file(formatted_file, selected_session, 'formatted')
                    db.update_session_data(selected_session, {'formatted_deduct_count': deduct_count_formatted})
                    st.success("排版后论文已上传")
                else:
                    st.warning("请先选择文件")
        with col2:
            if st.button("清除排版后论文", key="clear_formatted_btn"):
                delete_result_file(selected_session, 'formatted')
                db.update_session_data(selected_session, {'formatted_deduct_count': 0})
                st.success("排版后论文已清除")
        
        fname, fdata = get_result_file_data(selected_session, 'formatted')
        if fname and fdata:
            with st.expander("预览排版后论文内容"):
                st.text(get_file_preview_from_data(fname, fdata))

def manage_model_deduct_rules():
    st.subheader("💳 模型费用管理")
    
    DEFAULT_MODELS = [
        "qwen-plus", "qwen-max", "qwen-turbo",
        "qwen2-7b-instruct", "qwen2-14b-instruct",
        "qwen3-8b-instruct", "qwen3-72b-instruct",
        "qwen3.7-plus", "qwen3.7-max-2026-05-17", "qwen3.7-max-2026-06-08",
        "deepseek-v4-flash", "deepseek-v4-pro"
    ]
    
    DEFAULT_MODULES = [
        "问题分析", "模型推荐", "模型评审", "代码生成", 
        "敏感性分析", "论文写作", "论文评审", "论文评估", 
        "代码执行", "论文审计"
    ]
    
    rules = db.get_all_model_deduct_rules()
    
    if not rules:
        st.warning("数据库中暂无模型费用规则，正在初始化...")
        for model in DEFAULT_MODELS:
            for module in DEFAULT_MODULES:
                if module in ["论文写作", "模型评审", "代码生成"]:
                    deduct_count = 3
                elif module in ["问题分析", "模型推荐", "敏感性分析"]:
                    deduct_count = 2
                else:
                    deduct_count = 1
                
                if "max" in model.lower() or "72b" in model.lower() or "pro" in model.lower():
                    deduct_count += 1
                
                db.update_model_deduct_rule(model, module, deduct_count)
        
        rules = db.get_all_model_deduct_rules()
        st.success("已初始化默认模型费用规则！")
    
    models = sorted(set(r['model_name'] for r in rules))
    modules = sorted(set(r['module_name'] for r in rules))
    
    selected_model = st.selectbox("选择模型", models, key="model_select")
    
    st.markdown("---")
    st.markdown("### 修改模型费用")
    
    model_rules = [r for r in rules if r['model_name'] == selected_model]
    
    st.markdown(f"#### {selected_model} 当前费用设置")
    
    for module in modules:
        rule = next((r for r in model_rules if r['module_name'] == module), None)
        current_count = rule['deduct_count'] if rule else 1
        
        col1, col2 = st.columns([3, 1])
        with col1:
            st.markdown(f"**{module}**")
        with col2:
            new_count = st.number_input(f"扣除次数", min_value=0, max_value=100, value=current_count, key=f"deduct_{selected_model}_{module}")
        
        if new_count != current_count:
            db.update_model_deduct_rule(selected_model, module, new_count)
            st.success(f"已更新「{module}」扣除次数为 {new_count} 次")
    
    st.markdown("---")
    st.markdown("### 全部规则列表")
    
    rule_data = []
    for rule in rules:
        rule_data.append({
            '模型': rule['model_name'],
            '模块': rule['module_name'],
            '扣除次数': rule['deduct_count']
        })
    
    df = pd.DataFrame(rule_data)
    st.dataframe(df, use_container_width=True)
    
    import io
    output = io.BytesIO()
    with pd.ExcelWriter(output, engine='openpyxl') as writer:
        df.to_excel(writer, index=False, sheet_name='模型计费规则')
    output.seek(0)
    
    st.download_button(
        label="📥 下载模型计费规则",
        data=output,
        file_name="模型计费规则.xlsx",
        mime="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        key="download_rules"
    )
    
    st.markdown("---")
    st.markdown("### 批量设置")
    
    st.info("批量设置所有模型在指定模块的费用")
    
    target_module = st.selectbox("选择模块", modules, key="batch_module_select")
    batch_count = st.number_input("统一扣除次数", min_value=0, max_value=100, value=1, key="batch_count")
    
    if st.button("应用到所有模型", key="batch_apply_btn"):
        for model in models:
            db.update_model_deduct_rule(model, target_module, batch_count)
        st.success(f"已将所有模型的「{target_module}」费用设置为 {batch_count} 次")
        st.rerun()

def manage_user_files():
    st.subheader("📁 用户文件管理")
    
    st.info("查看未过期的模块一用户需下载的文件，按用户分组显示")
    
    sessions = _get_active_sessions()
    session_ids = list(sessions.keys())
    
    if not session_ids:
        st.info("暂无用户会话")
        return
    
    selected_session = st.selectbox("选择用户会话", session_ids, key="user_files_session_select")
    
    if selected_session:
        session_info = sessions.get(selected_session, {})
        st.markdown(f"**会话ID**: `{selected_session}`")
        st.markdown(f"**创建时间**: {session_info.get('created_at', '未知')}")
        st.markdown(f"**最后活跃**: {session_info.get('updated_at', '未知')}")
        
        st.markdown("---")
        st.markdown("### 用户文件列表")
        
        files = db.get_user_files(selected_session)
        
        if not files:
            st.info("该用户暂无文件")
            return
        
        # 按步骤分组
        step1_files = []  # upload_problem_file, upload_image_file, upload_data_file
        step2_files = []  # upload_analysis_file
        step3_files = []  # upload_code_upload_q{1-5}
        step4_files = []  # upload_paper_code_q{1-5}, upload_paper_result_q{1-5}, upload_paper_image_q{1-5}
        other_files = []
        
        step1_keys = ['upload_problem_file', 'upload_image_file', 'upload_data_file']
        step2_keys = ['upload_analysis_file']
        step3_keys = [f'upload_code_upload_q{q}' for q in range(1, 6)]
        step4_keys = []
        for q in range(1, 6):
            step4_keys.append(f'upload_paper_code_q{q}')
            step4_keys.append(f'upload_paper_result_q{q}')
            step4_keys.append(f'upload_paper_image_q{q}')
        
        for file in files:
            file_key = file.get('file_key', '')
            if file_key in step1_keys:
                step1_files.append(file)
            elif file_key in step2_keys:
                step2_files.append(file)
            elif file_key in step3_keys:
                step3_files.append(file)
            elif file_key in step4_keys or file_key.startswith('upload_paper_'):
                step4_files.append(file)
            else:
                other_files.append(file)
        
        # 显示第一部分文件
        if step1_files:
            st.markdown("#### 📝 第一部分：题目文件")
            _show_file_list(step1_files)
        
        # 显示第二部分文件
        if step2_files:
            st.markdown("#### 🔍 第二部分：问题分析文件")
            _show_file_list(step2_files)
        
        # 显示第三部分文件
        if step3_files:
            st.markdown("#### 💻 第三部分：代码文件")
            _show_file_list(step3_files)
        
        # 显示第四部分文件
        if step4_files:
            st.markdown("#### 📄 第四部分：论文文件")
            _show_file_list(step4_files)
        
        # 其他文件
        if other_files:
            st.markdown("#### 📎 其他文件")
            _show_file_list(other_files)


def _show_file_list(file_list):
    """显示文件列表（复用组件）"""
    for file in file_list:
        file_name = file.get('file_name', '未知文件')
        file_key = file.get('file_key', '')
        file_data = file.get('file_data', b'')
        file_type = file.get('file_type', '')
        
        with st.expander(f"📄 {file_name}"):
            col1, col2 = st.columns([2, 1])
            with col1:
                st.markdown(f"**文件类型**: {file_type}")
                st.markdown(f"**文件大小**: {len(file_data) // 1024} KB")
            with col2:
                st.download_button(
                    label="下载文件",
                    data=file_data,
                    file_name=file_name,
                    key=f"download_file_{file_key}"
                )
            
            if file_name.endswith('.md'):
                try:
                    content = file_data.decode('utf-8')
                    st.markdown(content[:5000])
                    if len(content) > 5000:
                        st.info("内容过长，仅显示前5000字符")
                except:
                    st.text("无法预览文件内容")

if __name__ == "__main__":
    main()