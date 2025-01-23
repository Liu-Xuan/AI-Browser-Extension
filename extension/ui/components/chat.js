import { apiClient } from '../../core/api.js';
import { state, getCurrentPageContent } from '../../core/state.js';
import { eventBus } from '../../core/eventBus.js';
import { Events } from '../../core/events.js';
import { logger } from '../../core/logger.js';

/**
 * 聊天组件类
 */
export class Chat {
    /**
     * 构造函数
     * @param {Object} elements - DOM元素引用
     */
    constructor(elements) {
        this.elements = elements;
        this.messages = [];
        this.currentAgent = null;
        this.useContext = false;
        this.sessionId = null;
        this.bindEvents();
        this.initialize();
        logger.info('Chat component initialized');
    }

    /**
     * 初始化
     */
    async initialize() {
        try {
            // 加载智能体列表
            await this.loadAgents();
            
            // 添加欢迎消息
            this.clearChat();
            
            logger.info('Chat initialized successfully');
        } catch (error) {
            logger.error('Failed to initialize chat:', error);
            this.showError('初始化失败');
        }
    }

    /**
     * 绑定事件处理函数
     */
    bindEvents() {
        if (this.elements.btnSend) {
            this.elements.btnSend.addEventListener('click', () => this.sendMessage());
        }

        if (this.elements.btnClear) {
            this.elements.btnClear.addEventListener('click', () => this.clearChat());
        }

        if (this.elements.chatInput) {
            this.elements.chatInput.addEventListener('keypress', (e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    this.sendMessage();
                }
            });
        }

        if (this.elements.agentSelect) {
            this.elements.agentSelect.addEventListener('change', () => {
                this.currentAgent = this.elements.agentSelect.value;
                this.clearChat();
                this.addWelcomeMessage();
                logger.debug(`Agent changed to: ${this.currentAgent}`);
            });
        }

