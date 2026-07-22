import streamlit as st
import json
import os
import base64
import tempfile
import pandas as pd
import random
import string
import time
import io
import db
import theme

def generate_session_id():
    return ''.join(random.choices(string.ascii_letters + string.digits, k=8))

st.set_page_config(page_title="数学建模助手", layout="wide", initial_sidebar_state="expanded")

is_dark = theme.apply_theme()

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

def get_result_file_data(session_id, file_key):
    return db.get_file(session_id, f"result_{file_key}")

def get_file_preview_from_data(file_name, file_data):
    if file_name is None or file_data is None:
        return None
    
    file_ext = file_name.split('.')[-1].lower()
    
    try:
        if file_ext in ['txt', 'py', 'md']:
            content = file_data.decode('utf-8', errors='ignore')
            return content[:3000] if len(content) > 3000 else content
        elif file_ext in ['csv', 'xls', 'xlsx']:
            if file_ext == 'csv':
                df = pd.read_csv(io.BytesIO(file_data))
            else:
                df = pd.read_excel(io.BytesIO(file_data))
            return df.to_string(index=False)[:3000]
        elif file_ext in ['png', 'jpg', 'jpeg', 'gif']:
            return "图片文件"
        elif file_ext in ['pdf', 'docx']:
            return f"文档文件: {file_name}"
        else:
            return f"文件: {file_name}"
    except Exception as e:
        return f"无法预览文件: {str(e)}"

def get_or_create_session_id():
    if 'session_id' not in st.session_state:
        st.session_state['session_id'] = generate_session_id()
        db.create_session(st.session_state['session_id'], {
            'created_at': time.strftime("%Y-%m-%d %H:%M:%S")
        })
    return st.session_state['session_id']

def save_user_upload(file, session_id, file_key):
    db.save_file(session_id, f"upload_{file_key}", file.name, file.getvalue())

def process_uploaded_file(file):
    file_ext = file.name.split('.')[-1].lower()
    
    if file_ext in ['pdf', 'docx']:
        try:
            with tempfile.NamedTemporaryFile(delete=False, suffix=f".{file_ext}") as f:
                f.write(file.getvalue())
                temp_path = f.name
            
            from tools.data_processor import parse_file, clean_text
            content = parse_file(temp_path)
            os.unlink(temp_path)
            return clean_text(content)
        except Exception as e:
            return None
    elif file_ext in ['csv', 'xls', 'xlsx']:
        try:
            with tempfile.NamedTemporaryFile(delete=False, suffix=f".{file_ext}") as f:
                f.write(file.getvalue())
                temp_path = f.name
            
            if file_ext == '.csv':
                df = pd.read_csv(temp_path)
            else:
                df = pd.read_excel(temp_path)
            os.unlink(temp_path)
            return df.to_string(index=False)
        except Exception as e:
            return None
    else:
        try:
            return file.getvalue().decode('utf-8', errors='ignore')
        except:
            return None

