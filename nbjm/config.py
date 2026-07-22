import os
import streamlit as st
from dotenv import load_dotenv

load_dotenv()

def get_env(key, default=""):
    """从 Streamlit Secrets 或环境变量中读取配置"""
    # 优先从 Streamlit Secrets 读取
    try:
        if key in st.secrets:
            return st.secrets[key]
    except Exception:
        pass
    # 否则从环境变量读取
    return os.getenv(key, default)

class Settings:
    OPENAI_API_KEY = get_env("OPENAI_API_KEY", "")
    OPENAI_BASE_URL = get_env("OPENAI_BASE_URL", "https://api.openai.com/v1")
    OPENAI_MODEL = get_env("OPENAI_MODEL", "gpt-4o-mini")
    
    DEEPSEEK_API_KEY = get_env("DEEPSEEK_API_KEY", "")
    DEEPSEEK_BASE_URL = get_env("DEEPSEEK_BASE_URL", "https://api.deepseek.com")
    DEEPSEEK_MODEL = get_env("DEEPSEEK_MODEL", "deepseek-v4-pro")
    
    GLM_API_KEY = get_env("GLM_API_KEY", "")
    GLM_BASE_URL = get_env("GLM_BASE_URL", "https://open.bigmodel.cn/api/paas/v4")
    GLM_MODEL = get_env("GLM_MODEL", "glm-4-flash")
    
    QWEN_API_KEY = get_env("QWEN_API_KEY", "")
    QWEN_BASE_URL = get_env("QWEN_BASE_URL", "https://dashscope.aliyuncs.com/compatible-mode/v1")
    QWEN_MODEL = get_env("QWEN_MODEL", "qwen-plus")
    
    VOLCENGINE_API_KEY = get_env("VOLCENGINE_API_KEY", "")
    VOLCENGINE_BASE_URL = get_env("VOLCENGINE_BASE_URL", "https://ark.cn-beijing.volces.com/api/v3")
    VOLCENGINE_MODEL = get_env("VOLCENGINE_MODEL", "doubao-seed-2-0")
    
    DEFAULT_PROVIDER = get_env("DEFAULT_PROVIDER", "openai")
    DEFAULT_MODEL = get_env("DEFAULT_MODEL", "gpt-4o-mini")
    
    MAX_TOOL_TURNS = int(get_env("MAX_TOOL_TURNS", "5"))
    CODE_TIMEOUT = int(get_env("CODE_TIMEOUT", "60"))
    
    DATA_DIR = os.path.join(os.path.dirname(__file__), "data")
    KNOWLEDGE_DIR = os.path.join(DATA_DIR, "knowledge")
    CACHE_DIR = os.path.join(DATA_DIR, "cache")
    OUTPUT_DIR = os.path.join(DATA_DIR, "output")
    
    @staticmethod
    def ensure_dirs():
        for dir_path in [Settings.DATA_DIR, Settings.KNOWLEDGE_DIR, Settings.CACHE_DIR, Settings.OUTPUT_DIR]:
            os.makedirs(dir_path, exist_ok=True)

settings = Settings()
settings.ensure_dirs()