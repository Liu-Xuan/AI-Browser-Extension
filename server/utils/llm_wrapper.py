"""
LLM 调用封装模块

此模块提供了与大语言模型（LLM）交互的统一接口，支持多种 LLM 服务：
1. Ollama（本地部署）
   - 使用自定义的 API 格式
   - 通过 host.docker.internal 访问宿主机服务
   - 支持流式输出

2. OpenAI GPT-4
   - 使用标准的 OpenAI API
   - 通过 HTTPS 进行安全连接
   - 支持流式输出和系统提示词

3. DeepSeek V3/R1
   - 使用 OpenAI 兼容的 API 格式
   - 支持 Chat 和 Reasoner 两种模型
   - 通过 HTTPS 进行安全连接

4. MacStudio Qwen2.5
   - 使用 OpenAI 兼容的 API 格式
   - 通过局域网 IP 直接访问
   - 支持 MLX 优化的模型

主要功能：
- 文本生成（支持流式输出）
- 服务可用性检查
- 模型信息查询
- 错误处理和重试机制
"""

import aiohttp
import json
from typing import Optional, Dict, Any, List
from config import Settings, LLMConfig

class LLMWrapper:
    """LLM 包装器，提供统一的接口访问不同的 LLM 服务
    
    主要职责：
    1. 配置管理：从环境变量加载和验证配置
    2. 会话管理：维护 aiohttp 会话
    3. 请求构建：根据不同 API 格式构建请求
    4. 响应处理：处理不同格式的响应
    5. 错误处理：统一的错误处理机制
    """

    def __init__(self, model_type: str):
        """初始化 LLM 包装器

        Args:
            model_type: LLM 类型，支持:
                - ollama: 本地 Ollama 服务
                - gpt4o: OpenAI GPT-4
                - deepseek-v3: DeepSeek Chat V3
                - deepseek-r1: DeepSeek Reasoner
                - macstudio-qwen: MacStudio Qwen2.5
        
        Raises:
            ValueError: 当指定的模型类型不支持时
        """
        print(f"\n[DEBUG] LLMWrapper 初始化:")
        print(f"Model Type: {model_type}")
        
        # 每次初始化时重新读取配置
        settings = Settings()
        
        if model_type not in settings.LLM_CONFIGS:
            raise ValueError(f"不支持的 LLM 类型: {model_type}")
            
        config = settings.LLM_CONFIGS[model_type]
        self.api_url = config.api_url
        self.api_key = config.api_key
        self.model = config.model
        self.timeout = settings.LLM_TIMEOUT
        
        print(f"API URL: {self.api_url}")
        print(f"API Key: {'sk-...' + self.api_key[-4:] if self.api_key else None}")
        print(f"Model: {self.model}\n")
        
        self.model_type = model_type
        self.session = aiohttp.ClientSession()
        
    async def __aenter__(self):
        return self

    async def __aexit__(self, exc_type, exc_val, exc_tb):
        await self.session.close()

    async def generate(
        self,
        prompt: str,
        system_prompt: Optional[str] = None,
        temperature: float = 0.7,
        max_tokens: Optional[int] = None,
        stop: Optional[List[str]] = None,
        stream: bool = False
    ) -> str:
        """调用 LLM 生成文本

        根据不同的模型类型，使用相应的 API 格式发送请求。
        支持流式输出和系统提示词。

        Args:
            prompt: 用户提示词
            system_prompt: 系统提示词，用于设置模型角色和行为
            temperature: 采样温度（0-1），越高越随机
            max_tokens: 最大生成长度
            stop: 停止词列表
            stream: 是否使用流式输出
            
        Returns:
            str: 生成的文本
            
        Raises:
            Exception: API 调用失败时抛出异常
        """
        try:
            # 根据不同的模型类型构建请求
            if self.model_type == "ollama":
                return await self._generate_ollama(
                    prompt, system_prompt, temperature, max_tokens, stop, stream
                )
            elif self.model_type == "gpt4o":
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
        """Ollama API 调用

        使用 Ollama 的自定义 API 格式发送请求。
        通过 host.docker.internal 访问宿主机的 Ollama 服务。

        Args:
            参数同 generate 方法
            
        Returns:
            str: 生成的文本
            
        Raises:
            Exception: API 调用失败时抛出异常
        """
        full_prompt = prompt
        if system_prompt:
            full_prompt = f"{system_prompt}\n\n{prompt}"

        payload = {
            "model": self.model,
            "prompt": full_prompt,
            "temperature": temperature,
            "stream": stream
        }
        if max_tokens:
            payload["max_tokens"] = max_tokens
        if stop:
            payload["stop"] = stop

        try:
            async with self.session.post(
                self.api_url,
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
        """OpenAI API 调用

        使用标准的 OpenAI API 格式发送请求。
        支持 Chat API 的所有功能，包括系统提示词和流式输出。

        Args:
            参数同 generate 方法
            
        Returns:
            str: 生成的文本
            
        Raises:
            Exception: API 调用失败时抛出异常
        """
        messages = []
        if system_prompt:
            messages.append({"role": "system", "content": system_prompt})
        messages.append({"role": "user", "content": prompt})

        payload = {
            "model": self.model,
            "messages": messages,
            "temperature": temperature,
            "stream": stream
        }
        if max_tokens:
            payload["max_tokens"] = max_tokens
        if stop:
            payload["stop"] = stop

        # 确保 API Key 格式正确
        api_key = self.api_key.strip()
        if not api_key:
            raise ValueError("OpenAI API Key 未设置")
        if not api_key.startswith("Bearer "):
            api_key = f"Bearer {api_key}"

        headers = {
            "Authorization": api_key,
            "Content-Type": "application/json"
        }

        try:
            async with self.session.post(
                self.api_url,
                headers=headers,
                json=payload,
                timeout=self.timeout
            ) as response:
                if response.status != 200:
                    error_detail = await response.text()
                    print(f"\n[DEBUG] OpenAI API 错误响应:")
                    print(f"Status: {response.status}")
                    print(f"Response: {error_detail}\n")
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
            print(f"\n[DEBUG] OpenAI API 网络错误:")
            print(f"Error: {str(e)}\n")
            raise Exception(f"API请求异常: {str(e)}")
        except Exception as e:
            print(f"\n[DEBUG] OpenAI API 其他错误:")
            print(f"Error: {str(e)}\n")
            raise Exception(f"生成文本失败: {str(e)}")

    async def _generate_deepseek(
        self, prompt: str, system_prompt: Optional[str],
        temperature: float, max_tokens: Optional[int],
        stop: Optional[List[str]], stream: bool
    ) -> str:
        """DeepSeek API 调用

        使用 OpenAI 兼容的 API 格式发送请求。
        支持 Chat V3 和 Reasoner 两种模型。

        Args:
            参数同 generate 方法
            
        Returns:
            str: 生成的文本
            
        Raises:
            Exception: API 调用失败时抛出异常
        """
        messages = []
        if system_prompt:
            messages.append({"role": "system", "content": system_prompt})
        messages.append({"role": "user", "content": prompt})

        payload = {
            "model": self.model,
            "messages": messages,
            "temperature": temperature,
            "stream": stream
        }
        if max_tokens:
            payload["max_tokens"] = max_tokens
        if stop:
            payload["stop"] = stop

        # 确保 API Key 格式正确
        api_key = self.api_key.strip()
        if not api_key:
            raise ValueError("DeepSeek API Key 未设置")

        headers = {
            "Authorization": f"Bearer {api_key}",
            "Content-Type": "application/json"
        }

        try:
            async with self.session.post(
                self.api_url,
                headers=headers,
                json=payload,
                timeout=self.timeout
            ) as response:
                if response.status != 200:
                    error_detail = await response.text()
                    print(f"\n[DEBUG] DeepSeek API 错误响应:")
                    print(f"Status: {response.status}")
                    print(f"Response: {error_detail}\n")
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
            print(f"\n[DEBUG] DeepSeek API 网络错误:")
            print(f"Error: {str(e)}\n")
            raise Exception(f"API请求异常: {str(e)}")
        except Exception as e:
            print(f"\n[DEBUG] DeepSeek API 其他错误:")
            print(f"Error: {str(e)}\n")
            raise Exception(f"生成文本失败: {str(e)}")

    async def _generate_macstudio(
        self, prompt: str, system_prompt: Optional[str],
        temperature: float, max_tokens: Optional[int],
        stop: Optional[List[str]], stream: bool
    ) -> str:
        """MacStudio API 调用

        使用 OpenAI 兼容的 API 格式发送请求。
        通过局域网 IP 直接访问 MacStudio 上的 MLX 优化模型。

        Args:
            参数同 generate 方法
            
        Returns:
            str: 生成的文本
            
        Raises:
            Exception: API 调用失败时抛出异常
        """
        messages = []
        if system_prompt:
            messages.append({"role": "system", "content": system_prompt})
        messages.append({"role": "user", "content": prompt})

        payload = {
            "model": self.model,
            "messages": messages,
            "temperature": temperature,
            "stream": stream
        }
        if max_tokens:
            payload["max_tokens"] = max_tokens
        if stop:
            payload["stop"] = stop

        # 确保 API Key 格式正确
        api_key = self.api_key.strip()
        if not api_key:
            raise ValueError("MacStudio API Key 未设置")
        if not api_key.startswith("Bearer "):
            api_key = f"Bearer {api_key}"

        headers = {
            "Authorization": api_key,
            "Content-Type": "application/json"
        }

        try:
            # 构建基础 URL（移除 /chat/completions 路径）
            base_url = self.api_url.replace("/chat/completions", "")
            
            # 首先检查服务是否可用
            health_url = f"{base_url}/models"
            print(f"\n[DEBUG] 检查 MacStudio 服务可用性: {health_url}")
            
            async with self.session.get(
                health_url,
                headers=headers,
                timeout=self.timeout
            ) as health_response:
                if health_response.status != 200:
                    error_detail = await health_response.text()
                    print(f"\n[DEBUG] MacStudio API 服务检查错误:")
                    print(f"Status: {health_response.status}")
                    print(f"Response: {error_detail}\n")
                    raise Exception(f"MacStudio 服务检查失败: {error_detail}")
                else:
                    print(f"\n[DEBUG] MacStudio 服务检查成功")

            # 发送实际的生成请求
            async with self.session.post(
                self.api_url,
                headers=headers,
                json=payload,
                timeout=self.timeout
            ) as response:
                if response.status != 200:
                    error_detail = await response.text()
                    print(f"\n[DEBUG] MacStudio API 错误响应:")
                    print(f"Status: {response.status}")
                    print(f"Response: {error_detail}\n")
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
            print(f"\n[DEBUG] MacStudio API 网络错误:")
            print(f"Error: {str(e)}\n")
            raise Exception(f"API请求异常: {str(e)}")
        except Exception as e:
            print(f"\n[DEBUG] MacStudio API 其他错误:")
            print(f"Error: {str(e)}\n")
            raise Exception(f"生成文本失败: {str(e)}")

    async def is_available(self) -> bool:
        """检查服务是否可用

        通过调用相应的 API 端点检查服务状态。
        不同类型的服务使用不同的检查方式。

        Returns:
            bool: 服务是否可用
        """
        try:
            if self.model_type == "ollama":
                async with self.session.get(
                    self.api_url.replace("/api/generate", "/api/version"),
                    timeout=5
                ) as response:
                    return response.status == 200
            else:
                # 其他服务通过简单的认证检查
                headers = {"Authorization": f"Bearer {self.api_key}"}
                async with self.session.get(
                    f"{self.api_url}/models",
                    headers=headers,
                    timeout=5
                ) as response:
                    return response.status == 200
        except:
            return False

    async def get_model_info(self) -> Dict[str, Any]:
        """获取模型信息

        获取当前使用的模型的详细信息，包括：
        - 模型名称和版本
        - 支持的功能
        - 配置参数等

        Returns:
            Dict[str, Any]: 模型信息字典
        """
        try:
            if self.model_type == "ollama":
                async with self.session.get(
                    self.api_url.replace("/generate", f"/models/{self.model}"),
                    timeout=5
                ) as response:
                    if response.status == 200:
                        return await response.json()
            else:
                headers = {"Authorization": f"Bearer {self.api_key}"}
                async with self.session.get(
                    f"{self.api_url}/models/{self.model}",
                    headers=headers,
                    timeout=5
                ) as response:
                    if response.status == 200:
                        return await response.json()
            return {}
        except:
            return {}