def main():
    session_id = get_or_create_session_id()
    
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
        st.sidebar.title("数学建模助手")
        st.sidebar.markdown(f"**会话ID**: {session_id}")
        
        balance = db.get_user_balance(session_id)
        st.sidebar.markdown(f"**剩余次数**: {balance} 次")
        
        st.sidebar.markdown("---")
        st.sidebar.markdown("### 卡密充值")
        card_code_input = st.sidebar.text_input("输入卡密", key="card_code_input")
        if st.sidebar.button("激活卡密", key="activate_card_btn"):
            if card_code_input:
                success, msg = db.activate_card(session_id, card_code_input.strip())
                if success:
                    st.sidebar.success(msg)
                else:
                    st.sidebar.error(msg)
            else:
                st.sidebar.warning("请输入卡密")
        
        st.sidebar.markdown("---")
        st.sidebar.markdown("### 主题切换")
        # 确保 theme 已初始化
        if 'theme' not in st.session_state:
            st.session_state['theme'] = 'light'
        theme_icon = "🌙" if st.session_state['theme'] == 'light' else "☀️"
        if st.sidebar.button(f"{theme_icon} {'切换暗色' if st.session_state['theme'] == 'light' else '切换亮色'}", key="theme_toggle"):
            st.session_state['theme'] = 'dark' if st.session_state['theme'] == 'light' else 'light'
            st.rerun()
    
    user_card = db.get_user_card(session_id)
    if user_card is None:
        st.markdown("""
            <div style="background-color: #fef2f2; border: 2px solid #f87171; padding: 20px; border-radius: 10px; text-align: center;">
            <h3 style="color: #dc2626;">⚠️ 请先激活卡密</h3>
            <p>在左侧侧边栏输入卡密并点击「激活卡密」按钮</p>
            <p>激活后才能使用系统功能</p>
            </div>
            """, unsafe_allow_html=True)
        return
    
    if 'step' not in st.session_state:
        st.session_state['step'] = 1
    
    step = st.session_state['step']
    
    if step == 1:
        show_step1(session_id)
    elif step == 2:
        show_step2(session_id)
    elif step == 3:
        show_step3(session_id)
    elif step == 4:
        show_step4(session_id)

