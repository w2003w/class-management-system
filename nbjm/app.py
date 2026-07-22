import streamlit as st
import os
import db

st.set_page_config(page_title="数学建模智能体", layout="wide", initial_sidebar_state="expanded")

def get_current_mode():
    return db.get_current_mode()

def set_current_mode(mode):
    db.set_current_mode(mode)

def main():
    from auth import check_login, show_login_page, logout
    
    if check_login():
        show_admin_console()
        return
    
    if st.session_state.get('show_login'):
        show_login_page()
        return
    
    show_user_page()

def show_user_page():
    current_mode = get_current_mode()
    
    st.sidebar.title("数学建模助手")
    
    if st.sidebar.button("管理员入口", key="admin_login_btn"):
        st.session_state['show_login'] = True
        st.rerun()
    
    if current_mode == "mode1":
        import streamlit_app
        streamlit_app.main()
    else:
        import user_mode2
        user_mode2.main()

def show_admin_console():
    from auth import logout
    
    st.sidebar.title("管理员控制台")
    
    if st.sidebar.button("退出登录", key="logout_btn"):
        logout()
        st.rerun()
    
    import admin_page
    admin_page.main()

if __name__ == "__main__":
    main()