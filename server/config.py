"""
配置管理模块

此模块负责管理整个应用的配置信息，包括：
- LLM（大语言模型）的连接配置
- API 接口配置
- 系统提示词配置

配置项可以通过环境变量或 .env 文件进行覆盖。
使用 pydantic_settings 确保配置的类型安全。
"""

from typing import Dict, Any, Optional
from pydantic_settings import BaseSettings

class LLMConfig:
    def __init__(
        self,
        api_url: str,
        api_key: Optional[str] = None,
        model: Optional[str] = None
    ):
        self.api_url = api_url
        self.api_key = api_key
        self.model = model

class Settings(BaseSettings):
    # LLM 配置
    OLLAMA_API_URL: str = "http://host.docker.internal:11434/api/generate"
    OLLAMA_MODEL: str = "qwen2.5:32b"
    
    OPENAI_API_KEY: str = ""  # 从环境变量获取
    OPENAI_MODEL: str = "chatgpt-4o-latest"
    
    DEEPSEEK_API_KEY: str = ""  # 从环境变量获取
    DEEPSEEK_API_URL: str = "https://api.deepseek.com/v1"
    DEEPSEEK_CHAT_MODEL: str = "deepseek-chat"
    DEEPSEEK_REASONER_MODEL: str = "deepseek-reasoner"
    
    MACSTUDIO_API_KEY: str = ""  # 从环境变量获取
    MACSTUDIO_API_URL: str = "http://172.19.9.158:9997"
    MACSTUDIO_MODEL: str = "qwen2.5-32B-MLX"
    
    LLM_TIMEOUT: int = 30  # API 请求超时时间（秒）
    
    # LLM 模型配置映射
    LLM_CONFIGS: Dict[str, LLMConfig] = {
        "ollama": LLMConfig(
            api_url=OLLAMA_API_URL,
            model=OLLAMA_MODEL
        ),
        "gpt4": LLMConfig(
            api_url="https://api.openai.com/v1",
            api_key=OPENAI_API_KEY,
            model=OPENAI_MODEL
        ),
        "deepseek-v3": LLMConfig(
            api_url=DEEPSEEK_API_URL,
            api_key=DEEPSEEK_API_KEY,
            model=DEEPSEEK_CHAT_MODEL
        ),
        "deepseek-r1": LLMConfig(
            api_url=DEEPSEEK_API_URL,
            api_key=DEEPSEEK_API_KEY,
            model=DEEPSEEK_REASONER_MODEL
        ),
        "macstudio-qwen": LLMConfig(
            api_url=MACSTUDIO_API_URL,
            api_key=MACSTUDIO_API_KEY,
            model=MACSTUDIO_MODEL
        )
    }
    
    # API 配置
    API_PREFIX: str = "/api/v1"  # API 路由前缀
    
    # 系统提示词配置
    # 为不同功能模块定义专门的系统提示词，指导模型的行为
    SYSTEM_PROMPTS: Dict[str, str] = {
        # 翻译助手的系统提示词
        "translator": "你是一个专业的翻译助手。请准确翻译用户的文本，保持原文的语气和风格。",
        # 摘要生成助手的系统提示词
        "summarizer": "你是一个专业的摘要生成助手。请生成准确、简洁的摘要，突出文本的主要观点。",
        # 问答助手的系统提示词
        "qa": "你是一个专业的问答助手。请基于给定的上下文，准确回答用户的问题。",
        # 聊天助手的系统提示词
        "chat": "你是一个智能助手。请理解用户的需求，提供专业、友好的回答。"
    }
    
    class Config:
        # 指定配置文件路径，支持从 .env 文件加载配置
        env_file = ".env" 