def show_step1(session_id):
    st.header("📝 第一部分：上传题目文件读取")
    
    st.markdown("""
    <div style="background-color: #f0f2f6; padding: 15px; border-radius: 8px; margin-bottom: 20px;">
    <strong>特别说明</strong>：强调插图需单独上传（最大500KB），数据文件支持多表（xlsx/xls/csv）
    </div>
    """, unsafe_allow_html=True)
    
    col1, col2, col3 = st.columns(3)
    
    with col1:
        st.subheader("题目文档（必填）")
        st.markdown("支持docx/pdf，最大3M")
        problem_file = st.file_uploader("上传题目文档", type=['docx', 'pdf'], key="problem_file_upload")
        
    with col2:
        st.subheader("重要配图（选填）")
        st.markdown("支持jpeg/png，最大500KB")
        image_file = st.file_uploader("上传重要配图", type=['jpeg', 'png', 'jpg'], key="image_file_upload")
    
    with col3:
        st.subheader("数据文件（选填）")
        st.markdown("支持xlsx/xls/csv，最大5M")
        data_file = st.file_uploader("上传数据文件", type=['xlsx', 'xls', 'csv'], key="data_file_upload")
    
    st.markdown("---")
    
    col_ops, col_display = st.columns([1, 3])
    
    with col_ops:
        st.subheader("操作栏")
        
        if st.button("点击开始解析题目内容", key="parse_btn", type="primary"):
            if not problem_file:
                st.warning("请先上传题目文档")
                return
            
            session_data = {
                'problem_file': problem_file.name,
                'step1_status': 'processing'
            }
            
            save_user_upload(problem_file, session_id, 'problem_file')

            if image_file:
                session_data['image_file'] = image_file.name
                save_user_upload(image_file, session_id, 'image_file')

            if data_file:
                session_data['data_file'] = data_file.name
                save_user_upload(data_file, session_id, 'data_file')
            
            problem_content = process_uploaded_file(problem_file)
            if problem_content:
                session_data['problem_content'] = problem_content
            
            db.update_session_data(session_id, session_data)
            
            with st.spinner("AI正在读取题目内容..."):
                time.sleep(3)
            
            db.update_session_data(session_id, {'step1_status': 'processing'})
            st.info("⏳ 正在生成题目解析结果，请稍候...")
        
        if st.button("一键清除上传文件", key="clear_files_btn"):
            db.update_session_data(session_id, {
                'problem_file': '',
                'image_file': '',
                'data_file': '',
                'problem_content': '',
                'step1_status': '',
                'analysis_result': ''
            })
            st.success("上传文件已清除")
        
        if st.button("点击下载当前内容", key="download_step1_btn"):
            sessions = db.get_all_sessions()
            session_data = sessions.get(session_id, {})
            content = f"题目文档: {session_data.get('problem_file', '无')}\n"
            content += f"重要配图: {session_data.get('image_file', '无')}\n"
            content += f"数据文件: {session_data.get('data_file', '无')}\n"
            content += f"\n问题内容:\n{session_data.get('problem_content', '无')}"
            
            st.download_button(
                label="下载",
                data=content,
                file_name="step1_content.txt",
                mime="text/plain",
                key="step1_download_btn"
            )
        
        st.warning("勿频繁点击下载，需等待5分钟")
    
    with col_display:
        st.subheader("内容展示与编辑区")
        
        col_left, col_right = st.columns(2)
        
        with col_left:
            st.markdown("### 📊 数据文件展示")
            
            sessions = db.get_all_sessions()
            session_data = sessions.get(session_id, {})
            
            if session_data.get('data_file'):
                data_file_name, data_file_data = db.get_file(session_id, 'upload_data_file')
                if data_file_name and data_file_data:
                    try:
                        if data_file_name.endswith('.csv'):
                            df = pd.read_csv(io.BytesIO(data_file_data))
                        else:
                            df = pd.read_excel(io.BytesIO(data_file_data))
                        st.dataframe(df)
                    except:
                        st.text(session_data.get('data_content', '无法读取数据文件'))
                else:
                    st.info("数据文件不存在")
            
            if st.button("点击更换各项问题内容", key="change_content_btn"):
                pass
            
            edited_content = st.text_area(
                "手动修正提取出的问题内容",
                height=200,
                value=session_data.get('problem_content', ''),
                key="edited_content",
                help="如果没问题就不用管"
            )
            
            if edited_content != session_data.get('problem_content', ''):
                db.update_session_data(session_id, {'problem_content': edited_content})
        
        with col_right:
            st.markdown("### 📝 AI提取原文")
            
            analysis_file_name, analysis_file_data = get_result_file_data(session_id, 'analysis')
            preview_content = get_file_preview_from_data(analysis_file_name, analysis_file_data)

            if preview_content:
                st.text_area("AI提取原文预览", preview_content, height=300, key="analysis_preview")

                st.download_button(
                    label="下载AI提取原文",
                    data=analysis_file_data,
                    file_name=analysis_file_name,
                    key="download_analysis_btn"
                )
            else:
                if session_data.get('step1_status') == 'processing':
                    st.info("⏳ 正在生成题目解析结果...")
                else:
                    st.info("点击「点击开始解析题目内容」后，系统将自动生成题目解析结果")

    analysis_file_name, analysis_file_data = get_result_file_data(session_id, 'analysis')
    if session_data.get('step1_status') == 'processing' and analysis_file_name:
        st.success("管理员已完成题目解析！")
        deduct_count = session_data.get('analysis_deduct_count', 1)
        st.info(f"进入下一部分将扣除 {deduct_count} 次")
        if st.button("进入第二部分：问题分析", key="to_step2_btn"):
            success, msg = db.deduct_balance(session_id, deduct_count)
            if success:
                st.success(msg)
                st.session_state['step'] = 2
                st.rerun()
            else:
                st.error(msg)
    elif session_data.get('step1_status') == 'processing':
        st.info("⏳ 正在生成题目解析，请稍候...")

