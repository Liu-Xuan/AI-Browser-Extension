import { logger } from './logger.js';
import { config } from './config.js';

/**
 * API客户端类
 * 负责处理与后端服务的所有通信
 */
export class ApiClient {
    /**
     * 构造函数
     */
    constructor() {
        // 从配置获取基础URL和API密钥
        this.baseUrl = config.get('API_BASE_URL');
        this.apiKey = config.get('RAGFLOW_API_KEY');
        
        // 检查配置
        logger.debug('API客户端初始化:', { 
            baseUrl: this.baseUrl,
            ragflowKeySet: !!this.apiKey,
            deepseekKeySet: !!config.get('DEEPSEEK_API_KEY'),
            openaiKeySet: !!config.get('OPENAI_API_KEY')
        });
        
        if (!config.get('DEEPSEEK_API_KEY')) {
            logger.warn('DeepSeek API密钥未设置');
        }
        if (!config.get('OPENAI_API_KEY')) {
            logger.warn('OpenAI API密钥未设置');
        }
        if (!this.apiKey) {
            logger.warn('RagFlow API密钥未设置');
        }
    }

    /**
     * 发送请求
     * @param {string} endpoint - API端点
     * @param {Object} options - 请求选项
     * @returns {Promise<any>} 响应数据
     */
    async request(endpoint, options = {}) {
        const url = `${this.baseUrl}${endpoint}`;
        const headers = {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${this.apiKey}`,
            ...options.headers
        };

        try {
            logger.debug(`Sending request to: ${url}`, {
                method: options.method || 'GET',
                headers: headers,
                body: options.body ? JSON.parse(options.body) : undefined
            });

            const response = await fetch(url, {
                ...options,
                headers
            });
            
            logger.debug('Received response:', {
                status: response.status,
                statusText: response.statusText,
                headers: Object.fromEntries(response.headers.entries())
            });

            let data;
            const rawResponse = await response.text();
            logger.debug('Raw response:', rawResponse);
            
            try {
                data = JSON.parse(rawResponse);
                logger.debug('Parsed response data:', data);
            } catch (e) {
                logger.error('Failed to parse JSON response:', {
                    error: e.message,
                    rawResponse
                });
                throw new Error(`Invalid JSON response: ${e.message}, Raw: ${rawResponse.substring(0, 100)}`);
            }

            if (!response.ok) {
                const errorText = await response.text();
                let errorData;
                try {
                    errorData = JSON.parse(errorText);
                } catch (e) {
                    errorData = { error: { message: errorText } };
                }
                
                logger.error('API request failed:', {
                    status: response.status,
                    statusText: response.statusText,
                    error: errorText
                });
                
                if (agentId === 'qwen') {
                    if (response.status === 502) {
                        throw new Error('Qwen服务未启动，请确保已启动Ollama服务');
                    } else if (response.status === 404 && errorData.error?.includes('not found, try pulling')) {
                        throw new Error('Qwen模型未安装，请先运行: ollama pull qwen');
                    }
                }
                
                if (errorData.error?.message) {
                    throw new Error(`API错误: ${errorData.error.message}`);
                }
                
                throw new Error(`请求失败 (${response.status}): ${response.statusText || '未知错误'}`);
            }

            return data;
        } catch (error) {
            logger.error('API request failed:', {
                url,
                error: error.message,
                status: error.response?.status,
                data: error.data
            });
            throw error;
        }
    }

    /**
     * 获取智能体列表
     * @returns {Promise<Array>} 智能体列表
     */
    async getAgents() {
        const response = await this.request('/agents');
        return response.data || [];
    }

    /**
     * 创建Agent会话
     * @param {string} agentId - Agent ID
     * @returns {Promise<Object>} 会话信息
     */
    async createSession(agentId) {
        const response = await this.request(`/agents/${agentId}/sessions`, {
            method: 'POST',
            body: JSON.stringify({})
        });
        return response.data;
    }

    /**
     * 获取可用的LLM模型列表
     * @returns {Promise<Array>} LLM模型列表
     */
    async getLLMModels() {
        logger.debug('获取LLM模型列表');
        
        const models = [];
        
        // 只添加已配置API密钥的模型
        if (config.get('DEEPSEEK_API_KEY')) {
            models.push(
                {
                    id: 'deepseek-chat',
                    name: 'DeepSeek Chat V3',
                    type: 'llm',
                    url: 'https://api.deepseek.com/v1/chat',
                    description: 'DeepSeek-V3 通用对话助手'
                },
                {
                    id: 'deepseek-reasoner',
                    name: 'DeepSeek Reasoner R1',
                    type: 'llm',
                    url: 'https://api.deepseek.com/v1/chat',
                    description: 'DeepSeek-R1 推理增强型对话助手'
                }
            );
        }
        
        if (config.get('OPENAI_API_KEY')) {
            models.push({
                id: 'gpt4',
                name: 'GPT-4',
                type: 'llm',
                url: 'https://api.openai.com/v1/chat',
                description: 'OpenAI GPT-4大模型'
            });
        }
        
        // Qwen 是本地模型，不需要API密钥
        models.push({
            id: 'qwen',
            name: 'Qwen 2.5',
            type: 'llm',
            url: 'http://localhost:11434/api/chat',
            description: 'Ollama 通义千问2.5大模型'
        });
        
        logger.debug('可用的LLM模型:', {
            count: models.length,
            models: models.map(m => m.id)
        });
        
        return models;
    }

    /**
     * 聊天请求
     * @param {Object} params - 请求参数
     * @param {Array} params.messages - 消息历史
     * @param {string} params.agentId - Agent ID或LLM ID
     * @param {string} [params.context] - 上下文内容
     * @param {string} [params.sessionId] - 会话ID（仅用于Agent）
     * @returns {Promise<Object>} 响应内容
     */
    async chat(params) {
        const { messages, agentId, context, sessionId } = params;
        
        logger.debug('Chat request params:', { messages, agentId, context, sessionId });
        
        if (!messages || !Array.isArray(messages) || messages.length === 0) {
            logger.error('Invalid messages array:', messages);
            throw new Error('Invalid messages array');
        }

        if (!agentId) {
            logger.error('Agent/Model ID is missing');
            throw new Error('Agent/Model ID is required');
        }

        // 检查是否是LLM模型
        const llmModels = await this.getLLMModels();
        const isLLM = llmModels.some(model => model.id === agentId);

        if (isLLM) {
            return this.chatWithLLM(params);
        } else {
            return this.chatWithAgent(params);
        }
    }

    /**
     * 使用LLM进行聊天
     * @private
     */
    async chatWithLLM(params) {
        const { messages, agentId, context } = params;
        
        // 准备消息列表
        let llmMessages = [...messages];
        
        // 如果有上下文，添加系统消息
        if (context) {
            llmMessages.unshift({
                role: 'system',
                content: `请基于以下内容回答用户的问题：\n\n${context}`
            });
        }

        // 根据不同的模型选择不同的API
        let apiUrl, headers, requestBody;
        
        switch (agentId) {
            case 'qwen':
                apiUrl = 'http://localhost:11434/api/chat';
                headers = { 'Content-Type': 'application/json' };
                requestBody = {
                    model: "qwen",
                    messages: llmMessages,
                    stream: false,
                    temperature: 0.7,
                    max_tokens: 2000
                };
                break;
                
            case 'deepseek-chat':
            case 'deepseek-reasoner':
                apiUrl = 'https://api.deepseek.com/v1/chat/completions';
                headers = {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${config.get('DEEPSEEK_API_KEY')}`
                };
                
                // 处理消息列表
                let processedMessages = [];
                const systemMessages = llmMessages.filter(msg => msg.role === 'system');
                const nonSystemMessages = llmMessages.filter(msg => msg.role !== 'system');
                
                // 添加系统消息
                if (systemMessages.length > 0) {
                    processedMessages.push(...systemMessages);
                }
                
                // 处理对话消息，确保交替出现
                if (agentId === 'deepseek-reasoner') {
                    for (let i = 0; i < nonSystemMessages.length; i++) {
                        const currentMsg = nonSystemMessages[i];
                        // 如果是第一条消息且不是用户消息，添加一个引导性用户消息
                        if (i === 0 && currentMsg.role !== 'user') {
                            processedMessages.push({
                                role: 'user',
                                content: '请继续对话。'
                            });
                        }
                        // 如果当前消息与前一条消息角色相同，插入一个过渡消息
                        if (i > 0 && currentMsg.role === nonSystemMessages[i-1].role) {
                            processedMessages.push({
                                role: currentMsg.role === 'user' ? 'assistant' : 'user',
                                content: currentMsg.role === 'user' ? '好的，请继续。' : '请继续。'
                            });
                        }
                        processedMessages.push(currentMsg);
                    }
                } else {
                    processedMessages.push(...nonSystemMessages);
                }
                
                requestBody = {
                    model: agentId === 'deepseek-chat' ? 'deepseek-chat' : 'deepseek-reasoner',
                    messages: processedMessages,
                    temperature: 0.7,
                    max_tokens: 2000,
                    stream: false
                };
                
                logger.debug('Processed messages for DeepSeek:', processedMessages);
                break;
                
            case 'gpt4':
                apiUrl = 'https://api.openai.com/v1/chat/completions';
                headers = {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${config.get('OPENAI_API_KEY')}`
                };
                requestBody = {
                    model: 'gpt-4',
                    messages: llmMessages
                };
                break;
                
            default:
                throw new Error(`Unsupported LLM model: ${agentId}`);
        }

        try {
            const response = await fetch(apiUrl, {
                method: 'POST',
                headers,
                body: JSON.stringify(requestBody)
            });

            if (!response.ok) {
                const errorText = await response.text();
                let errorData;
                try {
                    errorData = JSON.parse(errorText);
                } catch (e) {
                    errorData = { error: { message: errorText } };
                }
                
                logger.error('API request failed:', {
                    status: response.status,
                    statusText: response.statusText,
                    error: errorText
                });
                
                if (agentId === 'qwen') {
                    if (response.status === 502) {
                        throw new Error('Qwen服务未启动，请确保已启动Ollama服务');
                    } else if (response.status === 404 && errorData.error?.includes('not found, try pulling')) {
                        throw new Error('Qwen模型未安装，请先运行: ollama pull qwen');
                    }
                }
                
                if (errorData.error?.message) {
                    throw new Error(`API错误: ${errorData.error.message}`);
                }
                
                throw new Error(`请求失败 (${response.status}): ${response.statusText || '未知错误'}`);
            }

            const data = await response.json();
            
            // 处理不同API的响应格式
            let content;
            if (agentId === 'qwen') {
                content = data.message?.content;
            } else if (agentId.startsWith('deepseek')) {
                content = data.choices?.[0]?.message?.content;
                if (!content && data.error) {
                    throw new Error(`DeepSeek API error: ${data.error.message || '未知错误'}`);
                }
            } else {
                content = data.choices?.[0]?.message?.content;
            }

            if (!content) {
                throw new Error('Invalid response format from LLM');
            }

            return {
                content,
                model: agentId
            };
        } catch (error) {
            logger.error('LLM request failed:', error);
            throw error;
        }
    }

    /**
     * 使用Agent进行聊天
     * @private
     */
    async chatWithAgent(params) {
        const { messages, agentId, context, sessionId } = params;

        try {
            // 如果没有会话ID，创建新会话
            let currentSessionId = sessionId;
            if (!currentSessionId) {
                logger.debug('Creating new session...');
                const sessionResponse = await this.request(`/agents/${agentId}/sessions`, {
                    method: 'POST',
                    body: JSON.stringify({})
                });
                
                if (sessionResponse.code !== 0) {
                    throw new Error(sessionResponse.message || 'Failed to create session');
                }
                
                currentSessionId = sessionResponse.data.id;
                logger.debug('New session created:', currentSessionId);
            }
            
            // 获取最后一条用户消息
            const lastMessage = messages[messages.length - 1];
            
            const requestBody = {
                question: lastMessage.content,
                context: context || null,
                stream: false,
                session_id: currentSessionId
            };
            
            logger.debug('Sending chat request with body:', requestBody);
            
            const response = await this.request(`/agents/${agentId}/completions`, {
                method: 'POST',
                body: JSON.stringify(requestBody)
            });
            
            logger.debug('Raw chat response:', response);
            
            if (!response) {
                logger.error('Empty response received');
                throw new Error('Invalid response format: empty response');
            }

            // 检查响应格式
            if (response.code !== 0) {
                // 如果是会话错误，尝试创建新会话重试
                if (response.code === 102 && response.message.includes("don't own the session")) {
                    logger.warn('Session error, retrying with new session...');
                    return this.chatWithAgent({
                        messages,
                        agentId,
                        context,
                        sessionId: null // 强制创建新会话
                    });
                }
                logger.error('API request failed:', response);
                throw new Error(response.message || 'Chat request failed');
            }
            
            const responseData = response.data;
            if (!responseData || typeof responseData.answer !== 'string') {
                logger.error('Invalid response data:', responseData);
                throw new Error('Invalid response format: missing answer');
            }
            
            const result = {
                content: responseData.answer,
                model: responseData.model || 'unknown',
                sessionId: currentSessionId
            };
            
            logger.debug('Processed chat response:', result);
            return result;
        } catch (error) {
            logger.error('Agent chat request failed:', error);
            throw error;
        }
    }

    /**
     * 获取知识库列表
     * @returns {Promise<Array>} 知识库列表
     */
    async getDatasets() {
        const response = await this.request('/datasets');
        if (response.code !== 0) {
            throw new Error(response.message || 'Failed to get datasets');
        }
        return response.data || [];
    }

    /**
     * 创建知识库
     * @param {Object} data - 知识库数据
     * @returns {Promise<Object>} 创建的知识库信息
     */
    async createDataset(data) {
        const response = await this.request('/datasets', {
            method: 'POST',
            body: JSON.stringify(data)
        });
        if (response.code !== 0) {
            throw new Error(response.message || 'Failed to create dataset');
        }
        return response.data;
    }

    /**
     * 删除知识库
     * @param {string} datasetId - 知识库ID
     */
    async deleteDataset(datasetId) {
        const response = await this.request(`/datasets/${datasetId}`, {
            method: 'DELETE'
        });
        if (response.code !== 0) {
            throw new Error(response.message || 'Failed to delete dataset');
        }
    }

    /**
     * 获取文档列表
     * @param {string} datasetId - 知识库ID
     * @returns {Promise<Array>} 文档列表
     */
    async getDocuments(datasetId) {
        const response = await this.request(`/datasets/${datasetId}/documents`);
        if (response.code !== 0) {
            throw new Error(response.message || 'Failed to get documents');
        }
        return response.data || [];
    }

    /**
     * 上传文档
     * @param {string} datasetId - 知识库ID
     * @param {File} file - 文件对象
     * @returns {Promise<Object>} 上传的文档信息
     */
    async uploadDocument(datasetId, file) {
        const formData = new FormData();
        formData.append('file', file);

        const response = await fetch(`${this.baseUrl}/datasets/${datasetId}/documents`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${this.apiKey}`
            },
            body: formData
        });

        if (!response.ok) {
            const error = await response.text();
            throw new Error(`Upload failed: ${error}`);
        }

        const result = await response.json();
        if (result.code !== 0) {
            throw new Error(result.message || 'Upload failed');
        }

        // 如果上传成功，开始解析文档
        if (result.data && result.data[0]) {
            const parseResponse = await this.request(`/datasets/${datasetId}/chunks`, {
                method: 'POST',
                body: JSON.stringify({
                    document_ids: [result.data[0].id]
                })
            });

            if (parseResponse.code !== 0) {
                throw new Error(parseResponse.message || 'Failed to parse document');
            }
        }

        return result.data[0];
    }

    /**
     * 删除文档
     * @param {string} datasetId - 知识库ID
     * @param {Array<string>} documentIds - 文档ID列表
     */
    async deleteDocuments(datasetId, documentIds) {
        const response = await this.request(`/datasets/${datasetId}/documents`, {
            method: 'DELETE',
            body: JSON.stringify({ document_ids: documentIds })
        });
        if (response.code !== 0) {
            throw new Error(response.message || 'Failed to delete documents');
        }
    }

    /**
     * 知识库检索
     * @param {string} query - 检索关键词
     * @param {Array<string>} datasetIds - 知识库ID列表
     * @returns {Promise<Array>} 检索结果
     */
    async search(query, datasetIds) {
        const response = await this.request('/retrieval', {
            method: 'POST',
            body: JSON.stringify({
                query,
                dataset_ids: datasetIds,
                limit: 10
            })
        });
        if (response.code !== 0) {
            throw new Error(response.message || 'Search failed');
        }
        return response.data || [];
    }
}

