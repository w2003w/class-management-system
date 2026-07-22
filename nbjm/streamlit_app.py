import streamlit as st
import asyncio
import json
import os
import base64
import tempfile
import time
import sys
import re
import random
import string
import db
import theme

def generate_session_id():
    return ''.join(random.choices(string.ascii_letters + string.digits, k=8))

def get_or_create_session_id():
    import time
    session_id = st.session_state.get('session_id')
    if session_id:
        session_created = st.session_state.get('session_created_time', 0)
        if time.time() - session_created < 7200:
            return session_id
    
    new_session_id = generate_session_id()
    st.session_state['session_id'] = new_session_id
    st.session_state['session_created_time'] = time.time()
    return new_session_id

import pandas as pd
import numpy as np
import matplotlib
matplotlib.use('Agg')
import matplotlib.pyplot as plt
import matplotlib.font_manager as fm
import seaborn as sns

plt.rcParams['font.sans-serif'] = ['SimHei', 'Microsoft YaHei', 'DejaVu Sans']
plt.rcParams['axes.unicode_minus'] = False

st.set_page_config(page_title="数学建模智能体", layout="wide", initial_sidebar_state="expanded")

is_dark = theme.apply_theme()

MODULE_NAMES = {
    "问题分析": "问题分析",
    "模型推荐": "模型推荐",
    "模型评审": "模型评审",
    "代码生成": "代码生成",
    "敏感性分析": "敏感性分析",
    "论文写作": "论文写作",
    "论文评审": "论文评审",
    "论文评估": "论文评估",
    "代码执行": "代码执行",
    "论文审计": "论文审计",
}

def get_model_deduct_count(model_name, module_name):
    matched_model = None
    for key in ["qwen-max", "qwen-plus", "qwen3.7-max-2026-06-08", "qwen3.7-max-2026-05-17", "qwen3.7-plus", "qwen3-72b-instruct", "qwen3-8b-instruct", "qwen2-14b-instruct", "qwen2-7b-instruct", "qwen-turbo", "deepseek-v4-pro", "deepseek-v4-flash"]:
        if key.lower() in model_name.lower():
            matched_model = key
            break
    
    if matched_model and module_name:
        deduct_count = db.get_model_deduct_rule(matched_model, module_name)
        return deduct_count
    
    for key, value in [("qwen-max", 3), ("qwen-plus", 2), ("qwen3.7-max", 4), ("qwen3.7-plus", 3), ("qwen3-72b", 3), ("qwen3-8b", 2), ("qwen2-14b", 2), ("qwen2-7b", 1), ("qwen-turbo", 1), ("deepseek-v4-pro", 3), ("deepseek-v4-flash", 1)]:
        if key.lower() in model_name.lower():
            return value
    return 1

if 'initialized' not in st.session_state:
    st.session_state['initialized'] = True
    st.session_state['problem_text'] = ""
    st.session_state['analysis_result'] = ""
    st.session_state['recommendation_result'] = ""
    st.session_state['code_result'] = ""
    st.session_state['paper_result'] = ""
    st.session_state['uploaded_file_name'] = ""
    st.session_state['generated_images'] = []

if 'generated_images' not in st.session_state:
    st.session_state['generated_images'] = []

try:
    from config import settings
    from llm.providers import load_providers, get_provider
    from agents import Coordinator
    from tools.code_executor import run_python_code
    from tools.data_processor import parse_file, clean_text, analyze_data_file
    from tools.paper_generator import generate_paper
    from tools.qa_auditor import generate_qa_report
    from knowledge.model_library import (
        MODEL_LIBRARY, load_model_library, save_model_library,
        add_model, update_model, delete_model, get_model, get_all_models,
        get_models_by_category
    )
    from knowledge.image_library import (
        IMAGE_LIBRARY, load_image_library, save_image_library,
        add_image_type, update_image_type, delete_image_type, get_image_type,
        get_all_image_types, get_images_by_category, get_images_for_model,
        get_all_categories as get_image_categories
    )
    from knowledge.paper_knowledge import (
        add_paper, get_all_papers, delete_paper,
        get_competitions, get_competition_info, get_competition_prompts,
        get_all_models_from_knowledge, get_all_images_from_knowledge,
        get_all_prompts_from_competition
    )
    IMPORT_OK = True
except Exception as e:
    IMPORT_ERROR = str(e)
    IMPORT_OK = False

def get_available_providers():
    providers = load_providers()
    return {p.name: p for p in providers if p.available}

def parse_json_safe(json_str):
    if not json_str:
        return None
    if isinstance(json_str, dict):
        return json_str
    if not isinstance(json_str, str):
        print(f"⚠️ JSON解析失败: 输入不是字符串类型，类型: {type(json_str)}")
        return None
    try:
        original_str = json_str
        
        json_str = json_str.replace("```json", "").replace("```", "").strip()
        
        match = re.search(r'\{.*\}', json_str, re.DOTALL)
        if match:
            extracted_str = match.group(0)
            print(f"[DEBUG] 正则提取成功，长度: {len(extracted_str)}")
            print(f"[DEBUG] 提取内容前300字符:\n{extracted_str[:300]}")
            json_str = extracted_str
        
        result = json.loads(json_str)
        print(f"[DEBUG] JSON解析成功，类型: {type(result)}")
        if isinstance(result, dict):
            print(f"[DEBUG] JSON键: {list(result.keys())}")
        return result
    except Exception as e:
        print(f"⚠️ JSON解析失败: {type(e).__name__}: {e}")
        print(f"⚠️ 原始字符串长度: {len(original_str)}")
        try:
            print(f"⚠️ 清理后字符串长度: {len(json_str)}")
            print(f"⚠️ 清理后字符串前300字符:\n{json_str[:300]}")
        except Exception:
            print(f"⚠️ 清理后内容无法显示，类型: {type(json_str)}")
        return None

def display_model_info(model_name):
    info = get_model(model_name)
    if not info:
        st.warning(f"未找到模型「{model_name}」的信息")
        return
    
    st.subheader(model_name)
    col1, col2 = st.columns(2)
    
    with col1:
        st.markdown(f"**类别**: {info.get('category', '未知')}")
        st.markdown(f"**适用场景**: {info.get('applicable', '')}")
    
    with col2:
        st.markdown("**优点**:")
        for p in info.get('pros', []):
            st.markdown(f"✅ {p}")
    
    st.markdown("**缺点**:")
    for c in info.get('cons', []):
        st.markdown(f"⚠️ {c}")
    
    if 'code_template' in info:
        st.markdown("**代码模板**:")
        st.code(info['code_template'], language='python')

def safe_join(items):
    if not items:
        return ""
    result = []
    for item in items:
        if isinstance(item, list):
            result.extend(str(i) for i in item)
        else:
            result.append(str(item))
    return ', '.join(result)

def format_latex_formula(formula):
    if not formula:
        return ""
    
    formula = formula.strip()
    
    if formula.startswith('$$') and formula.endswith('$$'):
        return formula
    elif formula.startswith('$') and formula.endswith('$'):
        return '$$' + formula[1:-1] + '$$'
    else:
        return '$$' + formula + '$$'

def display_analysis(analysis_json):
    data = parse_json_safe(analysis_json)
    if not data:
        st.markdown(analysis_json)
        return
    
    st.markdown(f"**问题总数**: {len(data.get('questions', []))}")
    st.markdown(f"**整体分析**: {data.get('overall_summary', '')}")
    
    for q in data.get('questions', []):
        with st.expander(f"问题 {q.get('number', '')}: {q.get('content', '')[:50]}..."):
            st.markdown(f"**类型**: {q.get('type', '')}")
            st.markdown(f"**输入**: {safe_join(q.get('input', []))}")
            st.markdown(f"**输出**: {safe_join(q.get('output', []))}")
            st.markdown(f"**约束**: {safe_join(q.get('constraints', []))}")
            st.markdown(f"**建模思路**: {q.get('model_approach', '')}")
            st.markdown(f"**数据需求**: {safe_join(q.get('data_requirements', []))}")
            st.markdown(f"**风险点**: {safe_join(q.get('risks', []))}")

def display_recommendations(recommendations_json):
    data = parse_json_safe(recommendations_json)
    if not data:
        st.warning("⚠️ 无法解析模型推荐结果，显示原始内容：")
        st.code(recommendations_json, language='json')
        return
    
    model_versions = data.get('model_versions', [])
    if model_versions:
        st.markdown("### 📈 模型阶段演进")
        for mv in model_versions:
            stage = mv.get('stage', '')
            model_name = mv.get('model_name', '')
            with st.expander(f"[{stage.upper()}] {model_name}"):
                description = mv.get('description', '')
                if description:
                    st.markdown(f"**模型描述**: {description}")
                
                equations = mv.get('equations', [])
                if equations and isinstance(equations, list):
                    st.markdown("**核心公式**:")
                    for eq in equations:
                        try:
                            st.latex(eq)
                        except:
                            st.markdown(f"${eq}$")
                
                variables = mv.get('variables', {})
                if variables and isinstance(variables, dict):
                    st.markdown("**变量说明**:")
                    var_table = "| 变量 | 含义 |\n|------|------|\n"
                    for var, desc in variables.items():
                        var_table += f"| ${var}$ | {desc} |\n"
                    st.markdown(var_table)
                
                notes = mv.get('notes', '')
                if notes:
                    st.markdown(f"**改进点**: {notes}")
                
                figure_purposes = mv.get('figure_purposes', [])
                if figure_purposes and isinstance(figure_purposes, list):
                    st.markdown("**图表需求**:")
                    for fp in figure_purposes:
                        st.markdown(f"- {fp}")
                
                derivation_steps = mv.get('derivation_steps', [])
                if derivation_steps and isinstance(derivation_steps, list):
                    st.markdown("**推导过程**:")
                    for step in derivation_steps:
                        with st.expander(f"🔹 {step.get('title', '')}"):
                            st.markdown(f"**陈述**: {step.get('statement', '')}")
                            result = step.get('result', '')
                            if result:
                                try:
                                    st.latex(result)
                                except:
                                    st.markdown(f"**结果**: {result}")
    
    recommendations = data.get('recommendations', [])
    if recommendations and isinstance(recommendations, list):
        st.markdown("### 📋 各问题模型推荐")
        for rec in recommendations:
            with st.expander(f"问题 {rec.get('question_number', '')}"):
                st.markdown(f"**任务类型**: {rec.get('task_type', '')}")
                st.markdown(f"**基线模型**: {rec.get('baseline_model', '')}")
                
                advanced_models = rec.get('advanced_models', [])
                if advanced_models and isinstance(advanced_models, list):
                    st.markdown(f"**改进模型**: {', '.join(advanced_models)}")
                else:
                    st.markdown(f"**改进模型**: {advanced_models}")
                
                st.markdown(f"**选择理由**: {rec.get('model_description', '')}")
                st.markdown(f"**验证方案**: {rec.get('validation_plan', '')}")
                
                risk_points = rec.get('risk_points', [])
                if risk_points and isinstance(risk_points, list):
                    st.markdown(f"**风险点**: {', '.join(risk_points)}")
                else:
                    st.markdown(f"**风险点**: {risk_points}")
                
                if rec.get('recommended_images'):
                    st.markdown("**推荐图表类型**:")
                    for img in rec.get('recommended_images', []):
                        img_info = get_image_type(img)
                        if img_info:
                            st.markdown(f"📊 **{img}** ({img_info.get('category', '')}): {img_info.get('description', '')}")
                        else:
                            st.markdown(f"📊 **{img}**")
                    if rec.get('image_description'):
                        st.markdown(f"**图表选择理由**: {rec.get('image_description')}")
    
    overall = data.get('overall_recommendation', '')
    if overall:
        st.markdown(f"### 🎯 总体推荐\n{overall}")
    
    model_selection_strategy = data.get('model_selection_strategy', '')
    if model_selection_strategy:
        st.markdown(f"### 📝 模型选择策略\n{model_selection_strategy}")

