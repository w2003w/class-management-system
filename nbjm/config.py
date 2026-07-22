import os
from dotenv import load_dotenv

load_dotenv()

class Settings:
    OPENAI_API_KEY = os.getenv("OPENAI_API_KEY", "")
    OPENAI_BASE_URL = os.getenv("OPENAI_BASE_URL", "https://api.openai.com/v1")
    OPENAI_MODEL = os.getenv("OPENAI_MODEL", "gpt-4o-mini")
    
    DEEPSEEK_API_KEY = os.getenv("DEEPSEEK_API_KEY", "")
    DEEPSEEK_BASE_URL = os.getenv("DEEPSEEK_BASE_URL", "https://api.deepseek.com")
    DEEPSEEK_MODEL = os.getenv("DEEPSEEK_MODEL", "deepseek-v4-pro")
    
    GLM_API_KEY = os.getenv("GLM_API_KEY", "")
    GLM_BASE_URL = os.getenv("GLM_BASE_URL", "https://open.bigmodel.cn/api/paas/v4")
    GLM_MODEL = os.getenv("GLM_MODEL", "glm-4-flash")
    
    QWEN_API_KEY = os.getenv("QWEN_API_KEY", "")
    QWEN_BASE_URL = os.getenv("QWEN_BASE_URL", "https://dashscope.aliyuncs.com/compatible-mode/v1")
    QWEN_MODEL = os.getenv("QWEN_MODEL", "qwen-plus")
    
    VOLCENGINE_API_KEY = os.getenv("VOLCENGINE_API_KEY", "")
    VOLCENGINE_BASE_URL = os.getenv("VOLCENGINE_BASE_URL", "https://ark.cn-beijing.volces.com/api/v3")
    VOLCENGINE_MODEL = os.getenv("VOLCENGINE_MODEL", "doubao-seed-2-0")
    
    DEFAULT_PROVIDER = os.getenv("DEFAULT_PROVIDER", "openai")
    DEFAULT_MODEL = os.getenv("DEFAULT_MODEL", "gpt-4o-mini")
    
    MAX_TOOL_TURNS = int(os.getenv("MAX_TOOL_TURNS", 5))
    CODE_TIMEOUT = int(os.getenv("CODE_TIMEOUT", 60))
    
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