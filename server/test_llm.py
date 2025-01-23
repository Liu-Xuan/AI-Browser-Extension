"""
LLM 连接测试脚本

用于测试各个 LLM 服务的连接状态
"""

import asyncio
from utils.llm_wrapper import LLMWrapper
from config import Settings

async def test_llm(model_type: str) -> None:
    """测试指定类型的 LLM 连接"""
    print(f"\n测试 {model_type} 连接...")
    try:
        llm = LLMWrapper(model_type)
        response = await llm.generate(
            prompt="你好，这是一个测试消息。请回复：测试成功。",
            system_prompt="你是一个测试助手，请简短回复。",
            temperature=0.7
        )
        print(f"✅ {model_type} 连接成功！")
        print(f"响应: {response}\n")
    except Exception as e:
        print(f"❌ {model_type} 连接失败:")
        print(f"错误信息: {str(e)}\n")

async def main():
    """测试所有支持的 LLM"""
    settings = Settings()
    models = list(settings.LLM_CONFIGS.keys())
    
    print("开始 LLM 连接测试...")
    print(f"将测试以下模型: {', '.join(models)}")
    
    for model_type in models:
        await test_llm(model_type)
    
    print("测试完成！")

if __name__ == "__main__":
    asyncio.run(main()) 