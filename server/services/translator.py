from typing import Optional
from utils.llm_wrapper import LLMWrapper

class TranslatorService:
    def __init__(self):
        self.llm = LLMWrapper()

    async def translate(self, text: str, target_lang: str, source_lang: Optional[str] = None) -> str:
        """
        翻译文本到目标语言
        
        Args:
            text: 要翻译的文本
            target_lang: 目标语言代码 (如 'zh', 'en', 'ja' 等)
            source_lang: 源语言代码 (可选)
            
        Returns:
            str: 翻译后的文本
        """
        # 构建提示词
        if source_lang:
            prompt = f"将以下{source_lang}文本翻译成{target_lang}：\n{text}"
        else:
            prompt = f"将以下文本翻译成{target_lang}：\n{text}"

        try:
            # 调用LLM进行翻译
            response = await self.llm.generate(prompt)
            return response.strip()
        except Exception as e:
            raise Exception(f"翻译失败: {str(e)}") 