def display_code(code_json):
    data = parse_json_safe(code_json)
    if not data:
        st.markdown(code_json)
        return
    
    if 'code_sections' in data:
        for section in data.get('code_sections', []):
            with st.expander(f"问题 {section.get('question_number', '')}: {section.get('model_name', '')}"):
                st.markdown(f"**建模分析**: {section.get('analysis', '')}")
                st.markdown(f"**核心公式**: {format_latex_formula(section.get('formula', ''))}")
                st.code(section.get('code', ''), language='python')
                
                if section.get('output_images'):
                    st.markdown("**预计生成图片**:")
                    for img_name in section.get('output_images', []):
                        st.markdown(f"🖼️ {img_name}")
    
    elif 'main_code' in data:
        main_code = data.get('main_code')
        
        if data.get('errors'):
            st.markdown("### ⚠️ 错误信息")
            for error in data['errors']:
                st.error(f"• {error}")
        
        figure_artifacts = data.get('figure_artifacts', [])
        if figure_artifacts:
            st.markdown("### 📊 图代码生成详情")
            for i, artifact in enumerate(figure_artifacts):
                success_icon = "✅" if artifact.get('success') else "❌"
                with st.expander(f"{success_icon} 图{i+1}: {artifact.get('purpose', '')}"):
                    st.markdown(f"**状态**: {'成功' if artifact.get('success') else '失败'}")
                    if artifact.get('error_kind'):
                        st.markdown(f"**错误类型**: {artifact['error_kind']}")
                    if artifact.get('stderr'):
                        st.markdown(f"**错误信息**:")
                        st.text(artifact['stderr'][:1000])
        
        if main_code:
            success_icon = "✅" if main_code.get('success') else "❌"
            with st.expander(f"{success_icon} {main_code.get('purpose', '主方案')}"):
                if main_code.get('success'):
                    st.markdown(f"**运行状态**: 成功")
                    if main_code.get('stdout'):
                        st.markdown(f"**输出结果**:")
                        st.text(main_code['stdout'][:2000] + ("..." if len(main_code['stdout']) > 2000 else ""))
                    
                    artifact_paths = main_code.get('artifact_paths', [])
                    if artifact_paths:
                        st.markdown(f"**生成图表**:")
                        for path in artifact_paths:
                            if path.lower().endswith('.png'):
                                try:
                                    st.image(path)
                                except Exception:
                                    st.markdown(f"🖼️ {path}")
                else:
                    st.markdown(f"**运行状态**: 失败")
                    st.markdown(f"**错误类型**: {main_code.get('error_kind', '')}")
                    if main_code.get('stderr'):
                        st.markdown(f"**错误信息**:")
                        st.text(main_code['stderr'][:2000] + ("..." if len(main_code['stderr']) > 2000 else ""))
                
                if main_code.get('code'):
                    st.markdown(f"**代码**:")
                    st.code(main_code['code'], language='python')
                else:
                    st.markdown(f"**代码**:")
                    st.info("代码内容为空或未生成")
                    st.markdown(f"**代码长度**: {len(main_code.get('code', ''))}")
        
        baseline_codes = data.get('baseline_codes', [])
        if baseline_codes:
            st.markdown(f"### 📊 对照方案代码（共{len(baseline_codes)}个）")
            for i, bl in enumerate(baseline_codes):
                success_icon = "✅" if bl.get('success') else "❌"
                category = bl.get('category', '')
                cat_name = category.split(':')[1] if ':' in category else f"对照方案{i+1}"
                with st.expander(f"{success_icon} {cat_name}: {bl.get('purpose', '')}"):
                    if bl.get('success'):
                        st.markdown(f"**运行状态**: 成功")
                        if bl.get('stdout'):
                            st.markdown(f"**输出结果**:")
                            st.text(bl['stdout'][:2000] + ("..." if len(bl['stdout']) > 2000 else ""))
                        
                        artifact_paths = bl.get('artifact_paths', [])
                        if artifact_paths:
                            st.markdown(f"**生成图表**:")
                            for path in artifact_paths:
                                if path.lower().endswith('.png'):
                                    try:
                                        st.image(path)
                                    except Exception:
                                        st.markdown(f"🖼️ {path}")
                    else:
                        st.markdown(f"**运行状态**: 失败")
                        st.markdown(f"**错误类型**: {bl.get('error_kind', '')}")
                        if bl.get('stderr'):
                            st.markdown(f"**错误信息**:")
                            st.text(bl['stderr'][:2000] + ("..." if len(bl['stderr']) > 2000 else ""))
                    
                    if bl.get('code'):
                        st.markdown(f"**代码**:")
                        st.code(bl['code'], language='python')
    
    else:
        st.markdown("无法解析代码结果格式")

def convert_latex_format(content):
    if not content:
        return ""
    content = content.replace('\\[', '$$').replace('\\]', '$$')
    content = content.replace('\\(', '$').replace('\\)', '$')
    return content

def display_paper(paper_json):
    data = parse_json_safe(paper_json)
    if not data:
        st.markdown(paper_json)
        return
    
    st.title(data.get('title', '数学建模竞赛论文'))
    
    st.markdown("## 摘要")
    st.markdown(convert_latex_format(data.get('abstract', '')))
    
    st.markdown("## Abstract")
    st.markdown(convert_latex_format(data.get('abstract_en', '')))
    
    generated_images = st.session_state.get('generated_images', [])
    
    for sec in data.get('sections', []):
        st.markdown(f"## {sec.get('heading', '')}")
        
        if sec.get('content'):
            content = convert_latex_format(sec.get('content'))
            st.markdown(content)
            
            import re
            placeholders = re.findall(r'【图(\d+)：问题(\d+)(.*?)】', content)
            for fig_num, q_num, desc in placeholders:
                for img_path in generated_images:
                    if f"q{q_num}" in img_path.lower():
                        if os.path.exists(img_path):
                            st.image(img_path, caption=f"图{fig_num}：问题{q_num}{desc}")
                        else:
                            _sid = st.session_state.get('session_id', '')
                            _fname = os.path.basename(img_path)
                            _fn, _fd = db.get_file(_sid, f"output_{_fname}")
                            if _fd:
                                st.image(_fd, caption=f"图{fig_num}：问题{q_num}{desc}")
        
        for subsection in sec.get('subsections', []):
            st.markdown(f"### {subsection.get('heading', '')}")
            content = convert_latex_format(subsection.get('content', ''))
            st.markdown(content)
            
            import re
            placeholders = re.findall(r'【图(\d+)：问题(\d+)(.*?)】', content)
            for fig_num, q_num, desc in placeholders:
                for img_path in generated_images:
                    if f"q{q_num}" in img_path.lower():
                        if os.path.exists(img_path):
                            st.image(img_path, caption=f"图{fig_num}：问题{q_num}{desc}")
                        else:
                            _sid = st.session_state.get('session_id', '')
                            _fname = os.path.basename(img_path)
                            _fn, _fd = db.get_file(_sid, f"output_{_fname}")
                            if _fd:
                                st.image(_fd, caption=f"图{fig_num}：问题{q_num}{desc}")
        
        for table in sec.get('tables', []):
            caption = table.get('caption', '')
            headers = table.get('headers', [])
            rows = table.get('rows', [])
            
            if caption:
                st.markdown(f"**{caption}**")
            
            if headers and rows:
                table_html = "<table border='1' style='border-collapse: collapse; width: 100%;'>"
                table_html += "<thead><tr>"
                for header in headers:
                    table_html += f"<th style='border: 1px solid #ddd; padding: 8px; text-align: center; background-color: #f2f2f2;'>{header}</th>"
                table_html += "</tr></thead><tbody>"
                
                for row in rows:
                    table_html += "<tr>"
                    for cell in row:
                        table_html += f"<td style='border: 1px solid #ddd; padding: 8px; text-align: center;'>{cell}</td>"
                    table_html += "</tr>"
                
                table_html += "</tbody></table>"
                st.markdown(table_html, unsafe_allow_html=True)
        
        for img in sec.get('images', []):
            img_path = img.get('path', '')
            img_caption = img.get('caption', '')
            if img_path:
                if os.path.exists(img_path):
                    st.image(img_path, caption=img_caption if img_caption else None)
                else:
                    _sid = st.session_state.get('session_id', '')
                    _fname = os.path.basename(img_path)
                    _fn, _fd = db.get_file(_sid, f"output_{_fname}")
                    if _fd:
                        st.image(_fd, caption=img_caption if img_caption else None)
                    else:
                        st.warning(f"图片未找到: {os.path.basename(img_path)}")
        
        st.markdown("---")

def process_uploaded_file(file):
    file_ext = file.name.split('.')[-1].lower()
    
    if file_ext in ['pdf', 'docx']:
        try:
            with tempfile.NamedTemporaryFile(delete=False, suffix=f".{file_ext}") as f:
                f.write(file.getvalue())
                temp_path = f.name
            
            content = parse_file(temp_path)
            os.unlink(temp_path)
            return clean_text(content)
        except Exception as e:
            return None
    else:
        try:
            content = file.getvalue().decode('utf-8', errors='ignore')
            if len(content.strip()) > 0:
                return clean_text(content)
        except:
            pass
        
        try:
            with tempfile.NamedTemporaryFile(delete=False, suffix=f".{file_ext}") as f:
                f.write(file.getvalue())
                temp_path = f.name
            
            content = parse_file(temp_path)
            os.unlink(temp_path)
            return clean_text(content)
        except Exception as e:
            return None

def run_llm_task(task_func, *args, timeout=300, **kwargs):
    try:
        loop = asyncio.new_event_loop()
        asyncio.set_event_loop(loop)
        coroutine = task_func(*args, **kwargs)
        result = loop.run_until_complete(asyncio.wait_for(coroutine, timeout=timeout))
        loop.close()
        return result, None
    except asyncio.TimeoutError:
        return None, f"操作超时（超过{timeout}秒），请重试"
    except Exception as e:
        return None, str(e)

def get_all_categories():
    library = get_all_models()
    categories = set()
    for info in library.values():
        categories.add(info.get('category', '其他'))
    return sorted(list(categories))

