import { Search } from '../ui/components/search.js';
import { eventBus, Events } from '../core/events.js';
import { apiClient } from '../core/api.js';

describe('Search Component', () => {
    let search;
    let mockElements;
    let mockApiClient;

    beforeEach(() => {
        // 模拟DOM元素
        mockElements = {
            searchInput: document.createElement('input'),
            btnSearch: document.createElement('button'),
            searchResults: document.createElement('div')
        };

        // 模拟API客户端
        mockApiClient = {
            retrieve: jest.fn()
        };

        // 替换真实的API客户端
        global.apiClient = mockApiClient;

        // 创建组件实例
        search = new Search(mockElements);
    });

    afterEach(() => {
        jest.clearAllMocks();
        document.body.innerHTML = '';
        eventBus.off(Events.SEARCH_COMPLETED);
        eventBus.off(Events.ERROR_OCCURRED);
    });

    describe('初始化', () => {
        test('应该正确初始化组件', () => {
            expect(search.elements).toBe(mockElements);
        });

        test('应该绑定所有必要的事件处理函数', () => {
            expect(mockElements.btnSearch.onclick).toBeDefined();
            expect(mockElements.searchInput.onkeyup).toBeDefined();
        });
    });

    describe('执行搜索', () => {
        test('成功执行搜索时应该显示结果并触发事件', async () => {
            const mockResults = [
                { 
                    content: 'test content',
                    title: 'test doc',
                    score: 0.95,
                    source: 'test.pdf'
                }
            ];
            mockApiClient.retrieve.mockResolvedValue(mockResults);

            // 设置搜索输入
            mockElements.searchInput.value = 'test query';

            // 监听事件
            const searchHandler = jest.fn();
            eventBus.on(Events.SEARCH_COMPLETED, searchHandler);

            // 执行搜索
            await search.performSearch();

            expect(mockApiClient.retrieve).toHaveBeenCalledWith('test query', undefined);
            expect(searchHandler).toHaveBeenCalledWith(mockResults);
            expect(mockElements.searchResults.innerHTML).toContain('test content');
            expect(mockElements.searchResults.innerHTML).toContain('95%');
        });

        test('搜索失败时应该处理错误', async () => {
            const error = new Error('Search failed');
            mockApiClient.retrieve.mockRejectedValue(error);

            // 设置搜索输入
            mockElements.searchInput.value = 'test query';

            // 模拟alert
            global.alert = jest.fn();

            // 监听错误事件
            const errorHandler = jest.fn();
            eventBus.on(Events.ERROR_OCCURRED, errorHandler);

            await search.performSearch();

            expect(global.alert).toHaveBeenCalled();
            expect(errorHandler).toHaveBeenCalledWith({
                source: 'search',
                action: 'perform-search',
                error
            });
        });

        test('空搜索输入时不应该执行搜索', async () => {
            // 设置空搜索输入
            mockElements.searchInput.value = '';

            await search.performSearch();

            expect(mockApiClient.retrieve).not.toHaveBeenCalled();
        });
    });

    describe('显示搜索结果', () => {
        test('应该正确格式化和显示搜索结果', () => {
            const mockResults = [
                {
                    content: 'test content',
                    title: 'test doc',
                    score: 0.95,
                    source: 'test.pdf'
                },
                {
                    content: 'another content',
                    title: 'another doc',
                    score: 0.85,
                    source: 'another.pdf'
                }
            ];

            search.displaySearchResults(mockResults);

            expect(mockElements.searchResults.innerHTML).toContain('test content');
            expect(mockElements.searchResults.innerHTML).toContain('95%');
            expect(mockElements.searchResults.innerHTML).toContain('another content');
            expect(mockElements.searchResults.innerHTML).toContain('85%');
        });

        test('没有结果时应该显示提示信息', () => {
            search.displaySearchResults([]);

            expect(mockElements.searchResults.innerHTML).toContain('未找到相关结果');
        });
    });

    describe('清除搜索结果', () => {
        test('应该正确清除搜索结果', () => {
            // 先添加一些内容
            mockElements.searchResults.innerHTML = '<div>Some results</div>';
            mockElements.searchInput.value = 'test query';

            search.clearSearchResults();

            expect(mockElements.searchResults.innerHTML).toBe('');
            expect(mockElements.searchInput.value).toBe('');
        });
    });
}); 