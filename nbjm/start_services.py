import subprocess
import time
import os
import sys


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
            print("⚠️ 未找到 uvx.exe，尝试直接使用 jcodemunch-mcp")
            proc = subprocess.Popen(
                ["jcodemunch-mcp", "serve", "--transport", "streamable-http", "--host", "127.0.0.1", "--port", "8901"],
                stdout=subprocess.PIPE,
                stderr=subprocess.PIPE,
                shell=True
            )
            print(f"🚀 jcodemunch-mcp 服务已启动 (PID: {proc.pid})")
            return proc
    except Exception as e:
        print(f"⚠️ 启动 jcodemunch-mcp 失败: {e}")
        return None


def wait_for_service(host="127.0.0.1", port=8901, timeout=10):
    import httpx
    start_time = time.time()
    while time.time() - start_time < timeout:
        try:
            response = httpx.get(f"http://{host}:{port}/health")
            if response.status_code == 200:
                print(f"✅ jcodemunch-mcp 服务已就绪")
                return True
        except Exception:
            pass
        time.sleep(1)
    print(f"⏰ jcodemunch-mcp 服务启动超时")
    return False


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
    
    port = os.environ.get("PORT", "8501")
    os.system(f"streamlit run streamlit_app.py --server.port {port} --server.headless true")
