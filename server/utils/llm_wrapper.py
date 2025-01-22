"""
LLM 调用封装模块

此模块提供了与大语言模型（LLM）交互的统一接口，主要功能包括：
- 文本生成（支持流式输出）
- 服务可用性检查
- 模型信息查询

支持多种 LLM 服务：
- Ollama（本地部署）
- OpenAI GPT-4
- DeepSeek V3/R1
- MacStudio Qwen2.5
"""

import aiohttp
import json
from typing import Optional, Dict, Any, List
from config import Settings, LLMConfig

settings = Settings()

class LLMWrapper:
    def __init__(self, model_type: str = "ollama"):
        """
        初始化 LLM 包装器
        
        Args:
            model_type: 模型类型，可选值：
                - ollama: 本地部署的 Ollama 服务
                - gpt4: OpenAI GPT-4
                - deepseek-v3: DeepSeek V3
                - deepseek-r1: DeepSeek R1
                - macstudio-qwen: MacStudio Qwen2.5
        """
        if model_type not in settings.LLM_CONFIGS:
            raise ValueError(f"不支持的模型类型: {model_type}")
            
        self.model_type = model_type
        self.config = settings.LLM_CONFIGS[model_type]
        self.timeout = settings.LLM_TIMEOUT

    async def generate(
        self,
        prompt: str,
        system_prompt: Optional[str] = None,
        temperature: float = 0.7,
        max_tokens: Optional[int] = None,
        stop: Optional[List[str]] = None,
        stream: bool = False
    ) -> str:
        """
        调用 LLM 生成文本

        Args:
            prompt: 用户提示词
            system_prompt: 系统提示词
            temperature: 采样温度（0-1）
            max_tokens: 最大生成长度
            stop: 停止词列表
            stream: 是否流式输出
            
        Returns:
            str: 生成的文本
        """
        try:
            # 根据不同的模型类型构建请求
            if self.model_type == "ollama":
                return await self._generate_ollama(
                    prompt, system_prompt, temperature, max_tokens, stop, stream
                )
            elif self.model_type == "gpt4":
                return await self._generate_openai(
                    prompt, system_prompt, temperature, max_tokens, stop, stream
                )
            elif self.model_type.startswith("deepseek"):
                return await self._generate_deepseek(
                    prompt, system_prompt, temperature, max_tokens, stop, stream
                )
            elif self.model_type == "macstudio-qwen":
                return await self._generate_macstudio(
                    prompt, system_prompt, temperature, max_tokens, stop, stream
                )
            else:
                raise ValueError(f"不支持的模型类型: {self.model_type}")
        except Exception as e:
            print(f"生成文本时出错 (model_type={self.model_type}): {str(e)}")
            raise

    async def _generate_ollama(
        self, prompt: str, system_prompt: Optional[str],
        temperature: float, max_tokens: Optional[int],
        stop: Optional[List[str]], stream: bool
    ) -> str:
        """Ollama API 调用"""
        full_prompt = prompt
        if system_prompt:
            full_prompt = f"{system_prompt}\n\n{prompt}"

        payload = {
            "model": self.config.model,
            "prompt": full_prompt,
            "temperature": temperature,
            "stream": stream
        }
        if max_tokens:
            payload["max_tokens"] = max_tokens
        if stop:
            payload["stop"] = stop

        try:
            async with aiohttp.ClientSession() as session:
                async with session.post(
                    self.config.api_url,
                    json=payload,
                    timeout=self.timeout
                ) as response:
                    if response.status != 200:
                        error_detail = await response.text()
                        raise Exception(f"API请求失败 ({response.status}): {error_detail}")
                    
                    if stream:
                        response_text = ""
                        async for line in response.content:
                            try:
                                chunk = line.decode().strip()
                                if chunk:
                                    data = json.loads(chunk)
                                    response_text += data.get("response", "")
                            except Exception as e:
                                print(f"处理流式响应出错: {e}")
                        return response_text.strip()
                    else:
                        result = await response.json()
                        return result.get("response", "").strip()
                    
        except aiohttp.ClientError as e:
            raise Exception(f"API请求异常: {str(e)}")
        except Exception as e:
            raise Exception(f"生成文本失败: {str(e)}")

    async def _generate_openai(
        self, prompt: str, system_prompt: Optional[str],
        temperature: float, max_tokens: Optional[int],
        stop: Optional[List[str]], stream: bool
    ) -> str:
        """OpenAI API 调用"""
        messages = []
        if system_prompt:
            messages.append({"role": "system", "content": system_prompt})
        messages.append({"role": "user", "content": prompt})

        payload = {
            "model": self.config.model,
            "messages": messages,
            "temperature": temperature,
            "stream": stream
        }
        if max_tokens:
            payload["max_tokens"] = max_tokens
        if stop:
            payload["stop"] = stop

        headers = {
            "Authorization": f"Bearer {self.config.api_key}",
            "Content-Type": "application/json"
        }

        try:
            async with aiohttp.ClientSession() as session:
                async with session.post(
                    f"{self.config.api_url}/chat/completions",
                    headers=headers,
                    json=payload,
                    timeout=self.timeout
                ) as response:
                    if response.status != 200:
                        error_detail = await response.text()
                        raise Exception(f"API请求失败 ({response.status}): {error_detail}")
                    
                    if stream:
                        response_text = ""
                        async for line in response.content:
                            try:
                                chunk = line.decode().strip()
                                if chunk and chunk.startswith("data: "):
                                    data = json.loads(chunk[6:])
                                    if data.get("choices"):
                                        delta = data["choices"][0].get("delta", {})
                                        if "content" in delta:
                                            response_text += delta["content"]
                            except Exception as e:
                                print(f"处理流式响应出错: {e}")
                        return response_text.strip()
                    else:
                        result = await response.json()
                        return result["choices"][0]["message"]["content"].strip()

        except aiohttp.ClientError as e:
            raise Exception(f"API请求异常: {str(e)}")
        except Exception as e:
            raise Exception(f"生成文本失败: {str(e)}")

    async def _generate_deepseek(
        self, prompt: str, system_prompt: Optional[str],
        temperature: float, max_tokens: Optional[int],
        stop: Optional[List[str]], stream: bool
    ) -> str:
        """DeepSeek API 调用"""
        messages = []
        if system_prompt:
            messages.append({"role": "system", "content": system_prompt})
        messages.append({"role": "user", "content": prompt})

        payload = {
            "model": self.config.model,
            "messages": messages,
            "temperature": temperature,
            "stream": stream
        }
        if max_tokens:
            payload["max_tokens"] = max_tokens
        if stop:
            payload["stop"] = stop

        headers = {
            "Authorization": f"Bearer {self.config.api_key}",
            "Content-Type": "application/json"
        }

        try:
            async with aiohttp.ClientSession() as session:
                async with session.post(
                    f"{self.config.api_url}/chat/completions",
                    headers=headers,
                    json=payload,
                    timeout=self.timeout
                ) as response:
                    if response.status != 200:
                        error_detail = await response.text()
                        raise Exception(f"API请求失败 ({response.status}): {error_detail}")
                    
                    if stream:
                        response_text = ""
                        async for line in response.content:
                            try:
                                chunk = line.decode().strip()
                                if chunk and chunk.startswith("data: "):
                                    data = json.loads(chunk[6:])
                                    if data.get("choices"):
                                        delta = data["choices"][0].get("delta", {})
                                        if "content" in delta:
                                            response_text += delta["content"]
                            except Exception as e:
                                print(f"处理流式响应出错: {e}")
                        return response_text.strip()
                    else:
                        result = await response.json()
                        return result["choices"][0]["message"]["content"].strip()

        except aiohttp.ClientError as e:
            raise Exception(f"API请求异常: {str(e)}")
        except Exception as e:
            raise Exception(f"生成文本失败: {str(e)}")

    async def _generate_macstudio(
        self, prompt: str, system_prompt: Optional[str],
        temperature: float, max_tokens: Optional[int],
        stop: Optional[List[str]], stream: bool
    ) -> str:
        """MacStudio API 调用"""
        messages = []
        if system_prompt:
            messages.append({"role": "system", "content": system_prompt})
        messages.append({"role": "user", "content": prompt})

        payload = {
            "model": self.config.model,
            "messages": messages,
            "temperature": temperature,
            "stream": stream
        }
        if max_tokens:
            payload["max_tokens"] = max_tokens
        if stop:
            payload["stop"] = stop

        headers = {
            "Authorization": f"Bearer {self.config.api_key}",
            "Content-Type": "application/json"
        }

        try:
            async with aiohttp.ClientSession() as session:
                async with session.post(
                    f"{self.config.api_url}/v1/chat/completions",
                    headers=headers,
                    json=payload,
                    timeout=self.timeout
                ) as response:
                    if response.status != 200:
                        error_detail = await response.text()
                        raise Exception(f"API请求失败 ({response.status}): {error_detail}")
                    
                    if stream:
                        response_text = ""
                        async for line in response.content:
                            try:
                                chunk = line.decode().strip()
                                if chunk and chunk.startswith("data: "):
                                    data = json.loads(chunk[6:])
                                    if data.get("choices"):
                                        delta = data["choices"][0].get("delta", {})
                                        if "content" in delta:
                                            response_text += delta["content"]
                            except Exception as e:
                                print(f"处理流式响应出错: {e}")
                        return response_text.strip()
                    else:
                        result = await response.json()
                        return result["choices"][0]["message"]["content"].strip()

        except aiohttp.ClientError as e:
            raise Exception(f"API请求异常: {str(e)}")
        except Exception as e:
            raise Exception(f"生成文本失败: {str(e)}")

    async def is_available(self) -> bool:
        """检查服务是否可用"""
        try:
            if self.model_type == "ollama":
                async with aiohttp.ClientSession() as session:
                    async with session.get(
                        self.config.api_url.replace("/api/generate", "/api/version"),
                        timeout=5
                    ) as response:
                        return response.status == 200
            else:
                # 其他服务通过简单的认证检查
                headers = {"Authorization": f"Bearer {self.config.api_key}"}
                async with aiohttp.ClientSession() as session:
                    async with session.get(
                        f"{self.config.api_url}/models",
                        headers=headers,
                        timeout=5
                    ) as response:
                        return response.status == 200
        except:
            return False

    async def get_model_info(self) -> Dict[str, Any]:
        """获取模型信息"""
        try:
            if self.model_type == "ollama":
                async with aiohttp.ClientSession() as session:
                    async with session.get(
                        self.config.api_url.replace("/generate", f"/models/{self.config.model}"),
                        timeout=5
                    ) as response:
                        if response.status == 200:
                            return await response.json()
            else:
                headers = {"Authorization": f"Bearer {self.config.api_key}"}
                async with aiohttp.ClientSession() as session:
                    async with session.get(
                        f"{self.config.api_url}/models/{self.config.model}",
                        headers=headers,
                        timeout=5
                    ) as response:
                        if response.status == 200:
                            return await response.json()
            return {}
        except:
            return {}