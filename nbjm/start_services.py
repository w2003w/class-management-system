import subprocess
import time
import os
import sys
import socket


def find_python_executable():
    return sys.executable


def is_port_listening(host="127.0.0.1", port=8901):
    try:
        with socket.socket(socket.AF_INET, socket.SOCK_STREAM) as s:
            s.settimeout(1)
            result = s.connect_ex((host, port))
            return result == 0
    except Exception:
        return False


def start_jcodemunch():
    try:
        uvx_path = os.path.join(os.path.expanduser("~"), "AppData", "Roaming", "Python", "Python314", "Scripts", "uvx.exe")
        
        if os.path.exists(uvx_path):
            proc = subprocess.Popen(
                [uvx_path, "jcodemunch-mcp", "serve", "--transport", "streamable-http", "--host", "127.0.0.1", "--port", "8901"],
                stdout=subprocess.PIPE,
                stderr=subprocess.PIPE,
                shell=False
            )
            print(f"🚀 jcodemunch-mcp 服务已启动 (PID: {proc.pid})")
            return proc
        else:
            print("⚠️ 未找到 uvx.exe，尝试使用 python -m 方式启动")
            python_exe = find_python_executable()
            proc = subprocess.Popen(
                [python_exe, "-m", "jcodemunch_mcp", "serve", "--transport", "streamable-http", "--host", "127.0.0.1", "--port", "8901"],
                stdout=subprocess.PIPE,
                stderr=subprocess.PIPE,
                shell=False
            )
            print(f"🚀 jcodemunch-mcp 服务已启动 (PID: {proc.pid})")
            return proc
    except Exception as e:
        print(f"⚠️ 启动 jcodemunch-mcp 失败: {e}")
        return None


def wait_for_service(host="127.0.0.1", port=8901, timeout=20):
    start_time = time.time()
    while time.time() - start_time < timeout:
        if is_port_listening(host, port):
            print(f"✅ jcodemunch-mcp 服务已就绪")
            return True
        time.sleep(1)
    print(f"⏰ jcodemunch-mcp 服务启动超时")
    return False


def start_streamlit():
    python_exe = find_python_executable()
    port = os.environ.get("PORT", "8501")
    
    print(f"🚀 正在启动 Streamlit 应用 (端口: {port})")
    
    result = subprocess.run(
        [python_exe, "-m", "streamlit", "run", "streamlit_app.py", "--server.port", port, "--server.headless", "true"],
        check=True
    )
    return result


if __name__ == "__main__":
    print("📦 正在启动服务...")
    
    proc = start_jcodemunch()
    
    if proc:
        if wait_for_service():
            print("🎉 jcodemunch-mcp 服务启动完成")
        else:
            print("⚠️ jcodemunch-mcp 服务未就绪，继续启动 Streamlit 应用")
    else:
        print("⚠️ jcodemunch-mcp 启动失败，继续启动 Streamlit 应用")
    
    start_streamlit()