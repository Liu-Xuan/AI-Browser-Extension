"""
配置管理模块

此模块负责管理整个应用的配置信息，包括：
- LLM（大语言模型）的连接配置
- API 接口配置
- 系统提示词配置
- RAGFlow 知识库配置

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
    """应用配置"""
    
    # LLM API Keys
    OPENAI_API_KEY: str
    DEEPSEEK_API_KEY: str
    MACSTUDIO_API_KEY: str

    # LLM API URLs
    OLLAMA_API_URL: str = "http://host.docker.internal:11434/api/generate"
    OPENAI_API_URL: str = "https://api.openai.com/v1"
    DEEPSEEK_API_URL: str = "https://api.deepseek.com/v1"
    MACSTUDIO_API_URL: str = "http://172.19.9.158:9997"

    # LLM Models
    OLLAMA_MODEL: str = "qwen2.5:32b"
    OPENAI_MODEL: str = "chatgpt-4o-latest"
    DEEPSEEK_CHAT_MODEL: str = "deepseek-chat"
    DEEPSEEK_REASONER_MODEL: str = "deepseek-reasoner"
    MACSTUDIO_MODEL: str = "qwen2.5-32B-MLX"

    # API Settings
    LLM_TIMEOUT: int = 30
    API_PREFIX: str = "/api/v1"

    # RAGFlow Settings
    RAGFLOW_API_URL: str = "http://172.19.12.146:8888"
    RAGFLOW_API_KEY: str = "ragflow-RkOWJjM2ZhZDFhZTExZWZhYmRmMDI0Mm"

    # LLM 配置映射
    @property
    def LLM_CONFIGS(self) -> Dict[str, LLMConfig]:
        """获取 LLM 配置映射"""
        return {
            "ollama": LLMConfig(
                api_url=self.OLLAMA_API_URL,
                api_key=None,
                model=self.OLLAMA_MODEL
            ),
            "gpt4o": LLMConfig(
                api_url=f"{self.OPENAI_API_URL}/chat/completions",
                api_key=self.OPENAI_API_KEY,
                model=self.OPENAI_MODEL
            ),
            "deepseek-v3": LLMConfig(
                api_url=f"{self.DEEPSEEK_API_URL}/chat/completions",
                api_key=self.DEEPSEEK_API_KEY,
                model=self.DEEPSEEK_CHAT_MODEL
            ),
            "deepseek-r1": LLMConfig(
                api_url=f"{self.DEEPSEEK_API_URL}/chat/completions",
                api_key=self.DEEPSEEK_API_KEY,
                model=self.DEEPSEEK_REASONER_MODEL
            ),
            "macstudio-qwen": LLMConfig(
                api_url=f"{self.MACSTUDIO_API_URL}/chat/completions",
                api_key=self.MACSTUDIO_API_KEY,
                model=self.MACSTUDIO_MODEL
            )
        }
    
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

settings = Settings() 