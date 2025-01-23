import { Toolbox } from '../ui/components/toolbox.js';
import { eventBus, Events } from '../core/events.js';
import { apiClient } from '../core/api.js';
import { getSelectedText } from '../core/state.js';

jest.mock('../core/state.js', () => ({
    getSelectedText: jest.fn()
}));

describe('Toolbox Component', () => {
    let toolbox;
    let mockElements;
    let mockApiClient;

    beforeEach(() => {
        // 模拟DOM元素
        mockElements = {
            toolboxContainer: document.createElement('div'),
            outputArea: document.createElement('div'),
            loadingIndicator: document.createElement('div')
        };

        // 模拟API客户端
        mockApiClient = {
            translate: jest.fn(),
            summarize: jest.fn(),
            parsePDF: jest.fn()
        };

        // 替换真实的API客户端
        global.apiClient = mockApiClient;

        // 创建组件实例
        toolbox = new Toolbox(mockElements);
    });

    afterEach(() => {
        jest.clearAllMocks();
        document.body.innerHTML = '';
        eventBus.off(Events.TOOL_ACTION_COMPLETED);
        eventBus.off(Events.ERROR_OCCURRED);
    });

    describe('初始化', () => {
        test('应该正确初始化组件', () => {
            expect(toolbox.elements).toBe(mockElements);
        });

        test('应该初始化工具列表', () => {
            toolbox.initializeTools();
            
            expect(mockElements.toolboxContainer.innerHTML).toContain('翻译');
            expect(mockElements.toolboxContainer.innerHTML).toContain('总结');
            expect(mockElements.toolboxContainer.innerHTML).toContain('PDF工具');
        });
    });

    describe('翻译功能', () => {
        test('成功翻译时应该更新UI和触发事件', async () => {
            const selectedText = 'test text';
            const translatedText = '测试文本';
            getSelectedText.mockResolvedValue(selectedText);
            mockApiClient.translate.mockResolvedValue(translatedText);

            // 监听事件
            const actionHandler = jest.fn();
            eventBus.on(Events.TOOL_ACTION_COMPLETED, actionHandler);

            await toolbox.translate();

            expect(mockApiClient.translate).toHaveBeenCalledWith(selectedText, 'zh', 'auto');
            expect(actionHandler).toHaveBeenCalledWith({
                tool: 'translate',
                result: translatedText
            });
            expect(mockElements.outputArea.innerHTML).toContain(translatedText);
        });

        test('翻译失败时应该处理错误', async () => {
            const error = new Error('Translation failed');
            getSelectedText.mockResolvedValue('test text');
            mockApiClient.translate.mockRejectedValue(error);

            // 模拟alert
            global.alert = jest.fn();

            // 监听错误事件
            const errorHandler = jest.fn();
            eventBus.on(Events.ERROR_OCCURRED, errorHandler);

            await toolbox.translate();

            expect(global.alert).toHaveBeenCalled();
            expect(errorHandler).toHaveBeenCalledWith({
                source: 'toolbox',
                action: 'translate',
                error
            });
            expect(mockElements.loadingIndicator.style.display).toBe('none');
        });

        test('没有选中文本时不应该执行翻译', async () => {
            getSelectedText.mockResolvedValue('');

            await toolbox.translate();

            expect(mockApiClient.translate).not.toHaveBeenCalled();
            expect(mockElements.outputArea.innerHTML).toContain('请先选择要翻译的文本');
        });
    });

    describe('总结功能', () => {
        test('成功总结时应该更新UI和触发事件', async () => {
            const selectedText = 'test text';
            const summary = 'summary text';
            getSelectedText.mockResolvedValue(selectedText);
            mockApiClient.summarize.mockResolvedValue(summary);

            // 监听事件
            const actionHandler = jest.fn();
            eventBus.on(Events.TOOL_ACTION_COMPLETED, actionHandler);

            await toolbox.summarize();

            expect(mockApiClient.summarize).toHaveBeenCalledWith(selectedText, 100);
            expect(actionHandler).toHaveBeenCalledWith({
                tool: 'summarize',
                result: summary
            });
            expect(mockElements.outputArea.innerHTML).toContain(summary);
        });

        test('总结失败时应该处理错误', async () => {
            const error = new Error('Summarization failed');
            getSelectedText.mockResolvedValue('test text');
            mockApiClient.summarize.mockRejectedValue(error);

            // 模拟alert
            global.alert = jest.fn();

            // 监听错误事件
            const errorHandler = jest.fn();
            eventBus.on(Events.ERROR_OCCURRED, errorHandler);

            await toolbox.summarize();

            expect(global.alert).toHaveBeenCalled();
            expect(errorHandler).toHaveBeenCalledWith({
                source: 'toolbox',
                action: 'summarize',
                error
            });
            expect(mockElements.loadingIndicator.style.display).toBe('none');
        });

        test('没有选中文本时不应该执行总结', async () => {
            getSelectedText.mockResolvedValue('');

            await toolbox.summarize();

            expect(mockApiClient.summarize).not.toHaveBeenCalled();
            expect(mockElements.outputArea.innerHTML).toContain('请先选择要总结的文本');
        });
    });

    describe('PDF工具', () => {
        test('成功解析PDF时应该更新UI和触发事件', async () => {
            const mockFile = new File(['test'], 'test.pdf', { type: 'application/pdf' });
            const parseResult = { status: 'success', message: 'PDF parsed successfully' };
            mockApiClient.parsePDF.mockResolvedValue(parseResult);

            // 监听事件
            const actionHandler = jest.fn();
            eventBus.on(Events.TOOL_ACTION_COMPLETED, actionHandler);

            await toolbox.parsePDF(mockFile);

            expect(mockApiClient.parsePDF).toHaveBeenCalledWith(mockFile.name, expect.any(FormData));
            expect(actionHandler).toHaveBeenCalledWith({
                tool: 'pdf',
                result: parseResult
            });
            expect(mockElements.outputArea.innerHTML).toContain('PDF解析成功');
        });

        test('解析PDF失败时应该处理错误', async () => {
            const mockFile = new File(['test'], 'test.pdf', { type: 'application/pdf' });
            const error = new Error('PDF parsing failed');
            mockApiClient.parsePDF.mockRejectedValue(error);

            // 模拟alert
            global.alert = jest.fn();

            // 监听错误事件
            const errorHandler = jest.fn();
            eventBus.on(Events.ERROR_OCCURRED, errorHandler);

            await toolbox.parsePDF(mockFile);

            expect(global.alert).toHaveBeenCalled();
            expect(errorHandler).toHaveBeenCalledWith({
                source: 'toolbox',
                action: 'parse-pdf',
                error
            });
            expect(mockElements.loadingIndicator.style.display).toBe('none');
        });
    });

    describe('更新UI状态', () => {
        test('应该正确显示加载状态', () => {
            toolbox.showLoading();
            expect(mockElements.loadingIndicator.style.display).toBe('block');

            toolbox.hideLoading();
            expect(mockElements.loadingIndicator.style.display).toBe('none');
        });

        test('应该正确更新输出区域', () => {
            const testContent = 'Test output content';
            toolbox.updateOutput(testContent);
            expect(mockElements.outputArea.innerHTML).toBe(testContent);
        });
    });
}); 