// 创建全局API客户端实例
export const apiClient = new ApiClient();

// RAGFlow API 配置
const API_CONFIG = {
    BASE_URL: 'http://172.19.12.146:8888',
    API_KEY: 'RkOWJjM2ZhZDFhZTExZWZhYmRmMDI0Mm'
};

// API 路径
const API_PATHS = {
    DATASETS: '/api/v1/datasets',
    DOCUMENTS: '/api/v1/documents',
    CHAT: '/api/v1/chat'
};

// 通用请求头
const getHeaders = () => ({
    'Authorization': `Bearer ${API_CONFIG.API_KEY}`,
    'Content-Type': 'application/json'
});

// 文件上传请求头
const getUploadHeaders = () => ({
    'Authorization': `Bearer ${API_CONFIG.API_KEY}`
});

/**
 * 创建临时数据集
 */
export async function createTempDataset() {
    try {
        const response = await fetch(`${API_CONFIG.BASE_URL}${API_PATHS.DATASETS}`, {
            method: 'POST',
            headers: getHeaders(),
            body: JSON.stringify({
                name: `temp_dataset_${Date.now()}`,
                description: '临时知识库',
                metadata: {
                    type: 'temporary'
                }
            })
        });

        if (!response.ok) throw new Error('Failed to create dataset');
        return await response.json();
    } catch (error) {
        console.error('Create dataset error:', error);
        throw error;
    }
}