        if (this.elements.btnUseContext) {
            this.elements.btnUseContext.addEventListener('click', () => {
                this.useContext = !this.useContext;
                this.elements.btnUseContext.classList.toggle('active');
                logger.debug(`Context usage set to: ${this.useContext}`);
            });
        }
    }

    /**
     * 添加欢迎消息
     */
    addWelcomeMessage() {
        const welcomeMessage = {
            role: 'assistant',
            content: '你好！我是AI助手，有什么可以帮你的吗？'
        };
        this.messages.push(welcomeMessage);
        this.appendMessage(welcomeMessage);
    }

    /**
     * 显示加载状态
     */
    showLoadingMessage() {
        const loadingDiv = document.createElement('div');
        loadingDiv.className = 'message loading';
        loadingDiv.innerHTML = '<div class="loading-dots"></div>';
        this.elements.chatMessages.appendChild(loadingDiv);
        this.scrollToBottom();
        return loadingDiv;
    }

    /**
     * 显示状态消息
     * @param {string} content - 状态消息内容
     * @param {string} icon - 图标类名
     * @returns {HTMLElement} 状态消息元素
     */
    showStatusMessage(content, icon = 'fa-info-circle') {
        const statusDiv = document.createElement('div');
        statusDiv.className = 'message system';
        statusDiv.innerHTML = `
            <div class="message-content">
                <i class="fas ${icon}"></i> ${content}
            </div>
        `;
        this.elements.chatMessages.appendChild(statusDiv);
        this.scrollToBottom();
        return statusDiv;
    }

    /**
     * 发送消息
     */
    async sendMessage() {
        const input = this.elements.chatInput;
        const content = input.value.trim();
        
        if (!content) {
            logger.warn('Empty message content');
            return;
        }

        if (!this.currentAgent) {
            logger.error('No model selected');
            this.showError('请先选择一个模型');
            return;
        }

        // 禁用输入和发送按钮
        input.disabled = true;
        this.elements.btnSend.disabled = true;

        // 添加用户消息
        const userMessage = { role: 'user', content };
        this.messages.push(userMessage);
        this.appendMessage(userMessage);
        input.value = '';

        // 显示发送状态
        const statusDiv = document.createElement('div');
        statusDiv.className = 'message system';
        statusDiv.innerHTML = `
            <div class="message-content">
                <i class="fas fa-paper-plane fa-spin"></i> 正在发送消息...
            </div>
        `;
        this.elements.chatMessages.appendChild(statusDiv);
        this.scrollToBottom();

        try {
            // 准备上下文
            let context = null;
            if (this.useContext) {
                try {
                    statusDiv.innerHTML = `
                        <div class="message-content">
                            <i class="fas fa-sync fa-spin"></i> 正在获取页面内容...
                        </div>
                    `;
                    context = await getCurrentPageContent();
                    logger.debug('Using context:', { length: context?.length });
                } catch (error) {
                    if (error.message.includes('chrome://')) {
                        logger.info('Skipping context for chrome:// URL');
                    } else {
                        logger.warn('Failed to get page content:', error);
                        this.showError('获取页面内容失败，将不使用上下文');
                    }
                    context = null;
                }
            }

            // 更新状态为等待响应
            statusDiv.innerHTML = `
                <div class="message-content">
                    <i class="fas fa-circle-notch fa-spin"></i> 等待AI响应...
                </div>
            `;

            // 发送请求
            logger.debug('Sending chat request', {
                agentId: this.currentAgent,
                useContext: this.useContext,
                sessionId: this.sessionId
            });

            const response = await apiClient.chat({
                messages: this.messages,
                agentId: this.currentAgent,
                context,
                sessionId: this.sessionId
            });

            // 保存会话ID（如果是Agent）
            if (response.sessionId) {
                this.sessionId = response.sessionId;
                logger.debug('Session ID updated:', this.sessionId);
            }

            // 移除状态消息
            statusDiv.remove();

            // 添加助手回复
            if (response && response.content) {
                const assistantMessage = {
                    role: 'assistant',
                    content: response.content
                };
                this.messages.push(assistantMessage);
                this.appendMessage(assistantMessage);
                
                logger.debug('Chat response received', {
                    model: response.model,
                    sessionId: response.sessionId
                });
            } else {
                throw new Error('Invalid response format');
            }

            eventBus.emit(Events.CHAT_COMPLETED, {
                message: content,
                response: response.content
            });
            
            logger.debug('Message sent successfully');
        } catch (error) {
            logger.error('Failed to send message:', error);
            
            // 如果是会话相关错误，清除会话ID
            if (error.message.includes('session')) {
                this.sessionId = null;
                logger.debug('Session cleared due to error');
            }
            
            // 显示错误消息
            let errorMessage = '消息发送失败';
            if (error.response?.status === 401) {
                errorMessage = 'API认证失败，请检查API密钥';
            } else if (error.response?.status === 404) {
                errorMessage = '请求的模型不可用';
            } else if (error.message === 'Invalid JSON response') {
                errorMessage = '服务器返回了无效的响应';
            } else if (error.message.includes('Category examples')) {
                errorMessage = '智能体初始化失败，请重试';
                this.sessionId = null; // 清除会话ID
            } else if (error.message.includes('API错误')) {
                errorMessage = error.message;
            }
            
            this.showError(errorMessage);
            
            // 移除加载状态
            const loadingElement = this.elements.chatMessages.querySelector('.loading');
            if (loadingElement) {
                loadingElement.remove();
            }
            
            eventBus.emit(Events.ERROR_OCCURRED, {
                source: 'chat',
                action: 'send-message',
                error
            });
        } finally {
            // 重新启用输入和发送按钮
            input.disabled = false;
            this.elements.btnSend.disabled = false;
            this.scrollToBottom();
        }
    }

    /**
     * 添加消息到聊天界面
     * @param {Object} message - 消息对象
     */
    appendMessage(message) {
        if (!message || typeof message !== 'object') {
            logger.warn('Invalid message object:', message);
            return;
        }

        const { role = '', content = '' } = message;
        const formattedContent = this.formatMessage(content);
        
        const messageDiv = document.createElement('div');
        messageDiv.className = `message ${role}`;
        messageDiv.innerHTML = `
            <div class="message-content">
                ${formattedContent}
            </div>
        `;
        
        this.elements.chatMessages.appendChild(messageDiv);
        this.scrollToBottom();
    }

    /**
     * 格式化消息内容
     * @param {string} content - 消息内容
     * @returns {string} 格式化后的内容
     */
    formatMessage(content) {
        if (!content) {
            logger.warn('Empty message content received');
            return '';
        }

        content = String(content);
        return content
            .replace(/\n/g, '<br>')
            .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
            .replace(/\*(.*?)\*/g, '<em>$1</em>')
            .replace(/`(.*?)`/g, '<code>$1</code>');
    }

    /**
     * 滚动到底部
     */
    scrollToBottom() {
        if (this.elements.chatMessages) {
            this.elements.chatMessages.scrollTop = this.elements.chatMessages.scrollHeight;
        }
    }

    /**
     * 清除聊天记录
     */
    clearChat() {
        this.messages = [];
        this.sessionId = null; // 清除会话ID
        if (this.elements.chatMessages) {
            this.elements.chatMessages.innerHTML = '';
        }
        this.addWelcomeMessage();
    }

    /**
     * 显示错误消息
     * @param {string} message - 错误消息
     */
    showError(message) {
        const errorDiv = document.createElement('div');
        errorDiv.className = 'message error';
        errorDiv.innerHTML = `
            <div class="message-content error">
                <i class="fas fa-exclamation-circle"></i>
                ${message}
            </div>
        `;
        this.elements.chatMessages.appendChild(errorDiv);
        this.scrollToBottom();
    }

    /**
     * 加载智能体列表
     */
    async loadAgents() {
        try {
            // 获取LLM模型列表
            const llmModels = await apiClient.getLLMModels();
            logger.debug('Loaded LLM models:', llmModels);
            
            // 获取Agent列表
            const agents = await apiClient.getAgents();
            logger.debug('Loaded agents:', agents);
            
            // 合并两个列表
            const allModels = [
                ...llmModels,
                ...(agents || []).map(agent => ({
                    id: agent.id || `agent-${Date.now()}`,
                    name: agent.name || '未命名智能助手',
                    type: 'agent',
                    description: agent.description || '自定义智能助手'
                }))
            ];

            if (allModels.length === 0) {
                logger.warn('No models available');
                this.showError('暂无可用的模型');
                return;
            }

            // 清空现有选项
            this.elements.agentSelect.innerHTML = '';
            
            // 添加LLM模型组
            if (llmModels.length > 0) {
                const llmGroup = document.createElement('optgroup');
                llmGroup.label = 'LLM模型';
                
                // 按优先级排序
                const modelOrder = ['deepseek-chat', 'deepseek-reasoner', 'gpt4', 'qwen'];
                const sortedModels = llmModels.sort((a, b) => {
                    const aIndex = modelOrder.indexOf(a.id);
                    const bIndex = modelOrder.indexOf(b.id);
                    return (aIndex === -1 ? 999 : aIndex) - (bIndex === -1 ? 999 : bIndex);
                });
                
                sortedModels.forEach(model => {
                    const option = document.createElement('option');
                    option.value = model.id;
                    option.textContent = model.name || model.id;
                    option.title = model.description || '';
                    llmGroup.appendChild(option);
                });
                
                this.elements.agentSelect.appendChild(llmGroup);
            }
            
            // 添加Agent组
            const validAgents = agents?.filter(a => a && a.id);
            if (validAgents && validAgents.length > 0) {
                const agentGroup = document.createElement('optgroup');
                agentGroup.label = '智能助手';
                
                validAgents.forEach(agent => {
                    const option = document.createElement('option');
                    option.value = agent.id;
                    option.textContent = agent.name || '未命名智能助手';
                    option.title = agent.description || '自定义智能助手';
                    agentGroup.appendChild(option);
                });
                
                this.elements.agentSelect.appendChild(agentGroup);
            }

            // 设置默认模型（优先使用DeepSeek）
            const defaultModelId = llmModels.find(m => m.id === 'deepseek-chat')?.id 
                || llmModels.find(m => m.id === 'deepseek-reasoner')?.id 
                || allModels[0].id;
            
            this.currentAgent = defaultModelId;
            this.elements.agentSelect.value = defaultModelId;
            
            logger.debug('Models loaded successfully', { 
                count: allModels.length,
                defaultModel: this.currentAgent,
                models: allModels
            });
        } catch (error) {
            logger.error('Failed to load models:', error);
            this.showError('加载模型列表失败');
            throw error;
        }
    }
} 