def show_step2(session_id):
    st.header("🔍 第二部分：问题分析")
    
    st.markdown("""
    <div style="background-color: #f0f2f6; padding: 15px; border-radius: 8px; margin-bottom: 20px;">
    <strong>提示</strong>：需先读取题目（完成第一部分）
    </div>
    """, unsafe_allow_html=True)
    
    sessions = db.get_all_sessions()
    session_data = sessions.get(session_id, {})
    
    if session_data.get('step1_status') != 'completed':
        st.warning("请先完成第一部分：上传题目文件读取")
        if st.button("返回第一部分", key="back_to_step1_btn"):
            st.session_state['step'] = 1
            st.rerun()
        return
    
    col1, col2, col3 = st.columns([2, 1, 1])
    
    with col1:
        st.subheader("背景补充")
        background_supplement = st.text_area(
            "填写背景补充（如初始参数、约束条件）",
            height=150,
            key="background_supplement",
            help="切勿乱填"
        )
    
    with col2:
        st.subheader("控制区")
        
        analysis_model = st.selectbox(
            "选择大模型",
            ["问题分析1", "问题分析2", "问题分析3"],
            key="analysis_model_select"
        )
        
        if st.button("点击开始分析问题", key="analyze_problem_btn", type="primary"):
            db.update_session_data(session_id, {
                'analysis_model': analysis_model,
                'background_supplement': background_supplement,
                'step2_status': 'processing'
            })
            
            with st.spinner("AI正在分析问题..."):
                time.sleep(3)
            
            db.update_session_data(session_id, {'step2_status': 'processing'})
            st.info("⏳ 正在生成问题分析结果，请稍候...")
        
        if st.button("点击下载当前内容", key="download_step2_btn"):
            content = f"背景补充: {background_supplement}\n"
            content += f"选择模型: {analysis_model}\n"
            content += f"\n问题分析结果:\n{session_data.get('problem_analysis_result', '无')}"
            
            st.download_button(
                label="下载",
                data=content,
                file_name="step2_content.txt",
                mime="text/plain",
                key="step2_download_btn"
            )
    
    with col3:
        st.subheader("上传区")
        st.warning("建议下载修改后再上传，不要乱改标题结构")
        
        analysis_file = st.file_uploader(
            "上传问题分析文档",
            type=['docx'],
            key="analysis_file_upload",
            help="docx，最大1M"
        )
        
        if st.button("一键清除上传文件", key="clear_analysis_file_btn"):
            db.update_session_data(session_id, {'analysis_file': ''})
            st.success("上传文件已清除")
        
        if st.button("上传文档点击替换问题分析内容", key="replace_analysis_btn"):
            if analysis_file:
                content = process_uploaded_file(analysis_file)
                save_user_upload(analysis_file, session_id, 'analysis_file')
                if content:
                    db.update_session_data(session_id, {
                        'problem_analysis_result': content,
                        'analysis_file': analysis_file.name
                    })
                    st.success("问题分析内容已替换")
                else:
                    st.error("文件解析失败")
    
    st.markdown("---")
    
    col_display_left, col_display_right = st.columns([3, 1])
    
    with col_display_left:
        st.subheader("问题分析AI原文")
        
        problem_analysis_file_name, problem_analysis_file_data = get_result_file_data(session_id, 'problem_analysis')
        preview_content = get_file_preview_from_data(problem_analysis_file_name, problem_analysis_file_data)

        if preview_content:
            st.text_area("问题分析预览", preview_content, height=400, key="problem_analysis_preview")

            st.download_button(
                label="下载问题分析结果",
                data=problem_analysis_file_data,
                file_name=problem_analysis_file_name,
                key="download_problem_analysis_btn"
            )
        else:
            if session_data.get('step2_status') == 'processing':
                st.info("⏳ 正在生成问题分析结果...")
            else:
                st.info("点击「点击开始分析问题」后，系统将自动生成问题分析结果")
    
    with col_display_right:
        st.warning("勿频繁点击下载")
    
    st.markdown("---")
    
    st.markdown("""
    <div style="background-color: #dc2626; color: white; padding: 15px; border-radius: 8px; margin-bottom: 20px;">
    <strong>请选择绘图部分代码风格...</strong>
    </div>
    """, unsafe_allow_html=True)
    
    col_plot1, col_plot2 = st.columns(2)
    
    with col_plot1:
        plot_style = st.selectbox(
            "绘图风格设定",
            ["origin", "nature", "science"],
            key="plot_style_select",
            index=0
        )
    
    with col_plot2:
        color_style = st.selectbox(
            "渐变色彩设定",
            ["科学色彩感知", "感知均匀性", "视觉连续性", "清晰层次感", "科学可读性"],
            key="color_style_select",
            index=0
        )
    
    db.update_session_data(session_id, {
        'plot_style': plot_style,
        'color_style': color_style
    })
    
    problem_analysis_file_name, problem_analysis_file_data = get_result_file_data(session_id, 'problem_analysis')
    if session_data.get('step2_status') == 'processing' and problem_analysis_file_name:
        st.success("管理员已完成问题分析！")
        deduct_count = session_data.get('problem_analysis_deduct_count', 1)
        st.info(f"进入下一部分将扣除 {deduct_count} 次")
        if st.button("进入第三部分：代码生成", key="to_step3_btn"):
            success, msg = db.deduct_balance(session_id, deduct_count)
            if success:
                st.success(msg)
                st.session_state['step'] = 3
                st.rerun()
            else:
                st.error(msg)
    elif session_data.get('step2_status') == 'processing':
        st.info("⏳ 正在生成问题分析，请稍候...")
    
    if st.button("返回第一部分", key="back_to_step1_from_step2_btn"):
        st.session_state['step'] = 1
        st.rerun()

