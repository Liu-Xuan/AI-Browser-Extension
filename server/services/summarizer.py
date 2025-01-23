from typing import Optional
from utils.llm_wrapper import LLMWrapper
from utils.text_processor import TextProcessor
from config import Settings

class SummarizerService:
    def __init__(self, model_type: str = "deepseek-r1"):
        """初始化摘要服务
        
        Args:
            model_type: 使用的 LLM 类型，默认使用 DeepSeek Reasoner
        """
        self.llm = LLMWrapper(model_type=model_type)
        self.text_processor = TextProcessor()

    async def summarize(self, text: str, max_length: Optional[int] = None) -> str:
        """生成文本摘要
        
        Args:
            text: 要生成摘要的文本
            max_length: 摘要的最大长度（可选）
            
        Returns:
            str: 生成的摘要
            
        Raises:
            Exception: 生成摘要失败时抛出异常
        """
        # 预处理文本
        cleaned_text = self.text_processor.clean_text(text)
        
        # 构建提示词
        prompt = "请生成以下文本的摘要，保持主要信息完整：\n\n" + cleaned_text
        if max_length:
            prompt += f"\n\n请将摘要控制在{max_length}字以内。"
            
        # 添加系统提示词
        system_prompt = """你是一个专业的文本摘要助手。在生成摘要时，请遵循以下原则：
1. 保持主要信息的完整性和准确性
2. 使用简洁清晰的语言
3. 保持原文的核心观点和论述逻辑
4. 如果有数字或关键数据，请准确保留"""

        try:
            # 调用LLM生成摘要
            response = await self.llm.generate(
                prompt=prompt,
                system_prompt=system_prompt,
                temperature=0.3  # 使用较低的温度以获得更稳定的摘要结果
            )
            return response.strip()
        except Exception as e:
            print(f"\n[DEBUG] 生成摘要失败:")
            print(f"Text Length: {len(text)}")
            print(f"Max Length: {max_length}")
            print(f"Error: {str(e)}\n")
            raise Exception(f"生成摘要失败: {str(e)}") 