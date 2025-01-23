from typing import Optional
from utils.llm_wrapper import LLMWrapper
from config import Settings

class TranslatorService:
    def __init__(self, model_type: str = "deepseek-r1"):
        """初始化翻译服务
        
        Args:
            model_type: 使用的 LLM 类型，默认使用 DeepSeek Reasoner
        """
        self.llm = LLMWrapper(model_type=model_type)

    async def translate(self, text: str, target_lang: str, source_lang: Optional[str] = None) -> str:
        """翻译文本到目标语言
        
        Args:
            text: 要翻译的文本
            target_lang: 目标语言代码 (如 'zh', 'en', 'ja' 等)
            source_lang: 源语言代码 (可选)
            
        Returns:
            str: 翻译后的文本
            
        Raises:
            Exception: 翻译失败时抛出异常
        """
        # 构建提示词
        if source_lang:
            prompt = f"将以下{source_lang}文本翻译成{target_lang}：\n{text}"
        else:
            prompt = f"将以下文本翻译成{target_lang}：\n{text}"
            
        # 添加系统提示词
        system_prompt = "你是一个专业的翻译助手。请准确翻译用户提供的文本，保持原文的语气和风格。"

        try:
            # 调用LLM进行翻译
            response = await self.llm.generate(
                prompt=prompt,
                system_prompt=system_prompt,
                temperature=0.3  # 使用较低的温度以获得更稳定的翻译结果
            )
            return response.strip()
        except Exception as e:
            print(f"\n[DEBUG] 翻译失败:")
            print(f"Text: {text}")
            print(f"Target: {target_lang}")
            print(f"Source: {source_lang}")
            print(f"Error: {str(e)}\n")
            raise Exception(f"翻译失败: {str(e)}") 