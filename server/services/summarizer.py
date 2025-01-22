from typing import Optional
from utils.llm_wrapper import LLMWrapper
from utils.text_processor import TextProcessor

class SummarizerService:
    def __init__(self):
        self.llm = LLMWrapper()
        self.text_processor = TextProcessor()

    async def summarize(self, text: str, max_length: Optional[int] = None) -> str:
        """
        生成文本摘要
        
        Args:
            text: 要生成摘要的文本
            max_length: 摘要的最大长度（可选）
            
        Returns:
            str: 生成的摘要
        """
        # 预处理文本
        cleaned_text = self.text_processor.clean_text(text)
        
        # 构建提示词
        prompt = "请生成以下文本的摘要，保持主要信息完整：\n\n" + cleaned_text
        if max_length:
            prompt += f"\n\n请将摘要控制在{max_length}字以内。"

        try:
            # 调用LLM生成摘要
            response = await self.llm.generate(prompt)
            return response.strip()
        except Exception as e:
            raise Exception(f"生成摘要失败: {str(e)}") 