def main():
    if not IMPORT_OK:
        st.error(f"模块导入失败: {IMPORT_ERROR}")
        return
    
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
        st.sidebar.title("数学建模智能体")
        
        session_id = get_or_create_session_id()
        balance = db.get_user_balance(session_id)
        
        import threading
        def cleanup_task():
            try:
                db.cleanup_expired_files(hours=1)
            except Exception:
                pass
        
        if 'cleanup_done' not in st.session_state:
            st.session_state['cleanup_done'] = True
            threading.Thread(target=cleanup_task, daemon=True).start()
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
    
    providers = get_available_providers()
    if not providers:
        st.error("未配置任何LLM提供商，请在.env文件中配置API Key")
        return
    
    selected_provider = st.sidebar.selectbox("选择模型提供商", list(providers.keys()), key="provider_select")
    
    provider = providers[selected_provider]
    if provider.models:
        selected_model = st.sidebar.selectbox("选择模型", provider.models, 
                                              index=provider.models.index(provider.model) if provider.model in provider.models else 0,
                                              key="model_select")
    else:
        selected_model = provider.model
    
    competitions = get_competitions()
    competition_options = ["不选择（通用）"] + competitions
    selected_competition = st.sidebar.selectbox("选择竞赛风格", competition_options, key="competition_select")
    if selected_competition == "不选择（通用）":
        selected_competition = None
    
    st.sidebar.markdown("---")
    st.sidebar.markdown("## 一键全流程")
    if st.sidebar.button("🔄 运行完整流程", key="full_process_btn"):
        if not st.session_state.get('problem_text'):
            st.warning("请先输入问题描述")
        else:
            run_full_process(selected_provider)
    
    tab = st.session_state.get('tab_select', '问题分析')
    
    modules = [
        {"name": "问题分析", "icon": "🔍", "desc": "深入分析赛题，提取关键信息"},
        {"name": "模型推荐", "icon": "🧠", "desc": "推荐合适的数学模型"},
        {"name": "模型评审", "icon": "📋", "desc": "评审推荐模型的合理性"},
        {"name": "代码生成", "icon": "💻", "desc": "自动生成模型代码"},
        {"name": "敏感性分析", "icon": "📊", "desc": "分析模型参数敏感性"},
        {"name": "论文写作", "icon": "📝", "desc": "自动撰写论文内容"},
        {"name": "论文评审", "icon": "✓", "desc": "评审论文质量"},
        {"name": "论文评估", "icon": "⭐", "desc": "评估论文得分"},
        {"name": "模型知识库", "icon": "📚", "desc": "浏览模型知识"},
        {"name": "代码执行", "icon": "▶", "desc": "在线执行代码"},
        {"name": "论文审计", "icon": "🔍", "desc": "审计论文合规性"},
        {"name": "论文学习", "icon": "📖", "desc": "学习优秀论文"}
    ]
    
    st.markdown("### 🚀 功能模块")
    
    # 使用 Streamlit 原生按钮
    cols = st.columns(3)
    for i, module in enumerate(modules):
        with cols[i % 3]:
            is_selected = tab == module['name']
            button_type = "primary" if is_selected else "secondary"
            
            if st.button(
                f"{module['icon']} {module['name']}",
                key=f"module_btn_{module['name']}",
                help=module['desc'],
                use_container_width=True,
                type=button_type,
                on_click=lambda m=module['name']: st.session_state.update({'tab_select': m})
            ):
                st.session_state['tab_select'] = module['name']
                st.rerun()
    
    st.markdown("---")
    
    if tab == "问题分析":
        st.header("🔍 问题分析")
        
        uploaded_file = st.file_uploader(
            "上传赛题文件（TXT/PDF/DOCX）", 
            type=['pdf', 'docx', 'txt'], 
            key="file_uploader",
            help="支持文本文件、PDF和Word文档"
        )
        
        if uploaded_file is not None:
            with st.spinner("正在解析文件..."):
                time.sleep(0.3)
                file_content = process_uploaded_file(uploaded_file)
                if file_content:
                    st.session_state['problem_text'] = file_content
                    st.session_state['uploaded_file_name'] = uploaded_file.name
        
        if st.session_state.get('uploaded_file_name'):
            st.info(f"当前使用文件: {st.session_state['uploaded_file_name']}")
        
        st.markdown("---")
        st.subheader("📊 数据文件上传")
        
        data_files = st.file_uploader(
            "上传数据文件（CSV/XLS/XLSX）", 
            type=['csv', 'xls', 'xlsx'], 
            key="data_uploader",
            help="支持CSV和Excel文件，代码生成时会自动读取和使用这些数据",
            accept_multiple_files=True
        )
        
        if data_files is not None and len(data_files) > 0:
            uploaded_data_files = []
            for data_file in data_files:
                file_data = data_file.getvalue()
                # 保存到数据库
                db.save_file(session_id, f"uploaded_{data_file.name}", data_file.name, file_data)
                # 写入临时文件供本地处理使用
                ext = os.path.splitext(data_file.name)[1]
                tmp = tempfile.NamedTemporaryFile(delete=False, suffix=ext)
                tmp.write(file_data)
                tmp.close()
                uploaded_data_files.append(tmp.name)
            
            st.session_state['uploaded_data_files'] = uploaded_data_files
            
            st.success(f"已上传 {len(data_files)} 个数据文件")
            for data_file in data_files:
                st.info(f"- {data_file.name}")
            
            for data_file in data_files:
                try:
                    file_data = data_file.getvalue()
                    ext = os.path.splitext(data_file.name)[1]
                    tmp = tempfile.NamedTemporaryFile(delete=False, suffix=ext)
                    tmp.write(file_data)
                    tmp.close()
                    data_summary = analyze_data_file(tmp.name)
                    os.unlink(tmp.name)
                    with st.expander(f"查看 {data_file.name} 完整数据"):
                        st.text(data_summary)
                except Exception as e:
                    st.warning(f"无法读取 {data_file.name}: {str(e)}")
        
        if st.session_state.get('uploaded_data_files'):
            st.info(f"已上传数据文件: {', '.join([os.path.basename(f) for f in st.session_state['uploaded_data_files']])}")
        
        st.text_area(
            "输入赛题描述", 
            height=300, 
            key="problem_text",
            placeholder="请在此输入赛题描述，或上传赛题文件..."
        )
        
        deduct_count = get_model_deduct_count(selected_model, "问题分析")
        st.info(f"当前模型在「问题分析」模块将扣除 {deduct_count} 次")
        
        if st.button("开始分析", key="analyze_btn"):
            if not st.session_state.get('problem_text') or st.session_state['problem_text'].strip() == "":
                st.warning("请输入问题描述或上传赛题文件")
                return
            
            session_id = st.session_state.get('session_id', generate_session_id())
            
            with st.spinner("正在分析问题，请稍候..."):
                try:
                    provider = get_provider(selected_provider)
                    if not provider or not provider.available:
                        st.error("提供商不可用")
                        return
                    
                    client = provider.create_client()
                    coordinator = Coordinator(client, model_name=selected_model)
                    coordinator.set_knowledge(get_all_papers())
                    coordinator.set_competition(selected_competition)
                    coordinator.set_data_files(st.session_state.get('uploaded_data_files'))
                    
                    result, error = run_llm_task(coordinator.analyze_problem, st.session_state['problem_text'], timeout=600)
                    if error:
                        st.error(f"分析失败: {error}")
                        return
                    
                    st.session_state['analysis_result'] = result
                    
                    success, msg = db.deduct_balance(session_id, deduct_count, "问题分析")
                    if not success:
                        st.error(msg)
                    else:
                        st.success(f"✅ 分析完成！{msg}")
                except Exception as e:
                    st.error(f"分析失败: {str(e)}")
                    return
        
        if st.session_state.get('analysis_result'):
            st.markdown("---")
            st.subheader("分析结果")
            display_analysis(st.session_state['analysis_result'])
    
    elif tab == "模型推荐":
        st.header("🧠 模型推荐")
        
        if not st.session_state.get('analysis_result'):
            st.info("请先在「问题分析」中分析问题")
            return
        
        st.markdown("### 问题分析结果")
        display_analysis(st.session_state['analysis_result'])
        
        deduct_count = get_model_deduct_count(selected_model, "模型推荐")
        st.info(f"当前模型在「模型推荐」模块将扣除 {deduct_count} 次")
        
        if st.button("推荐模型", key="recommend_btn"):
            session_id = st.session_state.get('session_id', generate_session_id())
            
            with st.spinner("正在推荐模型，请稍候..."):
                try:
                    provider = get_provider(selected_provider)
                    if not provider or not provider.available:
                        st.error("提供商不可用")
                        return
                    
                    client = provider.create_client()
                    coordinator = Coordinator(client, model_name=selected_model)
                    coordinator.set_knowledge(get_all_papers())
                    coordinator.set_competition(selected_competition)
                    coordinator.set_data_files(st.session_state.get('uploaded_data_files'))
                    
                    result, error = run_llm_task(coordinator.recommend_models, st.session_state['analysis_result'])
                    if error:
                        st.error(f"推荐失败: {error}")
                        return
                    
                    st.session_state['recommendation_result'] = result
                    st.session_state['model_critic_result'] = ""
                    st.session_state['optimization_complete'] = False
                    
                    success, msg = db.deduct_balance(session_id, deduct_count, "模型推荐")
                    if not success:
                        st.error(msg)
                    else:
                        st.success(f"✅ 推荐完成！{msg}")
                    
                    rec_json = parse_json_safe(result)
                    if rec_json:
                        model_errors = coordinator.validate_models(rec_json)
                        image_errors = coordinator.validate_images(rec_json)
                        all_errors = model_errors + image_errors
                        
                        if all_errors:
                            st.warning("检测到以下推荐项不在库中：")
                            for err in all_errors:
                                st.warning(f"• {err}")
                            st.info("推荐结果仍会显示，但建议检查上述项目是否需要添加到模型库或图片库")
                    
                    st.markdown("### 模型推荐结果")
                    display_recommendations(result)
                except Exception as e:
                    st.error(f"推荐失败: {str(e)}")
    
    elif tab == "模型评审":
        st.header("🔍 模型评审")
        
        if not st.session_state.get('analysis_result'):
            st.info("请先完成「问题分析」")
            return
        
        if not st.session_state.get('recommendation_result'):
            st.info("请先完成「模型推荐」")
            return
        
        with st.sidebar:
            st.subheader("⚙️ 评审设置")
            target_score = st.slider("目标评分", min_value=5, max_value=10, value=7, step=1, key="target_score")
            max_retries = st.slider("最大重试次数", min_value=1, max_value=10, value=5, step=1, key="max_retries")
            auto_review = st.checkbox("自动循环评审直到达标", value=False, key="auto_review")
        
        st.markdown("### 问题分析")
        display_analysis(st.session_state['analysis_result'])
        
        st.markdown("### 模型推荐")
        display_recommendations(st.session_state['recommendation_result'])
        
        col1, col2 = st.columns(2)
        with col1:
            if st.button("🔍 评审模型", key="critic_model_btn"):
                with st.spinner("正在评审模型，请稍候..."):
                    try:
                        provider = get_provider(selected_provider)
                        if not provider or not provider.available:
                            st.error("提供商不可用")
                            return
                        
                        client = provider.create_client()
                        coordinator = Coordinator(client, model_name=selected_model)
                        coordinator.set_knowledge(get_all_papers())
                        coordinator.set_competition(selected_competition)
                        
                        result, error = run_llm_task(
                            coordinator.critic_model,
                            st.session_state['analysis_result'],
                            st.session_state['recommendation_result']
                        )
                        if error:
                            st.error(f"评审失败: {error}")
                            return
                        
                        st.session_state['model_critic_result'] = result
                        st.session_state['last_coordinator'] = coordinator
                        st.session_state['current_score'] = 0
                    except Exception as e:
                        st.error(f"评审失败: {str(e)}")
        
        with col2:
            if st.button("🔄 自动优化模型（循环评审直到达标）", key="auto_optimize_btn"):
                try:
                    provider = get_provider(selected_provider)
                    if not provider or not provider.available:
                        st.error("提供商不可用")
                        return
                    
                    client = provider.create_client()
                    coordinator = Coordinator(client, model_name=selected_model)
                    coordinator.set_knowledge(get_all_papers())
                    coordinator.set_competition(selected_competition)
                    
                    progress_bar = st.progress(0)
                    status_text = st.empty()
                    
                    def update_status(msg):
                        status_text.text(msg)
                        print(f"[STATUS] {msg}")
                    
                    update_status(f"⏳ 开始自动优化模型，目标评分: {target_score}/10，最多尝试 {max_retries} 次")
                    
                    optimize_result, optimize_error = run_llm_task(
                        coordinator.auto_optimize_models,
                        st.session_state['analysis_result'],
                        max_retries,
                        target_score,
                        progress_callback=update_status
                    )
                    
                    if optimize_error:
                        st.error(f"自动优化失败: {optimize_error}")
                        return
                    
                    try:
                        opt_data = json.loads(optimize_result.replace("```json", "").replace("```", "").strip())
                        
                        st.session_state['recommendation_result'] = opt_data.get('recommendations', "")
                        st.session_state['model_critic_result'] = opt_data.get('critic_result', "")
                        st.session_state['current_score'] = opt_data.get('score', 0)
                        
                        attempts = opt_data.get('attempts', 0)
                        success = opt_data.get('success', False)
                        
                        if success:
                            st.success(f"✅ 模型优化成功！经过 {attempts} 次评审，最终评分: {opt_data.get('score', 0)}/{target_score}")
                        else:
                            st.warning(f"⚠️ 已达到最大重试次数（{attempts}次），当前评分: {opt_data.get('score', 0)}/{target_score}")
                        
                        st.session_state['optimization_complete'] = True
                    except Exception as e:
                        st.warning(f"⚠️ JSON解析失败，但优化结果已保存: {str(e)}")
                        st.session_state['recommendation_result'] = optimize_result
                        st.session_state['model_critic_result'] = ""
                        st.session_state['optimization_complete'] = True
                except Exception as e:
                    st.error(f"自动优化失败: {str(e)}")
        
        if st.session_state.get('model_critic_result'):
            st.markdown("### 模型评审结果")
            critic_json = parse_json_safe(st.session_state['model_critic_result'])
            if critic_json:
                score = critic_json.get('score', 0)
                approved = critic_json.get('approved', False)
                st.markdown(f"**评分**: {score}/10")
                st.markdown(f"**目标**: {target_score}/10")
                st.markdown(f"**通过**: {'✅ 通过' if score >= target_score else '❌ 未通过'}")
                
                issues = critic_json.get('issues', [])
                if issues:
                    st.markdown("**问题清单**:")
                    for issue in issues:
                        st.markdown(f"- {issue.get('problem', '')}")
                
                suggestions = critic_json.get('suggestions', [])
                if suggestions:
                    st.markdown("**改进建议**:")
                    for suggestion in suggestions:
                        st.markdown(f"- {suggestion}")
                
                if score < target_score:
                    st.warning(f"⚠️ 模型评分低于目标评分({target_score}分)，建议重新生成模型")
                    if st.button("🔄 根据评审反馈重新生成模型", key="revise_model_btn"):
                        with st.spinner("正在根据评审反馈重新生成模型，请稍候..."):
                            try:
                                provider = get_provider(selected_provider)
                                if not provider or not provider.available:
                                    st.error("提供商不可用")
                                    return
                                
                                client = provider.create_client()
                                coordinator = Coordinator(client, model_name=selected_model)
                                coordinator.set_knowledge(get_all_papers())
                                coordinator.set_competition(selected_competition)
                                
                                revise_result, revise_error = run_llm_task(
                                    coordinator.revise_models,
                                    st.session_state['analysis_result'],
                                    st.session_state['model_critic_result'],
                                    st.session_state['recommendation_result']
                                )
                                if revise_error:
                                    st.error(f"重新生成失败: {revise_error}")
                                    return
                                
                                st.session_state['recommendation_result'] = revise_result
                                st.session_state['model_critic_result'] = ""
                                st.session_state['optimization_complete'] = False
                                
                                st.success("✅ 模型重新生成成功！请点击「评审当前模型」验证修改效果")
                            except Exception as e:
                                st.error(f"重新生成失败: {str(e)}")
        
        if st.session_state.get('optimization_complete') and st.session_state.get('model_critic_result'):
            st.markdown("---")
            st.markdown("### ✅ 自动优化完成")
            st.info("优化后的模型已自动替代原模型。您可以点击「评审当前模型」再次验证，或继续修改。")
            if st.button("🔍 验证优化后的模型", key="verify_optimized_btn"):
                st.session_state['optimization_complete'] = False
                st.session_state['model_critic_result'] = ""
    
    elif tab == "代码生成":
        st.header("💻 代码生成")
        
        if not st.session_state.get('analysis_result'):
            st.info("请先在「问题分析」中分析问题")
            return
        
        if not st.session_state.get('recommendation_result'):
            st.info("请先在「模型推荐」中获取推荐")
            return
        
        analysis_json = parse_json_safe(st.session_state['analysis_result'])
        question_count = 3
        if analysis_json and 'questions' in analysis_json:
            question_count = len(analysis_json['questions'])
        
        tab_labels = []
        for i in range(1, min(question_count, 5) + 1):
            tab_labels.append(f"问题{i}")
        
        code_tabs = st.tabs(tab_labels)
        
        run_code_checkbox = st.checkbox("运行生成的代码", value=True, key="run_code_checkbox")
        
        for q_num, tab_container in enumerate(code_tabs, 1):
            with tab_container:
                st.subheader(f"问题{q_num}代码生成")
                
                if question_count >= q_num:
                    question_content = ""
                    if analysis_json and 'questions' in analysis_json and q_num <= len(analysis_json['questions']):
                        question_content = analysis_json['questions'][q_num-1].get('content', '')[:200] + "..." if len(analysis_json['questions'][q_num-1].get('content', '')) > 200 else analysis_json['questions'][q_num-1].get('content', '')
                    
                    st.markdown(f"**问题描述**: {question_content}")
                    
                    code_result_key = f'code_result_q{q_num}'
                    
                    deduct_count = get_model_deduct_count(selected_model, "代码生成")
                    st.info(f"当前模型在「代码生成」模块将扣除 {deduct_count} 次")
                    
                    if st.button(f"🚀 生成问题{q_num}代码", key=f"generate_code_q{q_num}_btn"):
                        session_id = st.session_state.get('session_id', generate_session_id())
                        
                        status_text = st.empty()
                        status_text.info(f"📊 正在生成问题{q_num}代码...")
                        
                        try:
                            provider = get_provider(selected_provider)
                            if not provider or not provider.available:
                                st.error("提供商不可用")
                                continue
                            
                            client = provider.create_client()
                            coordinator = Coordinator(client, model_name=selected_model)
                            coordinator.set_knowledge(get_all_papers())
                            coordinator.set_competition(selected_competition)
                            coordinator.set_data_files(st.session_state.get('uploaded_data_files'))
                            
                            def progress_callback(msg):
                                status_text.info(msg)
                            
                            result, error = run_llm_task(
                                coordinator.generate_single_question_code,
                                st.session_state['analysis_result'],
                                st.session_state['recommendation_result'],
                                q_num,
                                run_code=run_code_checkbox,
                                progress_callback=progress_callback,
                                timeout=900
                            )
                            if error:
                                st.error(f"代码生成失败: {error}")
                                status_text.empty()
                                continue
                            
                            st.session_state[code_result_key] = result
                            
                            success, msg = db.deduct_balance(session_id, deduct_count, f"代码生成-问题{q_num}")
                            if not success:
                                status_text.error(msg)
                            else:
                                status_text.success(f"✅ 问题{q_num}代码生成完成！{msg}")
                            
                        except Exception as e:
                            st.error(f"代码生成失败: {str(e)}")
                            status_text.empty()
                    
                    if st.session_state.get(code_result_key):
                        code_json = parse_json_safe(st.session_state[code_result_key])
                        if code_json:
                            qc = code_json.get('question_code', {})
                            success = qc.get('success', False)
                            
                            if not success:
                                st.warning(f"⚠️ 问题{q_num}代码生成失败")
                                if qc.get('stderr'):
                                    st.error(f"错误信息:\n{qc['stderr'][:1000]}")
                                if st.button(f"🔄 重试问题{q_num}代码", key=f"retry_code_q{q_num}_btn"):
                                    st.session_state.pop(code_result_key, None)
                                    st.rerun()
                            else:
                                st.success(f"✅ 问题{q_num}代码生成成功")
                                
                                if qc.get('stdout'):
                                    with st.expander(f"查看问题{q_num}运行结果"):
                                        st.text(qc['stdout'][:3000])
                                
                                if qc.get('code'):
                                    st.download_button(
                                        label=f"📥 下载问题{q_num}代码",
                                        data=qc['code'],
                                        file_name=f"problem_{q_num}_code.py",
                                        mime="text/python",
                                        key=f"download_q{q_num}_code"
                                    )
                                    
                                    with st.expander(f"查看问题{q_num}代码"):
                                        st.code(qc['code'], language='python')
                                
                                if qc.get('artifact_paths'):
                                    st.markdown(f"**生成的图表**:")
                                    for path in qc['artifact_paths']:
                                        if path.endswith('.png'):
                                            try:
                                                st.image(path, caption=os.path.basename(path), use_column_width=True)
                                            except:
                                                st.info(f"- {os.path.basename(path)}")
                                        else:
                                            st.info(f"- {os.path.basename(path)}")
                        else:
                            st.warning("⚠️ 代码生成结果解析失败")
                            st.markdown(st.session_state[code_result_key])
                            if st.button(f"🔄 重试问题{q_num}代码", key=f"retry_code_q{q_num}_btn2"):
                                st.session_state.pop(code_result_key, None)
                                st.rerun()
                else:
                    st.info(f"问题{q_num}不存在")
        
        st.markdown("---")
        st.subheader("📋 全部问题代码")
        
        all_code_results = []
        for q_num in range(1, min(question_count, 5) + 1):
            key = f'code_result_q{q_num}'
            if st.session_state.get(key):
                all_code_results.append((q_num, st.session_state[key]))
        
        if all_code_results:
            st.success(f"已生成 {len(all_code_results)} 个问题的代码")
            
            combined_code = "# 数学建模竞赛 - 全部问题代码\n\n"
            for q_num, result in all_code_results:
                code_json = parse_json_safe(result)
                if code_json and code_json.get('question_code', {}).get('code'):
                    combined_code += f"#{'='*60}\n"
                    combined_code += f"# 问题{q_num}代码\n"
                    combined_code += f"#{'='*60}\n\n"
                    combined_code += code_json['question_code']['code']
                    combined_code += "\n\n"
            
            st.download_button(
                label="📥 下载全部代码",
                data=combined_code,
                file_name="all_problems_code.py",
                mime="text/python",
                key="download_all_code"
            )
            
            with st.expander("查看全部代码"):
                display_code(combined_code)
        else:
            st.info("暂无已生成的代码")
    
    elif tab == "敏感性分析":
        st.header("📊 敏感性分析")
        
        if not st.session_state.get('analysis_result'):
            st.info("请先完成「问题分析」")
            return
        
        if not st.session_state.get('recommendation_result'):
            st.info("请先完成「模型推荐」")
            return
        
        st.markdown("### 模型推荐")
        display_recommendations(st.session_state['recommendation_result'])
        
        if st.button("完整敏感性分析", key="sensitivity_analysis_btn"):
            status_text = st.empty()
            status_text.info("📊 步骤1/4：正在规划敏感性分析参数...")
            
            try:
                provider = get_provider(selected_provider)
                if not provider or not provider.available:
                    st.error("提供商不可用")
                    return
                
                client = provider.create_client()
                coordinator = Coordinator(client, model_name=selected_model)
                coordinator.set_knowledge(get_all_papers())
                coordinator.set_competition(selected_competition)
                
                status_text.info("📊 步骤1/4：正在规划敏感性分析参数...")
                result, error = run_llm_task(
                    coordinator.analyze_sensitivity,
                    st.session_state['recommendation_result'],
                    st.session_state['analysis_result'],
                    timeout=600
                )
                if error:
                    st.error(f"敏感性分析失败: {error}")
                    status_text.empty()
                    return
                
                st.session_state['sensitivity_result'] = result
                
                data = parse_json_safe(result)
                if data:
                    if data.get('success'):
                        status_text.success("✅ 敏感性分析完成！")
                        st.markdown("### 📋 敏感性分析计划")
                        plan_json = parse_json_safe(data.get('plan', '{}'))
                        if plan_json and 'runs' in plan_json:
                            runs = plan_json['runs']
                            for run in runs:
                                param_name = run.get('parameter', '未命名参数')
                                with st.expander(f"参数: {param_name}"):
                                    st.markdown(f"**取值范围**: {run.get('values', [])}")
                                    st.markdown(f"**观察指标**: {run.get('metric', '')}")
                                    st.markdown(f"**选择理由**: {run.get('rationale', '')}")
                        else:
                            st.info("计划解析失败，显示原始内容:")
                            st.text(data.get('plan', '')[:1000])
                        
                        st.markdown("### 📝 敏感性分析代码")
                        code = data.get('code', '')
                        if code:
                            st.code(code, language='python')
                        else:
                            st.info("未生成代码")
                        
                        st.markdown("### 📊 运行结果")
                        code_results = data.get('code_results', {})
                        if code_results.get('success'):
                            st.markdown(f"**stdout**:")
                            stdout_text = code_results.get('stdout', '')
                            st.text(stdout_text[:3000] + ("..." if len(stdout_text) > 3000 else ""))
                            
                            results_list = data.get('results', [])
                            if results_list:
                                st.markdown("**提取的数值结果**:")
                                for r in results_list:
                                    param = r.get('parameter', '')
                                    values = r.get('values', [])
                                    metrics = r.get('metrics', {})
                                    results_data = r.get('results', [])
                                    with st.expander(f"参数: {param}"):
                                        if values and results_data and len(values) == len(results_data):
                                            df_data = {"参数值": values, "指标值": results_data}
                                            df = pd.DataFrame(df_data)
                                            st.dataframe(df)
                                        elif metrics:
                                            st.markdown(f"指标: {metrics}")
                                        else:
                                            st.markdown("暂无详细结果")
                            
                            artifact_paths = code_results.get('artifact_paths', []) or data.get('artifact_paths', [])
                            if artifact_paths:
                                st.markdown("**生成的图表**:")
                                for path in artifact_paths:
                                    if path.lower().endswith('.png'):
                                        try:
                                            st.image(path)
                                        except Exception as img_e:
                                            st.warning(f"无法显示图片: {path}")
                            else:
                                st.info("未生成图表")
                        else:
                            st.error(f"代码运行失败: {code_results.get('error_kind', '未知错误')}")
                            stderr_text = code_results.get('stderr', '')
                            st.text(stderr_text[:2000] + ("..." if len(stderr_text) > 2000 else ""))
                        
                        st.markdown("### 📖 敏感性分析解读")
                        interpretations = data.get('interpretations', [])
                        if interpretations:
                            for i, interpretation in enumerate(interpretations):
                                st.markdown(f"**参数{i+1}**: {interpretation}")
                        else:
                            st.info("暂无解读结果")
                    else:
                        status_text.error("❌ 敏感性分析失败！")
                        error_msg = data.get('error', '')
                        st.error(f"敏感性分析失败: {error_msg}")
                        if len(error_msg) > 500:
                            st.markdown("### 完整错误信息")
                            st.text(error_msg)
                else:
                    status_text.error("❌ 敏感性分析失败！")
                    st.markdown(result)
            except Exception as e:
                status_text.error("❌ 敏感性分析失败！")
                st.error(f"敏感性分析失败: {str(e)}")
    
    elif tab == "论文写作":
        st.header("📝 论文写作")
        
        if not st.session_state.get('analysis_result'):
            st.info("请先完成「问题分析」")
            return
        
        if not st.session_state.get('recommendation_result'):
            st.info("请先完成「模型推荐」")
            return
        
        code_json = parse_json_safe(st.session_state.get('code_result', '{}'))
        question_count = 3
        
        if st.session_state.get('analysis_result'):
            try:
                analysis_data = parse_json_safe(st.session_state['analysis_result'])
                if analysis_data and 'questions' in analysis_data:
                    question_count = len(analysis_data['questions'])
            except Exception:
                pass
        
        if code_json and 'question_codes' in code_json:
            question_count = max(question_count, len(code_json['question_codes']))
        
        if st.session_state.get('code_result'):
            st.success("✅ 已检测到代码生成结果")
        else:
            st.warning("⚠️ 未检测到代码生成结果，将基于模型推荐和问题分析直接生成论文")
        
        st.markdown("### 📤 自定义资源上传（可选）")
        st.info("如果您有自己的代码、图片或表格数据，可以上传，论文将优先使用上传的内容")
        
        uploaded_resources = {}
        for q_num in range(1, question_count + 1):
            st.markdown(f"#### 问题{q_num}")
            col1, col2, col3, col4 = st.columns(4)
            with col1:
                uploaded_code = st.file_uploader(f"问题{q_num}代码 (.py)", type=['py'], key=f"upload_q{q_num}_code")
                if uploaded_code:
                    uploaded_resources[f'q{q_num}_code'] = uploaded_code.getvalue().decode('utf-8')
            with col2:
                uploaded_images = st.file_uploader(f"问题{q_num}图片 (.png/.jpg)", type=['png', 'jpg', 'jpeg'], accept_multiple_files=True, key=f"upload_q{q_num}_images")
                if uploaded_images:
                    uploaded_resources[f'q{q_num}_images'] = uploaded_images
            with col3:
                uploaded_tables = st.file_uploader(f"问题{q_num}表格 (.csv/.xlsx)", type=['csv', 'xlsx'], accept_multiple_files=True, key=f"upload_q{q_num}_tables")
                if uploaded_tables:
                    uploaded_resources[f'q{q_num}_tables'] = uploaded_tables
            with col4:
                uploaded_results = st.file_uploader(f"问题{q_num}运行结果 (.txt)", type=['txt'], accept_multiple_files=True, key=f"upload_q{q_num}_results")
                if uploaded_results:
                    uploaded_resources[f'q{q_num}_results'] = uploaded_results
        
        st.markdown("---")
        st.markdown("### 📌 论文章节生成（按部分生成）")
        st.info("建议按顺序生成：问题重述与假设 → 问题一 → 问题二 → 问题三 → 模型评价与推广 → 参考文献 → 摘要")
        
        section_options = ["问题重述与假设", "问题一", "问题二", "问题三"]
        if question_count >= 4:
            section_options.append("问题四")
        if question_count >= 5:
            section_options.append("问题五")
        section_options.extend(["模型评价与推广", "参考文献", "摘要"])
        
        selected_section = st.selectbox("选择要生成的章节", section_options, key="paper_section_select")
        
        deduct_count = get_model_deduct_count(selected_model, "论文写作")
        total_sections = len(section_options)
        st.info(f"生成单个章节将扣除 {deduct_count} 次，生成全部将扣除 {deduct_count * total_sections} 次")
        
        col1, col2 = st.columns([1, 3])
        with col1:
            generate_btn = st.button(f"生成{selected_section}章节", key=f"generate_{selected_section}_btn")
        with col2:
            if st.button("生成全部论文", key="generate_all_paper_btn"):
                selected_section = "全部"
                generate_btn = True
        
        if st.session_state.get('paper_result'):
            display_paper(st.session_state['paper_result'])
            data = parse_json_safe(st.session_state['paper_result'])
        else:
            data = None
        
        if generate_btn:
            session_id = st.session_state.get('session_id', generate_session_id())
            
            with st.spinner("正在撰写论文，请稍候..."):
                try:
                    provider = get_provider(selected_provider)
                    if not provider or not provider.available:
                        st.error("提供商不可用")
                        return
                    
                    client = provider.create_client()
                    coordinator = Coordinator(client, model_name=selected_model)
                    coordinator.set_knowledge(get_all_papers())
                    coordinator.set_competition(selected_competition)
                    coordinator.set_data_files(st.session_state.get('uploaded_data_files'))
                    
                    debug_info = st.expander("📋 调试信息", expanded=False)
                    debug_info.write(f"analysis_result exists: {st.session_state.get('analysis_result') is not None}")
                    debug_info.write(f"recommendation_result exists: {st.session_state.get('recommendation_result') is not None}")
                    debug_info.write(f"code_result exists: {st.session_state.get('code_result') is not None}")
                    debug_info.write(f"question_count: {question_count}")
                    
                    code_json = parse_json_safe(st.session_state.get('code_result', '{}'))
                    need_run_codes = []
                    
                    for q_num in range(1, question_count + 1):
                        has_uploaded_code = f'q{q_num}_code' in uploaded_resources and uploaded_resources[f'q{q_num}_code']
                        has_images = f'q{q_num}_images' in uploaded_resources and uploaded_resources[f'q{q_num}_images']
                        has_tables = f'q{q_num}_tables' in uploaded_resources and uploaded_resources[f'q{q_num}_tables']
                        
                        if not has_uploaded_code and (not has_images or not has_tables):
                            if code_json and 'question_codes' in code_json:
                                qc = next((qc for qc in code_json['question_codes'] if qc.get('question_number') == q_num), None)
                                if qc and (not qc.get('success') or not qc.get('artifact_paths')):
                                    need_run_codes.append(q_num)
                    
                    if need_run_codes and code_json:
                        status_text = st.empty()
                        status_text.info(f"📊 正在运行问题{', '.join(map(str, need_run_codes))}的代码以生成图片和数据...")
                        
                        from tools.code_executor import run_python
                        
                        for q_num in need_run_codes:
                            status_text.info(f"▶️ 正在运行问题{q_num}代码...")
                            qc = next((qc for qc in code_json['question_codes'] if qc.get('question_number') == q_num), None)
                            if qc and qc.get('code'):
                                workdir = tempfile.mkdtemp(prefix=f"mathmodel_paper_q{q_num}_")
                                run_result = run_python(qc['code'], workdir=workdir, timeout=300)
                                
                                qc['success'] = run_result.success
                                qc['stdout'] = run_result.stdout
                                qc['stderr'] = run_result.stderr
                                qc['artifact_paths'] = run_result.artifact_paths
                                qc['error_kind'] = run_result.error_kind
                                
                                if run_result.success:
                                    status_text.success(f"✅ 问题{q_num}代码运行成功")
                                    if run_result.artifact_paths:
                                        for path in run_result.artifact_paths:
                                            if path.lower().endswith('.png'):
                                                fname = os.path.basename(path)
                                                with open(path, 'rb') as f:
                                                    db.save_file(session_id, f"output_{fname}", fname, f.read())
                                                if path not in st.session_state.get('generated_images', []):
                                                    if 'generated_images' not in st.session_state:
                                                        st.session_state['generated_images'] = []
                                                    st.session_state['generated_images'].append(path)
                                else:
                                    status_text.error(f"❌ 问题{q_num}代码运行失败")
                        
                        st.session_state['code_result'] = json.dumps(code_json, ensure_ascii=False, indent=2)
                        final_code_result = st.session_state['code_result']
                        status_text.empty()
                    else:
                        final_code_result = st.session_state.get('code_result', '')
                        if not final_code_result:
                            debug_info.warning("⚠️ 没有代码生成结果，将基于模型推荐和问题分析直接生成论文")
                    
                    has_uploaded_any_code = any(f'q{q_num}_code' in uploaded_resources for q_num in range(1, question_count + 1))
                    if has_uploaded_any_code:
                        st.info("📝 已检测到上传的代码，将跳过代码运行，基于上传资源进行问题分析")
                    
                    for q_num in range(1, question_count + 1):
                        if f'q{q_num}_images' in uploaded_resources and uploaded_resources[f'q{q_num}_images']:
                            for img_file in uploaded_resources[f'q{q_num}_images']:
                                img_data = img_file.getvalue()
                                img_fname = f"q{q_num}_{img_file.name}"
                                db.save_file(session_id, f"output_{img_fname}", img_fname, img_data)
                                # 写入临时文件供后续显示使用
                                tmp_img = tempfile.NamedTemporaryFile(delete=False, suffix=os.path.splitext(img_file.name)[1] or '.png')
                                tmp_img.write(img_data)
                                tmp_img.close()
                                img_path = tmp_img.name
                                if img_path not in st.session_state.get('generated_images', []):
                                    if 'generated_images' not in st.session_state:
                                        st.session_state['generated_images'] = []
                                    st.session_state['generated_images'].append(img_path)
                    
                    image_info = ""
                    if st.session_state.get('generated_images'):
                        image_info = "\n\n可用图片列表:\n"
                        for img_path in st.session_state['generated_images']:
                            img_name = os.path.basename(img_path)
                            image_info += f"- {img_name}\n"
                    
                    custom_resource_info = ""
                    table_data_info = "\n\n数据表格:\n"
                    
                    if uploaded_resources:
                        custom_resource_info = "\n\n自定义上传资源:\n"
                        for q_num in range(1, question_count + 1):
                            resources = []
                            if f'q{q_num}_code' in uploaded_resources:
                                resources.append("代码")
                            if f'q{q_num}_images' in uploaded_resources:
                                resources.append(f"{len(uploaded_resources[f'q{q_num}_images'])}张图片")
                            if f'q{q_num}_tables' in uploaded_resources:
                                resources.append(f"{len(uploaded_resources[f'q{q_num}_tables'])}个表格")
                            if resources:
                                custom_resource_info += f"- 问题{q_num}: {', '.join(resources)}\n"
                    
                    for q_num in range(1, question_count + 1):
                        if f'q{q_num}_tables' in uploaded_resources and uploaded_resources[f'q{q_num}_tables']:
                            table_data_info += f"--- 问题{q_num}上传表格 ---\n"
                            for table_file in uploaded_resources[f'q{q_num}_tables']:
                                try:
                                    if table_file.name.endswith('.csv'):
                                        df = pd.read_csv(table_file)
                                    else:
                                        df = pd.read_excel(table_file)
                                    table_data_info += df.to_string(index=False) + "\n\n"
                                except Exception as e:
                                    table_data_info += f"表格读取失败: {str(e)}\n\n"
                        elif f'q{q_num}_results' in uploaded_resources and uploaded_resources[f'q{q_num}_results']:
                            table_data_info += f"--- 问题{q_num}上传运行结果 ---\n"
                            for result_file in uploaded_resources[f'q{q_num}_results']:
                                table_data_info += result_file.getvalue().decode('utf-8')[:3000] + ("..." if len(result_file.getvalue()) > 3000 else "") + "\n\n"
                        elif final_code_result:
                            code_json_for_paper = parse_json_safe(final_code_result)
                            if code_json_for_paper and 'question_codes' in code_json_for_paper:
                                qc = next((qc for qc in code_json_for_paper['question_codes'] if qc.get('question_number') == q_num), None)
                                if qc and qc.get('stdout'):
                                    table_data_info += f"--- 问题{q_num}代码运行数据 ---\n"
                                    table_data_info += qc['stdout'][:3000] + ("..." if len(qc['stdout']) > 3000 else "") + "\n\n"
                        else:
                            table_data_info += f"--- 问题{q_num}数据 ---\n"
                            table_data_info += "（暂无代码运行数据，将基于问题分析和模型推荐进行理论分析）\n\n"
                    
                    if final_code_result:
                        code_json_for_paper = parse_json_safe(final_code_result)
                        if uploaded_resources and code_json_for_paper and 'question_codes' in code_json_for_paper:
                            for qc in code_json_for_paper['question_codes']:
                                q_num = qc.get('question_number')
                                if q_num and f'q{q_num}_code' in uploaded_resources:
                                    qc['code'] = uploaded_resources[f'q{q_num}_code']
                                    qc['custom_uploaded'] = True
                            final_code_result = json.dumps(code_json_for_paper, ensure_ascii=False, indent=2)
                    
                    uploaded_images_list = []
                    uploaded_results_list = []
                    
                    for q_num in range(1, question_count + 1):
                        if f'q{q_num}_images' in uploaded_resources and uploaded_resources[f'q{q_num}_images']:
                            for img_file in uploaded_resources[f'q{q_num}_images']:
                                img_fname = f"q{q_num}_{img_file.name}"
                                _, img_bytes = db.get_file(session_id, f"output_{img_fname}")
                                img_tmp = tempfile.NamedTemporaryFile(delete=False, suffix=os.path.splitext(img_file.name)[1] or '.png')
                                if img_bytes:
                                    img_tmp.write(img_bytes)
                                else:
                                    img_tmp.write(img_file.getvalue())
                                img_tmp.close()
                                uploaded_images_list.append({
                                    'path': img_tmp.name,
                                    'caption': f"问题{q_num}上传图片",
                                    'question_number': q_num
                                })
                        
                        if f'q{q_num}_results' in uploaded_resources and uploaded_resources[f'q{q_num}_results']:
                            for result_file in uploaded_resources[f'q{q_num}_results']:
                                uploaded_results_list.append({
                                    'filename': result_file.name,
                                    'content': result_file.getvalue().decode('utf-8'),
                                    'question_number': q_num
                                })
                    
                    if selected_section == "全部":
                        result, error = run_llm_task(
                            coordinator.write_paper,
                            st.session_state['analysis_result'],
                            st.session_state['recommendation_result'],
                            final_code_result + image_info + custom_resource_info + table_data_info,
                            None,
                            uploaded_images_list,
                            uploaded_results_list,
                            timeout=900
                        )
                    else:
                        section_map = {
                            "问题重述与假设": "problem_restatement",
                            "问题一": "question1",
                            "问题二": "question2",
                            "问题三": "question3",
                            "问题四": "question4",
                            "问题五": "question5",
                            "模型评价与推广": "sensitivity",
                            "参考文献": "references",
                            "摘要": "abstract"
                        }
                        section_name = section_map.get(selected_section, "")
                        question_num = {"问题一": 1, "问题二": 2, "问题三": 3, "问题四": 4, "问题五": 5}.get(selected_section)
                        
                        outline_result, outline_error = run_llm_task(
                            coordinator.paper_writer.generate_outline,
                            st.session_state['analysis_result'],
                            timeout=300
                        )
                        if outline_error:
                            st.error(f"大纲生成失败: {outline_error}")
                            return
                        
                        outline_data = parse_json_safe(outline_result)
                        if not outline_data:
                            outline_data = {}
                        
                        question1_summary = ""
                        question2_summary = ""
                        question3_summary = ""
                        question4_summary = ""
                        previous_summary = ""
                        all_summary = ""
                        
                        if st.session_state.get('paper_result'):
                            paper_data = parse_json_safe(st.session_state['paper_result'])
                            if paper_data:
                                if paper_data.get('question1_content'):
                                    question1_summary = paper_data['question1_content'][:800]
                                if paper_data.get('question2_content'):
                                    question2_summary = paper_data['question2_content'][:800]
                                if paper_data.get('question3_content'):
                                    question3_summary = paper_data['question3_content'][:800]
                                if paper_data.get('question4_content'):
                                    question4_summary = paper_data['question4_content'][:800]
                        
                        if section_name == "question2":
                            previous_summary = f"## 问题一核心成果\n{question1_summary}"
                        elif section_name == "question3":
                            previous_summary = f"## 问题一核心成果\n{question1_summary}\n\n## 问题二核心成果\n{question2_summary}"
                        elif section_name == "question4":
                            previous_summary = f"## 问题一核心成果\n{question1_summary}\n\n## 问题二核心成果\n{question2_summary}\n\n## 问题三核心成果\n{question3_summary}"
                        elif section_name == "question5":
                            previous_summary = f"## 问题一核心成果\n{question1_summary}\n\n## 问题二核心成果\n{question2_summary}\n\n## 问题三核心成果\n{question3_summary}\n\n## 问题四核心成果\n{question4_summary}"
                        elif section_name in ["sensitivity", "references", "abstract"]:
                            all_summary_parts = []
                            if question1_summary:
                                all_summary_parts.append(f"## 问题一核心成果\n{question1_summary}")
                            if question2_summary:
                                all_summary_parts.append(f"## 问题二核心成果\n{question2_summary}")
                            if question3_summary:
                                all_summary_parts.append(f"## 问题三核心成果\n{question3_summary}")
                            if question4_summary:
                                all_summary_parts.append(f"## 问题四核心成果\n{question4_summary}")
                            if question_count >= 5:
                                q5_content = paper_data.get('question5_content', '') if paper_data else ''
                                if q5_content:
                                    all_summary_parts.append(f"## 问题五核心成果\n{q5_content[:800]}")
                            all_summary = "\n\n".join(all_summary_parts)
                        
                        result, error = run_llm_task(
                            coordinator.write_paper_section,
                            section_name,
                            st.session_state['analysis_result'],
                            st.session_state['recommendation_result'],
                            final_code_result + image_info + custom_resource_info + table_data_info,
                            outline_data,
                            previous_summary,
                            question1_summary,
                            question2_summary,
                            all_summary,
                            uploaded_images_list,
                            uploaded_results_list,
                            question_num,
                            timeout=600
                        )
                    
                    if error:
                        st.error(f"论文生成失败: {error}")
                        return
                    
                    if st.session_state.get('paper_result'):
                        existing_data = parse_json_safe(st.session_state['paper_result'])
                        if existing_data:
                            result_data = parse_json_safe(result)
                            if result_data:
                                existing_data.update(result_data)
                                result = json.dumps(existing_data, ensure_ascii=False, indent=2)
                    
                    st.session_state['paper_result'] = result
                    data = parse_json_safe(result)
                    
                    if selected_section == "全部":
                        success, msg = db.deduct_balance(session_id, deduct_count * total_sections, "论文写作-全部")
                    else:
                        success, msg = db.deduct_balance(session_id, deduct_count, f"论文写作-{selected_section}")
                    if not success:
                        st.error(msg)
                    else:
                        st.success(f"✅ {selected_section}章节生成完成！{msg}")
                
                except Exception as e:
                    st.error(f"论文生成失败: {str(e)}")
        
        if data:
            st.markdown("---")
            st.subheader("导出论文")
            
            st.markdown("### 章节独立下载")
            section_download_map = {
                "problem_restatement": "问题重述与分析",
                "question1_content": "问题一",
                "question2_content": "问题二",
                "question3_content": "问题三",
                "question4_content": "问题四",
                "question5_content": "问题五",
                "sensitivity": "模型评价与推广",
                "conclusion": "结论",
                "references": "参考文献",
                "abstract": "摘要与关键词"
            }
            
            cols = st.columns(3)
            col_idx = 0
            for key, label in section_download_map.items():
                if key in data and data[key]:
                    content = data[key]
                    file_name = f"{label}.md"
                    with cols[col_idx % 3]:
                        st.download_button(
                            label=f"📥 {label}",
                            data=content,
                            file_name=file_name,
                            mime='text/markdown',
                            key=f"download_{key}"
                        )
                    col_idx += 1
            
            st.markdown("---")
            st.markdown("### 全文导出（MD格式，包含图片）")
            
            if st.button("导出完整论文（MD）", key="export_md_btn"):
                try:
                    paper_title = data.get('title', '')
                    if not paper_title:
                        analysis_result = st.session_state.get('analysis_result', '')
                        if analysis_result:
                            try:
                                analysis_data = parse_json_safe(analysis_result)
                                if analysis_data and 'questions' in analysis_data and analysis_data['questions']:
                                    first_question = analysis_data['questions'][0].get('content', '')
                                    if first_question:
                                        paper_title = "基于数学建模的" + first_question[:30] + "研究"
                            except Exception:
                                pass
                    if not paper_title:
                        paper_title = "数学建模竞赛论文"
                    
                    md_content = f"# {paper_title}\n\n"
                    
                    if data.get('abstract'):
                        md_content += "## 摘要\n\n"
                        md_content += data['abstract'] + "\n\n"
                    
                    if data.get('abstract_en'):
                        md_content += "## Abstract\n\n"
                        md_content += data['abstract_en'] + "\n\n"
                    
                    if data.get('problem_restatement'):
                        md_content += "## 问题重述与分析\n\n"
                        md_content += data['problem_restatement'] + "\n\n"
                    
                    if data.get('assumptions'):
                        md_content += "## 模型假设\n\n"
                        md_content += data['assumptions'] + "\n\n"
                    
                    if data.get('notation'):
                        md_content += "## 符号说明\n\n"
                        md_content += data['notation'] + "\n\n"
                    
                    question_labels = ['问题一', '问题二', '问题三', '问题四', '问题五']
                    questions_data = data.get('questions', [])
                    
                    for q_idx, q_label in enumerate(question_labels):
                        q_key = f'question{q_idx+1}_content'
                        if q_key in data and data[q_key]:
                            md_content += f"## {q_label}模型建立与求解\n\n"
                            md_content += data[q_key] + "\n\n"
                            
                            if questions_data and q_idx < len(questions_data):
                                q_data = questions_data[q_idx]
                                if q_data.get('model_building'):
                                    md_content += f"### {q_label}模型建立\n\n"
                                    md_content += q_data['model_building'] + "\n\n"
                                if q_data.get('model_solving'):
                                    md_content += f"### {q_label}模型求解\n\n"
                                    md_content += q_data['model_solving'] + "\n\n"
                                if q_data.get('result_analysis'):
                                    md_content += f"### {q_label}结果分析\n\n"
                                    md_content += q_data['result_analysis'] + "\n\n"
                                if q_data.get('model_testing'):
                                    md_content += f"### {q_label}模型检验\n\n"
                                    md_content += q_data['model_testing'] + "\n\n"
                            
                            if st.session_state.get('generated_images'):
                                for img_path in st.session_state['generated_images']:
                                    if f"q{q_idx+1}" in img_path.lower():
                                        img_name = os.path.basename(img_path)
                                        _, img_bytes = db.get_file(session_id, f"output_{img_name}")
                                        if img_bytes:
                                            import base64
                                            img_base64 = base64.b64encode(img_bytes).decode('utf-8')
                                            img_ext = os.path.splitext(img_name)[1][1:]
                                            md_content += f"![{img_name}](data:image/{img_ext};base64,{img_base64})\n\n"
                    
                    if data.get('sensitivity'):
                        md_content += "## 模型评价与推广\n\n"
                        md_content += data['sensitivity'] + "\n\n"
                    
                    if data.get('conclusion'):
                        md_content += "## 结论\n\n"
                        md_content += data['conclusion'] + "\n\n"
                    
                    if data.get('references'):
                        md_content += "## 参考文献\n\n"
                        md_content += data['references'] + "\n\n"
                    
                    file_name = f"{paper_title}.md"
                    bytes_data = md_content.encode('utf-8')
                    
                    db.save_file(session_id, f"output_{file_name}", file_name, bytes_data)
                    
                    st.success(f"论文已生成")
                    
                    st.download_button(
                        label="下载论文",
                        data=bytes_data,
                        file_name=file_name,
                        mime='text/markdown',
                        key="download_md_btn"
                    )
                
                except Exception as e:
                    st.error(f"导出失败: {str(e)}")
    
    elif tab == "论文评审":
        st.header("🔍 论文评审")
        
        if not st.session_state.get('paper_result'):
            st.info("请先完成「论文写作」")
            return
        
        st.markdown("### 论文内容")
        paper_data = parse_json_safe(st.session_state['paper_result'])
        if paper_data:
            display_paper(paper_data)
        
        if st.button("评审论文", key="critic_paper_btn"):
            with st.spinner("正在评审论文，请稍候..."):
                try:
                    provider = get_provider(selected_provider)
                    if not provider or not provider.available:
                        st.error("提供商不可用")
                        return
                    
                    client = provider.create_client()
                    coordinator = Coordinator(client, model_name=selected_model)
                    
                    n_figures = len(st.session_state.get('generated_images', []))
                    n_sensitivity = 0
                    
                    result, error = run_llm_task(
                        coordinator.critic_paper,
                        st.session_state['paper_result'],
                        st.session_state.get('code_result', ''),
                        n_figures,
                        n_sensitivity
                    )
                    if error:
                        st.error(f"评审失败: {error}")
                        return
                    
                    st.session_state['paper_critic_result'] = result
                    
                    st.markdown("### 论文评审结果")
                    critic_json = parse_json_safe(result)
                    if critic_json:
                        score = critic_json.get('score', 0)
                        approved = critic_json.get('approved', False)
                        st.markdown(f"**评分**: {score}/10")
                        st.markdown(f"**通过**: {'✅ 通过' if approved else '❌ 未通过'}")
                        
                        issues = critic_json.get('issues', [])
                        if issues:
                            st.markdown("**问题清单**:")
                            for issue in issues:
                                section = issue.get('section', 'general')
                                problem = issue.get('problem', '')
                                st.markdown(f"- [{section}] {problem}")
                        
                        suggestions = critic_json.get('suggestions', [])
                        if suggestions:
                            st.markdown("**改进建议**:")
                            for suggestion in suggestions:
                                st.markdown(f"- {suggestion}")
                    else:
                        st.markdown(result)
                except Exception as e:
                    st.error(f"评审失败: {str(e)}")
    
    elif tab == "论文评估":
        st.header("📊 论文评估")
        
        if not st.session_state.get('paper_result'):
            st.info("请先完成「论文写作」")
            return
        
        st.markdown("### 论文内容")
        paper_data = parse_json_safe(st.session_state['paper_result'])
        if paper_data:
            display_paper(paper_data)
        
        if st.button("评估论文", key="evaluate_paper_btn"):
            with st.spinner("正在评估论文，请稍候..."):
                try:
                    provider = get_provider(selected_provider)
                    if not provider or not provider.available:
                        st.error("提供商不可用")
                        return
                    
                    client = provider.create_client()
                    coordinator = Coordinator(client, model_name=selected_model)
                    
                    n_figures = len(st.session_state.get('generated_images', []))
                    n_sensitivity = 0
                    
                    paper_text = ""
                    if paper_data:
                        paper_text = paper_data.get('abstract', '')
                        for section in paper_data.get('sections', []):
                            paper_text += "\n\n" + section.get('content', '')
                    
                    code_stdout = ""
                    if st.session_state.get('code_result'):
                        code_json = parse_json_safe(st.session_state['code_result'])
                        if code_json and 'main_code' in code_json:
                            code_stdout = code_json['main_code'].get('stdout', '')[:2000]
                    
                    result = run_llm_task(
                        coordinator.evaluate_paper,
                        paper_text,
                        n_figures,
                        n_sensitivity,
                        code_stdout
                    )[0]
                    
                    if result:
                        st.session_state['evaluation_result'] = result
                        
                        st.markdown("### 论文评估结果")
                        st.markdown(f"**总分**: {result.total_score}/100")
                        st.markdown(f"**加权总分**: {result.weighted_total}/100")
                        
                        st.markdown("#### 维度评分")
                        col1, col2, col3, col4, col5 = st.columns(5)
                        with col1:
                            st.metric("假设合理性", result.dimension_scores['assumption'])
                        with col2:
                            st.metric("建模创新性", result.dimension_scores['innovation'])
                        with col3:
                            st.metric("结果正确性", result.dimension_scores['correctness'])
                        with col4:
                            st.metric("写作清晰性", result.dimension_scores['clarity'])
                        with col5:
                            st.metric("综合深度", result.dimension_scores['depth'])
                        
                        if result.comments:
                            st.markdown("#### 评审意见")
                            for comment in result.comments:
                                st.markdown(f"- {comment}")
                    
                except Exception as e:
                    st.error(f"评估失败: {str(e)}")
    
    elif tab == "模型知识库":
        st.header("📚 知识库管理")
        
        kb_tab = st.radio("选择知识库", ["模型知识库", "图片数据库"], key="kb_tab")
        
        if kb_tab == "模型知识库":
            action = st.radio("选择操作", ["查看模型", "新建模型", "编辑模型", "删除模型"], key="model_action")
            
            if action == "查看模型":
                categories = get_all_categories()
                selected_category = st.selectbox("选择模型类别", categories, key="category_select")
                
                models_in_category = list(get_models_by_category(selected_category).keys())
                if models_in_category:
                    selected_model = st.selectbox("选择模型", models_in_category, key="knowledge_model_select")
                    display_model_info(selected_model)
                    
                    matching_images = get_images_for_model(selected_model)
                    if matching_images:
                        st.markdown("**适用图表类型**:")
                        for img in matching_images:
                            img_info = get_image_type(img)
                            if img_info:
                                st.markdown(f"📊 {img} ({img_info.get('category', '')})")
                else:
                    st.info("该类别下暂无模型")
            
            elif action == "新建模型":
                st.subheader("新建模型")
                
                with st.form("new_model_form", clear_on_submit=True):
                    model_name = st.text_input("模型名称", key="new_model_name")
                    category = st.selectbox("模型类别", get_all_categories() + ["其他"], key="new_model_category")
                    description = st.text_area("模型描述", key="new_model_desc")
                    applicable = st.text_input("适用场景", key="new_model_applicable")
                    pros = st.text_input("优点（逗号分隔）", key="new_model_pros")
                    cons = st.text_input("缺点（逗号分隔）", key="new_model_cons")
                    baseline = st.checkbox("是否为基线模型", key="new_model_baseline")
                    code_template = st.text_area("代码模板", height=200, key="new_model_code")
                    
                    submitted = st.form_submit_button("保存模型")
                    if submitted:
                        if not model_name:
                            st.warning("请输入模型名称")
                        else:
                            model_info = {
                                "category": category,
                                "description": description,
                                "applicable": applicable,
                                "pros": [p.strip() for p in pros.split(',') if p.strip()],
                                "cons": [c.strip() for c in cons.split(',') if c.strip()],
                                "baseline": baseline,
                                "code_template": code_template
                            }
                            add_model(model_name, model_info)
                            st.success(f"模型「{model_name}」已添加")
            
            elif action == "编辑模型":
                st.subheader("编辑模型")
                
                all_models = list(get_all_models().keys())
                if not all_models:
                    st.info("暂无模型可编辑")
                else:
                    selected_model = st.selectbox("选择要编辑的模型", all_models, key="edit_model_select")
                    model_info = get_model(selected_model)
                    
                    if model_info:
                        with st.form("edit_model_form"):
                            new_name = st.text_input("模型名称", value=selected_model, key="edit_model_name")
                            category = st.selectbox("模型类别", get_all_categories() + ["其他"], 
                                                  index=get_all_categories().index(model_info.get('category', '其他')) 
                                                  if model_info.get('category') in get_all_categories() else len(get_all_categories()),
                                                  key="edit_model_category")
                            description = st.text_area("模型描述", value=model_info.get('description', ''), key="edit_model_desc")
                            applicable = st.text_input("适用场景", value=model_info.get('applicable', ''), key="edit_model_applicable")
                            pros = st.text_input("优点（逗号分隔）", value=', '.join(model_info.get('pros', [])), key="edit_model_pros")
                            cons = st.text_input("缺点（逗号分隔）", value=', '.join(model_info.get('cons', [])), key="edit_model_cons")
                            baseline = st.checkbox("是否为基线模型", value=model_info.get('baseline', False), key="edit_model_baseline")
                            code_template = st.text_area("代码模板", height=200, value=model_info.get('code_template', ''), key="edit_model_code")
                            
                            submitted = st.form_submit_button("保存修改")
                            if submitted:
                                if selected_model != new_name:
                                    delete_model(selected_model)
                                
                                updated_info = {
                                    "category": category,
                                    "description": description,
                                    "applicable": applicable,
                                    "pros": [p.strip() for p in pros.split(',') if p.strip()],
                                    "cons": [c.strip() for c in cons.split(',') if c.strip()],
                                    "baseline": baseline,
                                    "code_template": code_template
                                }
                                add_model(new_name, updated_info)
                                st.success(f"模型「{new_name}」已更新")
            
            elif action == "删除模型":
                st.subheader("删除模型")
                
                all_models = list(get_all_models().keys())
                if not all_models:
                    st.info("暂无模型可删除")
                else:
                    selected_model = st.selectbox("选择要删除的模型", all_models, key="delete_model_select")
                    
                    if st.button(f"确认删除「{selected_model}」", key="confirm_delete_btn"):
                        if delete_model(selected_model):
                            st.success(f"模型「{selected_model}」已删除")
                        else:
                            st.error("删除失败")
        
        else:
            st.subheader("🖼️ 图片数据库")
            
            img_action = st.radio("选择操作", ["查看图表", "新建图表", "编辑图表", "删除图表"], key="img_action")
            
            if img_action == "查看图表":
                img_categories = get_image_categories()
                selected_img_category = st.selectbox("选择图表类别", img_categories, key="img_category_select")
                
                images_in_category = list(get_images_by_category(selected_img_category).keys())
                if images_in_category:
                    selected_image = st.selectbox("选择图表类型", images_in_category, key="img_type_select")
                    img_info = get_image_type(selected_image)
                    
                    if img_info:
                        st.markdown(f"**名称**: {selected_image}")
                        st.markdown(f"**类别**: {img_info.get('category', '')}")
                        st.markdown(f"**描述**: {img_info.get('description', '')}")
                        st.markdown(f"**适用场景**: {img_info.get('applicable', '')}")
                        st.markdown(f"**适用模型**: {', '.join(img_info.get('suggested_models', []))}")
                        if 'code_template' in img_info:
                            st.markdown("**代码模板**:")
                            st.code(img_info['code_template'], language='python')
                else:
                    st.info("该类别下暂无图表")
            
            elif img_action == "新建图表":
                st.subheader("新建图表类型")
                
                with st.form("new_image_form", clear_on_submit=True):
                    img_name = st.text_input("图表名称", key="new_img_name")
                    category = st.selectbox("图表类别", get_image_categories() + ["其他"], key="new_img_category")
                    description = st.text_area("图表描述", key="new_img_desc")
                    applicable = st.text_input("适用场景", key="new_img_applicable")
                    suggested_models = st.text_input("适用模型（逗号分隔）", key="new_img_models")
                    code_template = st.text_area("代码模板", height=200, key="new_img_code")
                    
                    submitted = st.form_submit_button("保存图表")
                    if submitted:
                        if not img_name:
                            st.warning("请输入图表名称")
                        else:
                            img_info = {
                                "category": category,
                                "description": description,
                                "applicable": applicable,
                                "suggested_models": [m.strip() for m in suggested_models.split(',') if m.strip()],
                                "code_template": code_template
                            }
                            add_image_type(img_name, img_info)
                            st.success(f"图表「{img_name}」已添加")
            
            elif img_action == "编辑图表":
                st.subheader("编辑图表类型")
                
                all_images = list(get_all_image_types().keys())
                if not all_images:
                    st.info("暂无图表可编辑")
                else:
                    selected_image = st.selectbox("选择要编辑的图表", all_images, key="edit_img_select")
                    img_info = get_image_type(selected_image)
                    
                    if img_info:
                        with st.form("edit_image_form"):
                            new_name = st.text_input("图表名称", value=selected_image, key="edit_img_name")
                            category = st.selectbox("图表类别", get_image_categories() + ["其他"], 
                                                  index=get_image_categories().index(img_info.get('category', '其他')) 
                                                  if img_info.get('category') in get_image_categories() else len(get_image_categories()),
                                                  key="edit_img_category")
                            description = st.text_area("图表描述", value=img_info.get('description', ''), key="edit_img_desc")
                            applicable = st.text_input("适用场景", value=img_info.get('applicable', ''), key="edit_img_applicable")
                            suggested_models = st.text_input("适用模型（逗号分隔）", value=', '.join(img_info.get('suggested_models', [])), key="edit_img_models")
                            code_template = st.text_area("代码模板", height=200, value=img_info.get('code_template', ''), key="edit_img_code")
                            
                            submitted = st.form_submit_button("保存修改")
                            if submitted:
                                if selected_image != new_name:
                                    delete_image_type(selected_image)
                                
                                updated_info = {
                                    "category": category,
                                    "description": description,
                                    "applicable": applicable,
                                    "suggested_models": [m.strip() for m in suggested_models.split(',') if m.strip()],
                                    "code_template": code_template
                                }
                                add_image_type(new_name, updated_info)
                                st.success(f"图表「{new_name}」已更新")
            
            elif img_action == "删除图表":
                st.subheader("删除图表类型")
                
                all_images = list(get_all_image_types().keys())
                if not all_images:
                    st.info("暂无图表可删除")
                else:
                    selected_image = st.selectbox("选择要删除的图表", all_images, key="delete_img_select")
                    
                    if st.button(f"确认删除「{selected_image}」", key="confirm_delete_img_btn"):
                        if delete_image_type(selected_image):
                            st.success(f"图表「{selected_image}」已删除")
                        else:
                            st.error("删除失败")
    
    elif tab == "代码执行":
        st.header("▶️ 代码执行")
        
        code = st.text_area("输入Python代码", height=300, key="code_input")
        
        if st.button("执行代码", key="run_code_btn"):
            if not code:
                st.warning("请输入代码")
                return
            
            with st.spinner("正在执行代码..."):
                result = run_python_code(code)
                
                if result['success']:
                    st.success("执行成功！")
                    if result['output']:
                        st.markdown("**输出**:")
                        st.text(result['output'])
                    if result['figures']:
                        st.markdown(f"**生成图表 ({len(result['figures'])}张)**:")
                        st.session_state['generated_images'] = []
                        
                        for idx, fig_b64 in enumerate(result['figures']):
                            img_bytes = base64.b64decode(fig_b64)
                            img_fname = f'figure_{idx+1}.png'
                            db.save_file(session_id, f"output_{img_fname}", img_fname, img_bytes)
                            # 写入临时文件供后续显示使用
                            tmp_img = tempfile.NamedTemporaryFile(delete=False, suffix='.png')
                            tmp_img.write(img_bytes)
                            tmp_img.close()
                            st.session_state['generated_images'].append(tmp_img.name)
                            st.image(img_bytes, caption=f"图表 {idx+1}")
                    if result['error']:
                        st.warning(f"警告: {result['error']}")
                else:
                    st.error(f"执行失败:\n{result['error']}")
    
    elif tab == "论文审计":
        st.header("✅ 论文审计")
        
        paper_content = st.text_area("输入论文内容", height=400, key="paper_input")
        
        if st.button("审计论文", key="audit_btn"):
            if not paper_content:
                st.warning("请输入论文内容")
                return
            
            report, issues = generate_qa_report(paper_content)
            st.markdown(report)

    elif tab == "论文学习":
        st.header("📚 论文学习")
        
        st.markdown("上传优秀数学建模论文，AI将分析论文中的模型、代码、图片、提示词和论文结构，用于优化后续论文生成。")
        
        uploaded_file = st.file_uploader("上传论文文件", type=["docx", "pdf", "txt", "md"], key="paper_upload")
        paper_text = st.text_area("或直接输入论文内容", height=400, key="paper_text")
        
        if st.button("分析论文", key="learn_paper_btn"):
            content = ""
            
            if uploaded_file:
                content = process_uploaded_file(uploaded_file)
                if not content:
                    st.error("文件解析失败，请尝试其他格式")
                    return
            elif paper_text:
                content = paper_text
            else:
                st.warning("请上传文件或输入论文内容")
                return
            
            with st.spinner("正在分析论文，请稍候..."):
                provider = get_provider(selected_provider)
                if not provider or not provider.available:
                    st.error("提供商不可用")
                    return
                
                client = provider.create_client()
                coordinator = Coordinator(client, model_name=selected_model)
                
                result, error = run_llm_task(coordinator.learn_from_paper, content)
                if error:
                    st.error(f"分析失败: {error}")
                    return
                
                st.session_state['learn_result'] = result
                st.session_state['editable_paper_data'] = None
        
        if st.session_state.get('learn_result'):
            data = parse_json_safe(st.session_state['learn_result'])
            
            if not st.session_state.get('editable_paper_data'):
                st.session_state['editable_paper_data'] = data if data else {}
            
            editable_data = st.session_state['editable_paper_data']
            
            if editable_data:
                st.success("论文分析完成！请编辑以下内容后保存到知识库")
                
                with st.form("edit_paper_form"):
                    st.subheader("📝 基本信息")
                    editable_data['paper_title'] = st.text_input("论文标题", value=editable_data.get('paper_title', ''), key="edit_title")
                    editable_data['competition'] = st.text_input("竞赛名称", value=editable_data.get('competition', ''), key="edit_competition")
                    editable_data['year'] = st.text_input("年份", value=str(editable_data.get('year', '')), key="edit_year")
                    editable_data['problem_type'] = st.text_input("问题类型", value=editable_data.get('problem_type', ''), key="edit_problem_type")
                    editable_data['keywords'] = st.text_input("关键词（逗号分隔）", value=', '.join(editable_data.get('keywords', [])), key="edit_keywords")
                    
                    st.subheader("📊 模型信息")
                    models = editable_data.get('models', [])
                    for i, model in enumerate(models):
                        st.markdown(f"### 模型 {i+1}: {model.get('name', '')}")
                        model['name'] = st.text_input(f"模型名称 {i+1}", value=model.get('name', ''), key=f"model_name_{i}")
                        model['alias'] = st.text_input(f"模型别名 {i+1}", value=model.get('alias', ''), key=f"model_alias_{i}")
                        model['category'] = st.text_input(f"模型类别 {i+1}", value=model.get('category', ''), key=f"model_category_{i}")
                        model['description'] = st.text_area(f"模型描述 {i+1}", value=model.get('description', ''), key=f"model_desc_{i}", height=100)
                        model['core_formula'] = st.text_input(f"核心公式 {i+1}", value=model.get('core_formula', ''), key=f"model_formula_{i}")
                        model['applicable'] = st.text_area(f"适用场景 {i+1}", value=model.get('applicable', ''), key=f"model_applicable_{i}", height=80)
                        if model.get('code_template'):
                            model['code_template'] = st.text_area(f"代码模板 {i+1}", value=model.get('code_template', ''), key=f"model_code_{i}", height=150)
                    
                    st.subheader("🖼️ 图表信息")
                    images = editable_data.get('images', [])
                    for i, img in enumerate(images):
                        st.markdown(f"### 图表 {i+1}: {img.get('name', '')}")
                        img['name'] = st.text_input(f"图表名称 {i+1}", value=img.get('name', ''), key=f"img_name_{i}")
                        img['category'] = st.text_input(f"图表类别 {i+1}", value=img.get('category', ''), key=f"img_category_{i}")
                        img['description'] = st.text_area(f"图表描述 {i+1}", value=img.get('description', ''), key=f"img_desc_{i}", height=80)
                    
                    st.subheader("💡 提示词")
                    prompts = editable_data.get('prompts', {})
                    prompt_types = ['problem_analysis', 'model_selection', 'modeling_approach', 'solution_method', 'result_analysis', 'paper_structure']
                    prompt_type_labels = {
                        'problem_analysis': '问题分析',
                        'model_selection': '模型选择',
                        'modeling_approach': '建模思路',
                        'solution_method': '求解方法',
                        'result_analysis': '结果分析',
                        'paper_structure': '论文结构'
                    }
                    
                    for p_type in prompt_types:
                        p_list = prompts.get(p_type, [])
                        if p_list:
                            st.markdown(f"#### {prompt_type_labels.get(p_type, p_type)}")
                            for j, prompt in enumerate(p_list):
                                prompt['content'] = st.text_area(f"提示词 {j+1}", value=prompt.get('content', ''), key=f"prompt_{p_type}_{j}_content", height=80)
                                prompt['usage_scenario'] = st.text_input(f"使用场景 {j+1}", value=prompt.get('usage_scenario', ''), key=f"prompt_{p_type}_{j}_scenario")
                                prompt['effect'] = st.text_input(f"预期效果 {j+1}", value=prompt.get('effect', ''), key=f"prompt_{p_type}_{j}_effect")
                    
                    st.subheader("� 论文结构")
                    structure = editable_data.get('structure', {})
                    if structure:
                        structure['writing_style'] = st.text_area("写作风格", value=structure.get('writing_style', ''), key="edit_writing_style", height=100)
                        structure['abstract_writing_tips'] = st.text_area("摘要写作技巧", value=structure.get('abstract_writing_tips', ''), key="edit_abstract_tips", height=100)
                    
                    editable_data['experience_summary'] = st.text_area("经验总结", value=editable_data.get('experience_summary', ''), key="edit_experience", height=150)
                    
                    submitted = st.form_submit_button("保存到知识库")
                    if submitted:
                        editable_data['keywords'] = [k.strip() for k in editable_data['keywords'].split(',') if k.strip()]
                        add_paper(editable_data)
                        st.success("已保存到论文知识库！")
                        st.session_state['learn_result'] = None
                        st.session_state['editable_paper_data'] = None
            else:
                st.markdown(st.session_state['learn_result'])
        
        st.markdown("---")
        st.subheader("📖 已学习的论文")
        
        all_papers = get_all_papers()
        all_paper_list = []
        if 'competitions' in all_papers:
            for comp_name, comp_info in all_papers['competitions'].items():
                for paper in comp_info.get('papers', []):
                    paper['_competition'] = comp_name
                    all_paper_list.append(paper)
        
        if all_paper_list:
            paper_options = [f"{p.get('paper_title', '未知')} ({p.get('_competition', '')})" for p in all_paper_list]
            selected_index = st.selectbox("选择已学习的论文", range(len(paper_options)), format_func=lambda i: paper_options[i], key="learned_paper_select")
            
            paper_data = all_paper_list[selected_index]
            
            col1, col2 = st.columns([2, 1])
            with col1:
                st.markdown(f"**标题**: {paper_data.get('paper_title', '')}")
                st.markdown(f"**竞赛**: {paper_data.get('_competition', '')}")
                st.markdown(f"**年份**: {paper_data.get('year', '')}")
                st.markdown(f"**问题类型**: {paper_data.get('problem_type', '')}")
            
            with col2:
                if st.button(f"删除「{paper_data.get('paper_title', '')}」", key=f"delete_paper_btn"):
                    delete_paper(paper_data.get('paper_title', ''))
                    st.success("已删除")
                    st.experimental_rerun()
            
            if st.checkbox("显示详细信息", key="show_paper_detail"):
                if 'models' in paper_data:
                    st.subheader("**模型**:")
                    for model in paper_data['models']:
                        with st.expander(f"{model.get('name', '')}"):
                            st.markdown(f"**类别**: {model.get('category', '')}")
                            st.markdown(f"**核心公式**: {format_latex_formula(model.get('core_formula', ''))}")
                            st.markdown(f"**适用场景**: {model.get('applicable', '')}")
                
                if 'prompts' in paper_data:
                    st.subheader("**提示词**:")
                    prompts = paper_data['prompts']
                    prompt_type_labels = {
                        'problem_analysis': '问题分析',
                        'model_selection': '模型选择',
                        'modeling_approach': '建模思路',
                        'solution_method': '求解方法',
                        'result_analysis': '结果分析',
                        'paper_structure': '论文结构'
                    }
                    for p_type, p_list in prompts.items():
                        if p_list:
                            st.markdown(f"**{prompt_type_labels.get(p_type, p_type)}**:")
                            for prompt in p_list[:3]:
                                st.markdown(f"  - {prompt.get('content', '')[:80]}...")
                
                if 'structure' in paper_data:
                    st.subheader("**论文结构**:")
                    st.markdown(f"**写作风格**: {paper_data['structure'].get('writing_style', '')[:100]}...")
        else:
            st.info("暂无已学习的论文")