def show_step3(session_id):
    st.header("💻 第三部分：代码生成")
    
    st.markdown("""
    <div style="background-color: #f0f2f6; padding: 15px; border-radius: 8px; margin-bottom: 20px;">
    <strong>提示</strong>：针对五个问题分别生成代码。推荐Python。强调代码的连续性（后一题参考前一题）。
    </div>
    """, unsafe_allow_html=True)
    
    sessions = db.get_all_sessions()
    session_data = sessions.get(session_id, {})
    
    if session_data.get('step2_status') != 'completed':
        st.warning("请先完成第二部分：问题分析")
        if st.button("返回第二部分", key="back_to_step2_btn"):
            st.session_state['step'] = 2
            st.rerun()
        return
    
    for q_num in range(1, 6):
        st.markdown(f"---")
        st.markdown(f"""
        <div style="background-color: #374151; color: white; padding: 10px; border-radius: 8px; margin-bottom: 15px;">
        <strong>问题{q_num}代码实现（需要先执行第{q_num}部分）</strong>
        </div>
        """, unsafe_allow_html=True)
        
        col_params, col_upload = st.columns([2, 1])
        
        with col_params:
            st.markdown("#### 参数设置")
            
            algorithm_input = st.text_input(
                f"问题{q_num}算法要求",
                value="请采用XXX算法...",
                key=f"algorithm_q{q_num}"
            )
            
            col_model, col_lang = st.columns(2)
            
            with col_model:
                code_model = st.selectbox(
                    f"问题{q_num}选择大模型",
                    ["代码1", "代码2", "代码3", "代码4", "代码5", "代码6"],
                    key=f"code_model_q{q_num}",
                    index=2
                )
            
            with col_lang:
                lang = st.selectbox(
                    f"问题{q_num}选择编程语言",
                    ["python", "matlab"],
                    key=f"lang_q{q_num}",
                    index=0
                )
            
            st.warning("说明：代码是续写的，如有大改动需上传代码替换（不支持.m文件，需转txt）")
        
        with col_upload:
            st.markdown("#### 上传区")
            
            code_upload = st.file_uploader(
                f"问题{q_num}代码更新",
                type=['py', 'txt'],
                key=f"code_upload_q{q_num}",
                help="可选，py/txt，最大100KB"
            )
            
            if st.button(f"一键清除上传文件", key=f"clear_code_upload_q{q_num}"):
                db.update_session_data(session_id, {f'code_upload_q{q_num}': ''})
                st.success("上传文件已清除")
            
            if st.button(f"点击更换本问代码", key=f"replace_code_q{q_num}"):
                if code_upload:
                    content = process_uploaded_file(code_upload)
                    save_user_upload(code_upload, session_id, f'code_upload_q{q_num}')
                    if content:
                        db.update_session_data(session_id, {
                            f'code_result_q{q_num}': content,
                            f'code_upload_q{q_num}': code_upload.name
                        })
                        st.success(f"问题{q_num}代码已更换")
        
        col_display, col_buttons = st.columns([3, 1])
        
        with col_display:
            st.markdown(f"#### 问题{q_num}代码AI原文")
            
            code_file_name, code_file_data = get_result_file_data(session_id, f'code_q{q_num}')
            preview_content = get_file_preview_from_data(code_file_name, code_file_data)

            if preview_content:
                st.code(preview_content, language='python')

                st.download_button(
                    label=f"下载问题{q_num}代码",
                    data=code_file_data,
                    file_name=code_file_name,
                    key=f"download_code_q{q_num}_btn"
                )
            else:
                if session_data.get(f'step3_q{q_num}_status') == 'processing':
                    st.info(f"⏳ 正在生成问题{q_num}代码...")
                else:
                    st.info(f"点击「点击编写问题{q_num}代码」后，系统将自动生成代码")
        
        with col_buttons:
            st.markdown("#### 操作")
            
            if st.button(f"点击编写问题{q_num}代码", key=f"generate_code_q{q_num}", type="primary"):
                db.update_session_data(session_id, {
                    f'code_model_q{q_num}': code_model,
                    f'lang_q{q_num}': lang,
                    f'algorithm_q{q_num}': algorithm_input,
                    f'step3_q{q_num}_status': 'processing'
                })
                
                with st.spinner(f"AI正在编写问题{q_num}代码..."):
                    time.sleep(3)
                
                db.update_session_data(session_id, {f'step3_q{q_num}_status': 'processing'})
                st.info(f"⏳ 正在生成问题{q_num}代码，请稍候...")
            
            if st.button(f"点击下载当前内容", key=f"download_code_q{q_num}"):
                content = f"算法要求: {algorithm_input}\n"
                content += f"选择模型: {code_model}\n"
                content += f"编程语言: {lang}\n"
                content += f"\n代码:\n{code_result}"
                
                st.download_button(
                    label="下载",
                    data=content,
                    file_name=f"problem_{q_num}_code.txt",
                    mime="text/plain",
                    key=f"download_code_q{q_num}_btn"
                )
            
            st.warning("勿频繁点击下载，预计5-8分钟")
    
    code_file_name_q1, code_file_data_q1 = get_result_file_data(session_id, 'code_q1')
    if session_data.get('step3_q1_status') == 'processing' and code_file_name_q1:
        st.success("管理员已完成代码生成！")
        total_deduct = 0
        for q_num in range(1, 6):
            total_deduct += session_data.get(f'code_deduct_count_q{q_num}', 1)
        st.info(f"进入下一部分将扣除 {total_deduct} 次")
        if st.button("进入第四部分：论文写作", key="to_step4_btn"):
            success, msg = db.deduct_balance(session_id, total_deduct)
            if success:
                st.success(msg)
                st.session_state['step'] = 4
                st.rerun()
            else:
                st.error(msg)
    elif session_data.get('step3_q1_status') == 'processing':
        st.info("⏳ 正在生成代码，请稍候...")
    
    if st.button("返回第二部分", key="back_to_step2_from_step3_btn"):
        st.session_state['step'] = 2
        st.rerun()

