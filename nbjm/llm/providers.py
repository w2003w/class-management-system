from openai import OpenAI
from config import settings

class LLMProvider:
    def __init__(self, name, api_key, base_url, model, models=None):
        self.name = name
        self.api_key = api_key
        self.base_url = base_url
        self.model = model
        self.models = models if models else []
        self.available = bool(api_key)
    
    def create_client(self):
        if not self.available:
            return None
        return OpenAI(api_key=self.api_key, base_url=self.base_url)

def load_providers():
    providers = []
    
    if settings.DEEPSEEK_API_KEY:
        deepseek_models = [
            "deepseek-v4-flash",
            "deepseek-v4-pro",
        ]
        providers.append(LLMProvider(
            "deepseek",
            settings.DEEPSEEK_API_KEY,
            settings.DEEPSEEK_BASE_URL,
            settings.DEEPSEEK_MODEL,
            deepseek_models
        ))
    
    if settings.QWEN_API_KEY:
        qwen_models = [
            "qwen-plus",
            "qwen-max",
            "qwen-turbo",
            "qwen2-7b-instruct",
            "qwen2-14b-instruct",
            "qwen3-8b-instruct",
            "qwen3-72b-instruct",
            "qwen3.7-plus",
            "qwen3.7-max-2026-05-17",
            "qwen3.7-max-2026-06-08"
        ]
        providers.append(LLMProvider(
            "qwen",
            settings.QWEN_API_KEY,
            settings.QWEN_BASE_URL,
            settings.QWEN_MODEL,
            qwen_models
        ))
    
    return providers

def get_provider(provider_name):
    for p in load_providers():
        if p.name == provider_name or provider_name.lower() in p.name.lower():
            return p
    return None

def get_default_provider():
    provider = get_provider(settings.DEFAULT_PROVIDER)
    if provider and provider.available:
        return provider
    for p in load_providers():
        if p.available:
            return p
    return None