def run_full_process(selected_provider):
    progress_bar = st.progress(0)
    
    try:
        provider = get_provider(selected_provider)
        if not provider or not provider.available:
            st.error("提供商不可用")
            return
        
        client = provider.create_client()
        coordinator = Coordinator(client, model_name=selected_model)
        coordinator.set_knowledge(get_all_papers())
        coordinator.set_competition(selected_competition)
        coordinator.set_data_files(st.session_state.get('uploaded_data_files'))
        
        progress_bar.progress(10)
        st.info("🔍 步骤1：问题分析...")
        result, error = run_llm_task(coordinator.analyze_problem, st.session_state['problem_text'], timeout=600)
        if error:
            st.error(f"问题分析失败: {error}")
            return
        st.session_state['analysis_result'] = result
        st.success("✅ 问题分析完成")
        
        progress_bar.progress(20)
        st.info("🧠 步骤2：模型推荐...")
        result, error = run_llm_task(coordinator.recommend_models, st.session_state['analysis_result'], timeout=600)
        if error:
            st.error(f"模型推荐失败: {error}")
            return
        st.session_state['recommendation_result'] = result
        
        rec_json = parse_json_safe(result)
        if rec_json:
            model_errors = coordinator.validate_models(rec_json)
            image_errors = coordinator.validate_images(rec_json)
            if model_errors or image_errors:
                st.warning("检测到推荐项不在库中，建议检查")
        st.success("✅ 模型推荐完成")
        
        progress_bar.progress(30)
        st.info("🔍 步骤3：模型评审...")
        result, error = run_llm_task(
            coordinator.critic_model,
            st.session_state['analysis_result'],
            st.session_state['recommendation_result'],
            timeout=300
        )
        if error:
            st.warning(f"模型评审失败: {error}")
        else:
            st.session_state['model_critic_result'] = result
            critic_json = parse_json_safe(result)
            if critic_json:
                st.success(f"✅ 模型评审完成（评分: {critic_json.get('score', 0)}/10）")
            else:
                st.success("✅ 模型评审完成")
        
        progress_bar.progress(40)
        st.info("💻 步骤4：代码生成...")
        result, error = run_llm_task(
            coordinator.generate_code,
            st.session_state['analysis_result'],
            st.session_state['recommendation_result'],
            timeout=900
        )
        if error:
            st.error(f"代码生成失败: {error}")
            return
        st.session_state['code_result'] = result
        
        code_json = parse_json_safe(result)
        if code_json:
            model_errors = coordinator.validate_code_models(code_json)
            if model_errors:
                st.warning("检测到代码中使用的模型不在库中")
        st.success("✅ 代码生成完成")
        
        progress_bar.progress(50)
        st.info("📊 步骤5：敏感性分析...")
        result, error = run_llm_task(
            coordinator.analyze_sensitivity,
            st.session_state['recommendation_result'],
            st.session_state['analysis_result'],
            timeout=600
        )
        if error:
            st.warning(f"敏感性分析失败: {error}")
        else:
            st.session_state['sensitivity_result'] = result
            st.success("✅ 敏感性分析完成")
        
        progress_bar.progress(60)
        st.info("📝 步骤6：论文写作...")
        result, error = run_llm_task(
            coordinator.write_paper,
            st.session_state['analysis_result'],
            st.session_state['recommendation_result'],
            st.session_state['code_result'],
            timeout=900
        )
        if error:
            st.error(f"论文写作失败: {error}")
            return
        st.session_state['paper_result'] = result
        st.success("✅ 论文写作完成")
        
        progress_bar.progress(75)
        st.info("🔍 步骤7：论文评审...")
        n_figures = len(st.session_state.get('generated_images', []))
        result, error = run_llm_task(
            coordinator.critic_paper,
            st.session_state['paper_result'],
            st.session_state.get('code_result', ''),
            n_figures,
            0,
            timeout=300
        )
        if error:
            st.warning(f"论文评审失败: {error}")
        else:
            st.session_state['paper_critic_result'] = result
            critic_json = parse_json_safe(result)
            if critic_json:
                st.success(f"✅ 论文评审完成（评分: {critic_json.get('score', 0)}/10）")
            else:
                st.success("✅ 论文评审完成")
        
        progress_bar.progress(85)
        st.info("📊 步骤8：论文评估...")
        paper_data = parse_json_safe(st.session_state['paper_result'])
        if paper_data:
            paper_text = paper_data.get('abstract', '')
            for section in paper_data.get('sections', []):
                paper_text += "\n\n" + section.get('content', '')
            
            code_stdout = ""
            if code_json and 'main_code' in code_json:
                code_stdout = code_json['main_code'].get('stdout', '')[:2000]
            
            eval_result, eval_error = run_llm_task(
                coordinator.evaluate_paper,
                paper_text,
                n_figures,
                0,
                code_stdout,
                timeout=300
            )
            
            if eval_result:
                st.session_state['evaluation_result'] = eval_result
                st.success(f"✅ 论文评估完成（总分: {eval_result.total_score}/100）")
        
        progress_bar.progress(100)
        st.success("🎉 完整流程执行完成！")
        
        display_paper(st.session_state['paper_result'])
        
        if st.session_state.get('evaluation_result'):
            eval_result = st.session_state['evaluation_result']
            st.markdown("---")
            st.subheader("📊 论文评估报告")
            st.markdown(f"**总分**: {eval_result.total_score}/100")
            st.markdown(f"**加权总分**: {eval_result.weighted_total}/100")
            
            col1, col2, col3, col4, col5 = st.columns(5)
            with col1:
                st.metric("假设合理性", eval_result.dimension_scores['assumption'])
            with col2:
                st.metric("建模创新性", eval_result.dimension_scores['innovation'])
            with col3:
                st.metric("结果正确性", eval_result.dimension_scores['correctness'])
            with col4:
                st.metric("写作清晰性", eval_result.dimension_scores['clarity'])
            with col5:
                st.metric("综合深度", eval_result.dimension_scores['depth'])
            
            if eval_result.comments:
                st.markdown("#### 评审意见")
                for comment in eval_result.comments:
                    st.markdown(f"- {comment}")
    except Exception as e:
        st.error(f"流程执行失败: {str(e)}")
    finally:
        progress_bar.empty()

if __name__ == "__main__":
    main()