def show_step4(session_id):
    st.header("📝 第四部分：论文写作")
    
    st.markdown("""
    <div style="background-color: #f0f2f6; padding: 15px; border-radius: 8px; margin-bottom: 20px;">
    <strong>提示</strong>：基于前面的代码和运行结果，自动生成论文的各个章节。
    </div>
    """, unsafe_allow_html=True)
    
    sessions = db.get_all_sessions()
    session_data = sessions.get(session_id, {})
    
    for q_num in range(1, 6):
        st.markdown(f"---")
        st.markdown(f"""
        <div style="background-color: #374151; color: white; padding: 10px; border-radius: 8px; margin-bottom: 15px;">
        <strong>问题{q_num}数学模型建立与求解</strong>
        </div>
        """, unsafe_allow_html=True)
        
        st.markdown("""
        <div style="background-color: #f97316; color: white; padding: 10px; border-radius: 8px; margin-bottom: 15px;">
        提示：需上传代码（py文件，不支持matlab），注意主程序位置，结果需保存到txt或excel。
        </div>
        """, unsafe_allow_html=True)
        
        col_upload1, col_upload2, col_upload3 = st.columns(3)
        
        with col_upload1:
            paper_code = st.file_uploader(
                f"上传问题{q_num}的代码",
                type=['py', 'txt'],
                key=f"paper_code_q{q_num}"
            )
        
        with col_upload2:
            paper_result = st.file_uploader(
                f"上传问题{q_num}代码跑出的结果",
                type=['txt'],
                key=f"paper_result_q{q_num}"
            )
        
        with col_upload3:
            paper_image = st.file_uploader(
                f"上传问题{q_num}代码跑出的结果图",
                type=['png', 'jpg', 'jpeg'],
                key=f"paper_image_q{q_num}"
            )
        
        col_right, col_display = st.columns([1, 3])
        
        with col_right:
            st.markdown("#### 操作")
            
            paper_model = st.selectbox(
                f"问题{q_num}选择模型",
                ["模型1", "模型2", "模型3", "模型4", "模型5", "模型6"],
                key=f"paper_model_q{q_num}",
                index=2
            )
            
            if st.button(f"点击撰写问题{q_num}模型建立与求解", key=f"write_paper_q{q_num}", type="primary"):
                db.update_session_data(session_id, {
                    f'paper_model_q{q_num}': paper_model,
                    f'step4_q{q_num}_status': 'processing'
                })
                
                if paper_code:
                    code_content = process_uploaded_file(paper_code)
                    db.update_session_data(session_id, {f'paper_code_content_q{q_num}': code_content})
                    save_user_upload(paper_code, session_id, f'paper_code_q{q_num}')
                
                if paper_result:
                    result_content = process_uploaded_file(paper_result)
                    db.update_session_data(session_id, {f'paper_result_content_q{q_num}': result_content})
                    save_user_upload(paper_result, session_id, f'paper_result_q{q_num}')
                
                if paper_image:
                    db.save_file(session_id, f"upload_paper_image_q{q_num}", paper_image.name, paper_image.getvalue())
                    db.update_session_data(session_id, {f'paper_image_name_q{q_num}': paper_image.name})
                    save_user_upload(paper_image, session_id, f'paper_image_q{q_num}')
                
                with st.spinner(f"AI正在撰写问题{q_num}模型建立与求解..."):
                    time.sleep(3)
                
                db.update_session_data(session_id, {f'step4_q{q_num}_status': 'processing'})
                st.info(f"⏳ 正在生成问题{q_num}论文，请稍候...")
            
            if st.button(f"一键清除上传文件", key=f"clear_paper_files_q{q_num}"):
                db.update_session_data(session_id, {
                    f'paper_code_q{q_num}': '',
                    f'paper_result_q{q_num}': '',
                    f'paper_image_q{q_num}': ''
                })
                st.success("上传文件已清除")
            
            if st.button(f"点击下载当前内容", key=f"download_paper_q{q_num}"):
                paper_content = session_data.get(f'paper_result_q{q_num}', '')
                st.download_button(
                    label="下载",
                    data=paper_content,
                    file_name=f"problem_{q_num}_paper.txt",
                    mime="text/plain",
                    key=f"download_paper_q{q_num}_btn"
                )
        
        with col_display:
            st.markdown(f"#### 问题{q_num}论文内容")
            
            paper_file_name, paper_file_data = get_result_file_data(session_id, f'paper_q{q_num}')
            preview_content = get_file_preview_from_data(paper_file_name, paper_file_data)

            if preview_content:
                st.text_area(f"问题{q_num}论文预览", preview_content, height=300, key=f"paper_preview_q{q_num}")

                st.download_button(
                    label=f"下载问题{q_num}论文",
                    data=paper_file_data,
                    file_name=paper_file_name,
                    key=f"download_paper_q{q_num}_btn"
                )
            else:
                if session_data.get(f'step4_q{q_num}_status') == 'processing':
                    st.info(f"⏳ 正在生成问题{q_num}论文...")
                else:
                    st.info(f"点击「点击撰写问题{q_num}模型建立与求解」后，系统将自动生成论文")
    
    st.markdown("---")
    
    st.markdown("""
    <div style="background-color: #dc2626; color: white; padding: 15px; border-radius: 8px; margin-bottom: 20px;">
    <strong>摘要、问题重述、模型假设...</strong>
    </div>
    """, unsafe_allow_html=True)
    
    col_comp_left, col_comp_right = st.columns([3, 1])
    
    with col_comp_left:
        st.markdown("#### AI生成的综合内容")
        
        comprehensive_file_name, comprehensive_file_data = get_result_file_data(session_id, 'comprehensive')
        preview_content = get_file_preview_from_data(comprehensive_file_name, comprehensive_file_data)

        if preview_content:
            st.text_area("综合内容预览", preview_content, height=400, key="comprehensive_preview")

            st.download_button(
                label="下载综合写作内容",
                data=comprehensive_file_data,
                file_name=comprehensive_file_name,
                key="download_comprehensive_btn"
            )
        else:
            if session_data.get('comprehensive_status') == 'processing':
                st.info("⏳ 正在生成综合写作内容...")
            else:
                st.info("点击「点击撰写摘要等其余内容」后，系统将自动生成综合写作内容")
    
    with col_comp_right:
        st.markdown("#### 操作")
        
        comprehensive_model = st.selectbox(
            "选择模型",
            ["模型1", "模型2", "模型3", "模型4", "模型5", "模型6"],
            key="comprehensive_model",
            index=2
        )
        
        if st.button("点击撰写摘要等其余内容", key="write_comprehensive_btn", type="primary"):
            db.update_session_data(session_id, {
                'comprehensive_model': comprehensive_model,
                'comprehensive_status': 'processing'
            })
            
            with st.spinner("AI正在撰写摘要、问题重述、模型假设等内容..."):
                time.sleep(3)
            
            db.update_session_data(session_id, {'comprehensive_status': 'processing'})
            st.info("⏳ 正在生成综合写作内容，请稍候...")
    
    st.markdown("---")
    
    if st.button("上面内容生成完毕后可点击一键排版", key="format_paper_btn", type="primary"):
        db.update_session_data(session_id, {'format_status': 'processing'})
        
        with st.spinner("AI正在排版论文..."):
            time.sleep(3)
        
        db.update_session_data(session_id, {'format_status': 'processing'})
        st.info("⏳ 正在排版论文，请稍候...")
    
    st.markdown("---")
    
    st.markdown("""
    <div style="background-color: #374151; color: white; padding: 15px; border-radius: 8px; margin-bottom: 20px;">
    <strong>最终排版后的论文内容展示</strong>
    </div>
    """, unsafe_allow_html=True)
    
    formatted_file_name, formatted_file_data = get_result_file_data(session_id, 'formatted')
    preview_content = get_file_preview_from_data(formatted_file_name, formatted_file_data)

    if preview_content:
        st.text_area("排版后论文预览", preview_content, height=500, key="formatted_preview")
        
        total_paper_deduct = session_data.get('formatted_deduct_count', 1)
        for q_num in range(1, 6):
            total_paper_deduct += session_data.get(f'paper_deduct_count_q{q_num}', 0)
        total_paper_deduct += session_data.get('comprehensive_deduct_count', 0)
        
        st.info(f"下载最终论文将扣除 {total_paper_deduct} 次")
        
        if st.button("下载排版后论文", key="download_formatted_btn"):
            success, msg = db.deduct_balance(session_id, total_paper_deduct, "模块二-论文写作")
            if success:
                st.success(msg)
                st.download_button(
                    label="点击下载",
                    data=formatted_file_data,
                    file_name=formatted_file_name,
                    key="final_download_btn"
                )
            else:
                st.error(msg)
    else:
        if session_data.get('format_status') == 'processing':
            st.info("⏳ 正在排版论文...")
        else:
            st.info("点击「一键排版」后，系统将自动排版论文")
    
    if st.button("返回第三部分", key="back_to_step3_from_step4_btn"):
        st.session_state['step'] = 3
        st.rerun()

if __name__ == "__main__":
    main()