/**
 * 上传文件到数据集
 */
export async function uploadFile(datasetId, file) {
    try {
        const formData = new FormData();
        formData.append('file', file);
        formData.append('dataset_id', datasetId);

        const response = await fetch(`${API_CONFIG.BASE_URL}${API_PATHS.DOCUMENTS}/upload`, {
            method: 'POST',
            headers: getUploadHeaders(),
            body: formData
        });

        if (!response.ok) throw new Error('Failed to upload file');
        return await response.json();
    } catch (error) {
        console.error('Upload file error:', error);
        throw error;
    }
}

/**
 * 添加文本内容到数据集
 */
export async function addTextContent(datasetId, content) {
    try {
        const response = await fetch(`${API_CONFIG.BASE_URL}${API_PATHS.DOCUMENTS}`, {
            method: 'POST',
            headers: getHeaders(),
            body: JSON.stringify({
                dataset_id: datasetId,
                content: content.content,
                metadata: {
                    title: content.title,
                    url: content.url,
                    type: 'webpage'
                }
            })
        });

        if (!response.ok) throw new Error('Failed to add text content');
        return await response.json();
    } catch (error) {
        console.error('Add text content error:', error);
        throw error;
    }
}

/**
 * 删除文档
 */
export async function deleteDocument(documentId) {
    try {
        const response = await fetch(`${API_CONFIG.BASE_URL}${API_PATHS.DOCUMENTS}/${documentId}`, {
            method: 'DELETE',
            headers: getHeaders()
        });

        if (!response.ok) throw new Error('Failed to delete document');
        return await response.json();
    } catch (error) {
        console.error('Delete document error:', error);
        throw error;
    }
}

/**
 * 获取数据集中的所有文档
 */
export async function getDocuments(datasetId) {
    try {
        const response = await fetch(`${API_CONFIG.BASE_URL}${API_PATHS.DOCUMENTS}?dataset_id=${datasetId}`, {
            headers: getHeaders()
        });

        if (!response.ok) throw new Error('Failed to get documents');
        return await response.json();
    } catch (error) {
        console.error('Get documents error:', error);
        throw error;
    }
}

/**
 * 获取共享对话链接
 */
export function getSharedChatUrl(datasetId) {
    const params = new URLSearchParams({
        dataset_id: datasetId,
        from: 'agent',
        auth: API_CONFIG.API_KEY
    });
    return `${API_CONFIG.BASE_URL}/chat/share?${params.toString()}`;
}

export default {
    createTempDataset,
    uploadFile,
    addTextContent,
    deleteDocument,
    getDocuments,
    getSharedChatUrl
}; 