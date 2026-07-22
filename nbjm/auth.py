import streamlit as st

ADMIN_USERNAME = "admin"
ADMIN_PASSWORD = "admin123"

def check_login():
    if 'is_admin_logged_in' not in st.session_state:
        st.session_state['is_admin_logged_in'] = False

    return st.session_state['is_admin_logged_in']

def login(username, password):
    if username == ADMIN_USERNAME and password == ADMIN_PASSWORD:
        st.session_state['is_admin_logged_in'] = True
        return True
    return False

def logout():
    st.session_state['is_admin_logged_in'] = False
    st.session_state.pop('show_admin', None)

def show_login_page():
    st.title("🔐 管理员登录")
    
    username = st.text_input("账号")
    password = st.text_input("密码", type="password")
    
    if st.button("登录", type="primary"):
        if login(username, password):
            st.success("登录成功！")
            st.session_state['show_admin'] = True
            st.rerun()
        else:
            st.error("账号或密码错误")