import streamlit as st


def get_theme_css(is_dark):
    """返回仅包含必要自定义的 CSS，主体颜色由 Streamlit 原生主题控制"""
    if is_dark:
        return """
        <style>
        .stButton>button {
            border-radius: 8px !important;
            padding: 8px 20px !important;
            transition: all 0.3s ease !important;
            font-weight: 500;
        }
        .stButton>button:hover {
            transform: translateY(-2px) !important;
        }
        .stFileUploader>div>div>button {
            border-radius: 12px;
        }
        .stTabs [data-baseweb="tab"] {
            border-radius: 8px 8px 0 0;
            padding: 8px 16px;
        }
        </style>
        """
    else:
        return """
        <style>
        .stButton>button {
            border-radius: 8px !important;
            padding: 8px 20px !important;
            transition: all 0.3s ease !important;
            font-weight: 500;
        }
        .stButton>button:hover {
            transform: translateY(-2px) !important;
        }
        .stFileUploader>div>div>button {
            border-radius: 12px;
        }
        .stTabs [data-baseweb="tab"] {
            border-radius: 8px 8px 0 0;
            padding: 8px 16px;
        }
        </style>
        """


def apply_theme():
    """检测 Streamlit 原生主题并应用，优先使用原生配置"""
    # 尝试从 Streamlit 原生配置获取主题
    try:
        native_theme = st.get_option("theme.base")
    except Exception:
        native_theme = None

    # 如果用户手动设置了主题，优先使用；否则跟随 Streamlit 原生
    if 'theme' not in st.session_state:
        st.session_state['theme'] = native_theme or 'light'
    elif native_theme and st.session_state['theme'] != native_theme:
        # 如果 Streamlit 原生主题与手动设置不同，以原生为准
        st.session_state['theme'] = native_theme

    is_dark = st.session_state['theme'] == 'dark'
    st.markdown(get_theme_css(is_dark), unsafe_allow_html=True)

    return is_dark


def theme_toggle_button():
    """在侧边栏显示主题切换按钮，同时提示可使用 Streamlit 原生设置"""
    if 'theme' not in st.session_state:
        st.session_state['theme'] = 'light'

    try:
        native_theme = st.get_option("theme.base")
    except Exception:
        native_theme = None

    if native_theme and st.session_state['theme'] != native_theme:
        st.session_state['theme'] = native_theme

    theme_icon = "🌙" if st.session_state['theme'] == 'light' else "☀️"
    label = f"{theme_icon} {'切换暗色' if st.session_state['theme'] == 'light' else '切换亮色'}"
    if st.sidebar.button(label, key="theme_toggle"):
        st.session_state['theme'] = 'dark' if st.session_state['theme'] == 'light' else 'light'
        st.rerun()
