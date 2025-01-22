"""
问答服务模块

此模块提供基于上下文的智能问答服务，特点：
- 基于给定上下文回答问题
- 支持对话历史记录
- 更高的答案准确性（较低的温度值）
- 支持流式输出

主要用于文档问答、知识库问答等场景，强调基于特定内容的准确回答。
"""

from typing import List, Optional, Dict
from utils.llm_wrapper import LLMWrapper
from config import Settings

settings = Settings()

class QAService:
    def __init__(self):
        # 初始化 LLM 封装实例
        self.llm = LLMWrapper()

    async def get_answer(
        self,
        context: str,
        question: str,
        history: Optional[List[Dict[str, str]]] = None,
        stream: bool = False
    ) -> str:
        """
        基于上下文回答问题
        
        此方法专注于从给定的上下文中提取信息来回答问题。
        通过较低的温度值确保回答的确定性和准确性。
        
        Args:
            context: 上下文文本，用于回答问题的参考内容
            question: 用户提出的问题
            history: 可选的对话历史记录，格式为：
                    [{"question": "问题1", "answer": "回答1"}, ...]
            stream: 是否使用流式输出
            
        Returns:
            str: 生成的答案
            
        Raises:
            Exception: 当生成答案失败时抛出异常
        """
        try:
            # 构建包含上下文和历史的提示词
            prompt = self._build_prompt(context, question, history)
            
            # 获取问答助手的系统提示词
            system_prompt = settings.SYSTEM_PROMPTS.get("qa")
            
            # 调用 LLM 生成答案
            response = await self.llm.generate(
                prompt=prompt,
                system_prompt=system_prompt,
                temperature=0.3,  # 使用较低的温度值，增加答案的确定性
                stream=stream
            )
            
            return response.strip()
        except Exception as e:
            raise Exception(f"生成答案失败: {str(e)}")

    def _build_prompt(
        self,
        context: str,
        question: str,
        history: Optional[List[Dict[str, str]]] = None
    ) -> str:
        """
        构建完整的提示词
        
        将上下文、历史对话和当前问题组织成结构化的提示词。
        
        Args:
            context: 上下文文本
            question: 当前问题
            history: 历史对话记录
            
        Returns:
            str: 构建好的提示词
        """
        # 首先添加上下文信息
        prompt = f"请基于以下上下文回答问题。\n\n上下文：\n{context}\n\n"
        
        # 如果有历史对话记录，添加到提示词中
        if history:
            prompt += "历史对话：\n"
            for item in history:
                # 添加历史问题
                prompt += f"问：{item.get('question', '')}\n"
                # 如果有回答，也添加进去
                if 'answer' in item:
                    prompt += f"答：{item['answer']}\n"
        
        # 添加当前问题和答案标识
        prompt += f"\n当前问题：{question}\n\n答："
        return prompt 