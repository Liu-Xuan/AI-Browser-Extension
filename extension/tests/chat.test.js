import { Chat } from '../ui/components/chat.js';
import { eventBus, Events } from '../core/events.js';
import { apiClient } from '../core/api.js';

describe('Chat Component', () => {
    let chat;
    let mockElements;
    let mockApiClient;

    beforeEach(() => {
        // 模拟DOM元素
        mockElements = {
            agentSelect: document.createElement('select'),
            chatMessages: document.createElement('div'),
            chatInput: document.createElement('textarea'),
            btnSend: document.createElement('button'),
            btnClear: document.createElement('button'),
            useContext: document.createElement('input'),
            loadingIndicator: document.createElement('div')
        };

        // 模拟API客户端
        mockApiClient = {
            chat: jest.fn(),
            getAgents: jest.fn()
        };

        // 替换真实的API客户端
        global.apiClient = mockApiClient;

        // 创建组件实例
        chat = new Chat(mockElements);
    });

    afterEach(() => {
        jest.clearAllMocks();
        document.body.innerHTML = '';
        eventBus.off(Events.CHAT_MESSAGE_SENT);
        eventBus.off(Events.ERROR_OCCURRED);
    });

    describe('初始化', () => {
        test('应该正确初始化组件', () => {
            expect(chat.elements).toBe(mockElements);
            expect(chat.messages).toEqual([]);
        });

        test('应该绑定所有必要的事件处理函数', () => {
            expect(mockElements.btnSend.onclick).toBeDefined();
            expect(mockElements.btnClear.onclick).toBeDefined();
            expect(mockElements.agentSelect.onchange).toBeDefined();
        });
    });

    describe('加载智能体', () => {
        test('应该正确加载智能体列表', async () => {
            const mockAgents = [
                { id: '1', name: 'Agent 1' },
                { id: '2', name: 'Agent 2' }
            ];
            mockApiClient.getAgents.mockResolvedValue(mockAgents);

            await chat.loadAgents();

            expect(mockElements.agentSelect.children.length).toBe(2);
            expect(mockElements.agentSelect.children[0].value).toBe('1');
            expect(mockElements.agentSelect.children[0].textContent).toBe('Agent 1');
        });

        test('加载智能体失败时应该处理错误', async () => {
            const error = new Error('Failed to load agents');
            mockApiClient.getAgents.mockRejectedValue(error);

            // 模拟alert
            global.alert = jest.fn();

            // 监听错误事件
            const errorHandler = jest.fn();
            eventBus.on(Events.ERROR_OCCURRED, errorHandler);

            await chat.loadAgents();

            expect(global.alert).toHaveBeenCalled();
            expect(errorHandler).toHaveBeenCalledWith({
                source: 'chat',
                action: 'load-agents',
                error
            });
        });
    });

    describe('发送消息', () => {
        test('成功发送消息时应该更新UI和触发事件', async () => {
            const mockResponse = { content: 'AI response' };
            mockApiClient.chat.mockResolvedValue(mockResponse);

            // 设置消息输入
            mockElements.chatInput.value = 'test message';
            mockElements.useContext.checked = true;

            // 监听事件
            const messageHandler = jest.fn();
            eventBus.on(Events.CHAT_MESSAGE_SENT, messageHandler);

            await chat.sendMessage();

            expect(mockApiClient.chat).toHaveBeenCalledWith(
                expect.arrayContaining([
                    expect.objectContaining({
                        role: 'user',
                        content: 'test message'
                    })
                ]),
                true
            );
            expect(messageHandler).toHaveBeenCalledWith({
                message: 'test message',
                response: 'AI response'
            });
            expect(mockElements.chatMessages.innerHTML).toContain('test message');
            expect(mockElements.chatMessages.innerHTML).toContain('AI response');
            expect(mockElements.chatInput.value).toBe('');
        });

        test('发送消息失败时应该处理错误', async () => {
            const error = new Error('Failed to send message');
            mockApiClient.chat.mockRejectedValue(error);

            // 设置消息输入
            mockElements.chatInput.value = 'test message';

            // 模拟alert
            global.alert = jest.fn();

            // 监听错误事件
            const errorHandler = jest.fn();
            eventBus.on(Events.ERROR_OCCURRED, errorHandler);

            await chat.sendMessage();

            expect(global.alert).toHaveBeenCalled();
            expect(errorHandler).toHaveBeenCalledWith({
                source: 'chat',
                action: 'send-message',
                error
            });
            expect(mockElements.loadingIndicator.style.display).toBe('none');
        });

        test('空消息输入时不应该发送消息', async () => {
            // 设置空消息输入
            mockElements.chatInput.value = '';

            await chat.sendMessage();

            expect(mockApiClient.chat).not.toHaveBeenCalled();
        });
    });

    describe('清除聊天记录', () => {
        test('应该正确清除聊天记录', () => {
            // 先添加一些消息
            mockElements.chatMessages.innerHTML = '<div>Some messages</div>';
            chat.messages = [{ role: 'user', content: 'test' }];

            chat.clearChat();

            expect(mockElements.chatMessages.innerHTML).toBe('');
            expect(chat.messages).toEqual([]);
        });
    });

    describe('更新UI状态', () => {
        test('应该正确显示加载状态', () => {
            chat.showLoading();
            expect(mockElements.loadingIndicator.style.display).toBe('block');
            expect(mockElements.btnSend.disabled).toBe(true);

            chat.hideLoading();
            expect(mockElements.loadingIndicator.style.display).toBe('none');
            expect(mockElements.btnSend.disabled).toBe(false);
        });
    });
}); 