import streamlit as st

def get_theme_css(is_dark):
    if is_dark:
        return """
        <style>
        :root {
            --primary-bg: #0f0f23;
            --secondary-bg: #1a1a2e;
            --card-bg: #16213e;
            --text-color: #e0e0e0;
            --text-muted: #a0a0a0;
            --accent-color: #7c3aed;
            --accent-light: #a78bfa;
            --border-color: #374151;
            --success-color: #10b981;
            --warning-color: #f59e0b;
            --error-color: #ef4444;
        }
        .stApp {
            background: linear-gradient(135deg, #0f0f23 0%, #1a1a2e 50%, #16213e 100%);
        }
        .css-18e3th9 {
            background: rgba(15, 15, 35, 0.95) !important;
        }
        .css-1lcbmhc {
            background: rgba(26, 26, 46, 0.95) !important;
        }
        .css-1cypcdb {
            background: rgba(22, 33, 62, 0.9) !important;
            border: 1px solid var(--border-color);
            box-shadow: 0 4px 6px rgba(0,0,0,0.1);
            border-radius: 12px;
        }
        .css-10trblm {
            color: var(--text-color) !important;
        }
        .css-10y5sf6 {
            color: var(--text-muted) !important;
        }
        .css-1kyxreq {
            color: var(--text-color) !important;
        }
        .stButton>button {
            background: linear-gradient(135deg, #7c3aed 0%, #9333ea 100%) !important;
            color: white !important;
            border: none !important;
            border-radius: 8px !important;
            padding: 8px 20px !important;
            transition: all 0.3s ease !important;
            font-weight: 500;
        }
        .stButton>button:hover {
            transform: translateY(-2px) !important;
            box-shadow: 0 4px 15px rgba(124, 58, 237, 0.4) !important;
        }
        .stSelectbox>div>div>select {
            background: var(--card-bg) !important;
            color: var(--text-color) !important;
            border-radius: 8px;
        }
        .stTextInput>div>div>input {
            background: var(--card-bg) !important;
            color: var(--text-color) !important;
            border: 1px solid var(--border-color) !important;
            border-radius: 8px;
        }
        .css-1q8dd3e {
            border-color: var(--border-color) !important;
        }
        .stTextArea>div>div>textarea {
            background: var(--card-bg) !important;
            color: var(--text-color) !important;
            border: 1px solid var(--border-color) !important;
            border-radius: 8px;
        }
        .stFileUploader>div>div>button {
            background: var(--card-bg) !important;
            color: var(--text-color) !important;
            border: 2px dashed var(--border-color) !important;
            border-radius: 12px;
        }
        .css-1wivap2 {
            background: var(--card-bg) !important;
        }
        .stTabs [data-baseweb="tab"] {
            background: rgba(22, 33, 62, 0.5) !important;
            color: var(--text-muted) !important;
            border-radius: 8px 8px 0 0;
            padding: 8px 16px;
        }
        .stTabs [data-baseweb="tab"]:hover {
            background: rgba(22, 33, 62, 0.8) !important;
            color: var(--text-color) !important;
        }
        .stTabs [data-baseweb="tab"][aria-selected="true"] {
            background: var(--accent-color) !important;
            color: white !important;
        }
        </style>
        """
    else:
        return """
        <style>
        :root {
            --primary-bg: #ffffff;
            --secondary-bg: #f8fafc;
            --card-bg: #ffffff;
            --text-color: #1e293b;
            --text-muted: #64748b;
            --accent-color: #6366f1;
            --accent-light: #818cf8;
            --border-color: #e2e8f0;
            --success-color: #22c55e;
            --warning-color: #f59e0b;
            --error-color: #ef4444;
        }
        .stApp {
            background: linear-gradient(135deg, #ffffff 0%, #f8fafc 50%, #f1f5f9 100%);
        }
        .css-18e3th9 {
            background: rgba(255, 255, 255, 0.95) !important;
        }
        .css-1lcbmhc {
            background: rgba(248, 250, 252, 0.95) !important;
        }
        .css-1cypcdb {
            background: rgba(255, 255, 255, 0.9) !important;
            border: 1px solid var(--border-color);
            box-shadow: 0 4px 6px rgba(0,0,0,0.05);
            border-radius: 12px;
        }
        .css-10trblm {
            color: var(--text-color) !important;
        }
        .css-10y5sf6 {
            color: var(--text-muted) !important;
        }
        .css-1kyxreq {
            color: var(--text-color) !important;
        }
        .stButton>button {
            background: linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%) !important;
            color: white !important;
            border: none !important;
            border-radius: 8px !important;
            padding: 8px 20px !important;
            transition: all 0.3s ease !important;
            font-weight: 500;
        }
        .stButton>button:hover {
            transform: translateY(-2px) !important;
            box-shadow: 0 4px 15px rgba(99, 102, 241, 0.4) !important;
        }
        .stSelectbox>div>div>select {
            background: var(--card-bg) !important;
            color: var(--text-color) !important;
            border-radius: 8px;
        }
        .stTextInput>div>div>input {
            background: var(--card-bg) !important;
            color: var(--text-color) !important;
            border: 1px solid var(--border-color) !important;
            border-radius: 8px;
        }
        .css-1q8dd3e {
            border-color: var(--border-color) !important;
        }
        .stTextArea>div>div>textarea {
            background: var(--card-bg) !important;
            color: var(--text-color) !important;
            border: 1px solid var(--border-color) !important;
            border-radius: 8px;
        }
        .stFileUploader>div>div>button {
            background: var(--card-bg) !important;
            color: var(--text-color) !important;
            border: 2px dashed var(--border-color) !important;
            border-radius: 12px;
        }
        .css-1wivap2 {
            background: var(--card-bg) !important;
        }
        .stTabs [data-baseweb="tab"] {
            background: rgba(248, 250, 252, 0.8) !important;
            color: var(--text-muted) !important;
            border-radius: 8px 8px 0 0;
            padding: 8px 16px;
        }
        .stTabs [data-baseweb="tab"]:hover {
            background: rgba(248, 250, 252, 1) !important;
            color: var(--text-color) !important;
        }
        .stTabs [data-baseweb="tab"][aria-selected="true"] {
            background: var(--accent-color) !important;
            color: white !important;
        }
        </style>
        """

def apply_theme():
    if 'theme' not in st.session_state:
        st.session_state['theme'] = 'light'
    
    is_dark = st.session_state['theme'] == 'dark'
    st.markdown(get_theme_css(is_dark), unsafe_allow_html=True)
    
    return is_dark

def theme_toggle_button():
    # 确保 theme 已初始化
    if 'theme' not in st.session_state:
        st.session_state['theme'] = 'light'
    theme_icon = "🌙" if st.session_state['theme'] == 'light' else "☀️"
    label = f"{theme_icon} {'切换暗色' if st.session_state['theme'] == 'light' else '切换亮色'}"
    if st.sidebar.button(label, key="theme_toggle"):
        st.session_state['theme'] = 'dark' if st.session_state['theme'] == 'light' else 'light'
        st.rerun()