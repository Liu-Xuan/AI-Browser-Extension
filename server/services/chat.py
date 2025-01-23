"""
聊天服务模块

提供智能对话服务，支持多种对话模型：
- Ollama（本地部署）
- OpenAI GPT-4
- DeepSeek V3/R1
- MacStudio Qwen2.5
"""

import logging
from typing import List, Dict, Optional
from utils.llm_wrapper import LLMWrapper
from config import Settings

settings = Settings()
logger = logging.getLogger(__name__)

class ChatService:
    def __init__(self, default_model: str = "deepseek-r1"):
        """初始化聊天服务
        
        Args:
            default_model: 默认使用的模型类型
        """
        self.default_model = default_model
        self.system_prompts = {
            "ollama": """你是一个由 Ollama 部署的本地 LLM 助手，基于 Qwen2.5 32B 模型。
在对话中，请遵循以下原则：
1. 理解用户的需求，提供专业、友好的回答
2. 保持对话的连贯性和上下文理解
3. 如果涉及代码，提供详细的解释和示例
4. 如果不确定，诚实地表达不确定性""",

            "gpt4": """你是 OpenAI 的 GPT-4 助手。
在对话中，请遵循以下原则：
1. 理解用户的需求，提供专业、友好的回答
2. 保持对话的连贯性和上下文理解
3. 如果涉及代码，提供详细的解释和示例
4. 如果不确定，诚实地表达不确定性""",

            "deepseek-v3": """你是 DeepSeek V3 助手。
在对话中，请遵循以下原则：
1. 理解用户的需求，提供专业、友好的回答
2. 保持对话的连贯性和上下文理解
3. 如果涉及代码，提供详细的解释和示例
4. 如果不确定，诚实地表达不确定性""",

            "deepseek-r1": """你是 DeepSeek R1 推理助手。
在对话中，请遵循以下原则：
1. 理解用户的需求，提供专业、友好的回答
2. 保持对话的连贯性和上下文理解
3. 如果涉及代码，提供详细的解释和示例
4. 如果不确定，诚实地表达不确定性""",

            "macstudio-qwen": """你是运行在 MacStudio 上的 Qwen2.5 32B 助手。
在对话中，请遵循以下原则：
1. 理解用户的需求，提供专业、友好的回答
2. 保持对话的连贯性和上下文理解
3. 如果涉及代码，提供详细的解释和示例
4. 如果不确定，诚实地表达不确定性"""
        }

    async def chat(
        self,
        messages: List[Dict[str, str]],
        model_type: Optional[str] = None,
        context: Optional[Dict[str, str]] = None
    ) -> Dict[str, str]:
        """处理聊天请求
        
        Args:
            messages: 对话历史
            model_type: 模型类型，如果未指定则使用默认模型
            context: 上下文信息
            
        Returns:
            Dict[str, str]: 助手的回复
            
        Raises:
            Exception: 当生成回复失败时抛出异常
        """
        try:
            # 使用指定的模型类型或默认模型
            model = model_type or self.default_model
            logger.info(f"开始处理聊天请求，model_type={model}")
            
            # 创建 LLM 实例
            llm = LLMWrapper(model)
            logger.info(f"成功创建 LLM 实例，model_type={model}")
            
            # 构建完整的提示词
            prompt = self._build_prompt(messages, context)
            logger.info(f"构建的提示词：{prompt}")
            
            # 获取对应模型的系统提示词
            system_prompt = self.system_prompts.get(model, self.system_prompts[self.default_model])
            logger.info(f"系统提示词：{system_prompt}")
            
            # 调用 LLM 生成回复
            response = await llm.generate(
                prompt=prompt,
                system_prompt=system_prompt,
                temperature=0.7,
                stream=False
            )
            logger.info(f"LLM 回复：{response}")
            
            return {
                "role": "assistant",
                "content": response
            }
            
        except Exception as e:
            error_msg = f"生成回复时出错: {str(e)}"
            logger.error(error_msg, exc_info=True)
            print(f"\n[DEBUG] 聊天错误:")
            print(f"Model: {model_type or self.default_model}")
            print(f"Messages: {messages}")
            print(f"Context: {context}")
            print(f"Error: {str(e)}\n")
            return {
                "role": "assistant",
                "content": error_msg
            }

    def _build_prompt(self, messages: List[Dict[str, str]], context: Optional[Dict[str, str]] = None) -> str:
        """构建完整的提示词
        
        将上下文信息和对话历史组织成结构化的提示词。
        
        Args:
            messages: 聊天历史记录
            context: 可选的上下文信息
            
        Returns:
            str: 构建好的提示词
        """
        prompt = ""
        
        # 添加参考资料（如果有）
        if context:
            prompt += f"参考资料：\n"
            if context.get('title'):
                prompt += f"标题：{context['title']}\n"
            if context.get('url'):
                prompt += f"链接：{context['url']}\n"
            if context.get('content'):
                prompt += f"内容：\n{context['content']}\n\n"
            prompt += "请基于以上参考资料回答问题。\n\n"
        
        # 添加对话历史
        for msg in messages:
            # 根据角色设置说话者标识
            role = "用户" if msg["role"] == "user" else "助手"
            prompt += f"{role}：{msg['content']}\n"
        
        # 添加助手标识，等待生成回复
        prompt += "助手："
        return prompt