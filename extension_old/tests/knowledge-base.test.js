import { KnowledgeBase } from '../ui/components/knowledge-base.js';
import { eventBus, Events } from '../core/events.js';
import { apiClient } from '../core/api.js';

describe('KnowledgeBase Component', () => {
    let knowledgeBase;
    let mockElements;
    let mockApiClient;

    beforeEach(() => {
        // 模拟DOM元素
        mockElements = {
            btnCreateDataset: document.createElement('button'),
            btnDeleteDataset: document.createElement('button'),
            btnRefresh: document.createElement('button'),
            kbTree: document.createElement('div'),
            kbDocs: document.createElement('div'),
            btnAddToKB: document.createElement('button'),
            btnDeleteFromKB: document.createElement('button'),
            uploadProgress: document.createElement('div'),
            uploadFileName: document.createElement('span'),
            progressBarFill: document.createElement('div'),
            uploadPercent: document.createElement('span'),
            uploadSpeed: document.createElement('span')
        };

        // 模拟API客户端
        mockApiClient = {
            createDataset: jest.fn(),
            deleteDataset: jest.fn(),
            getDatasets: jest.fn(),
            getDocuments: jest.fn(),
            uploadDocument: jest.fn()
        };

        // 替换真实的API客户端
        global.apiClient = mockApiClient;

        // 创建组件实例
        knowledgeBase = new KnowledgeBase(mockElements);
    });

    afterEach(() => {
        jest.clearAllMocks();
        document.body.innerHTML = '';
    });

    describe('初始化', () => {
        test('应该正确初始化组件', () => {
            expect(knowledgeBase.elements).toBe(mockElements);
        });

        test('应该绑定所有必要的事件处理函数', () => {
            expect(mockElements.btnCreateDataset.onclick).toBeDefined();
            expect(mockElements.btnDeleteDataset.onclick).toBeDefined();
            expect(mockElements.btnRefresh.onclick).toBeDefined();
        });
    });

    describe('创建知识库', () => {
        test('成功创建知识库时应该触发事件', async () => {
            const mockDataset = { id: '123', name: 'test' };
            mockApiClient.createDataset.mockResolvedValue(mockDataset);

            // 模拟用户输入
            global.prompt = jest.fn().mockReturnValue('test');

            // 监听事件
            const eventHandler = jest.fn();
            eventBus.on(Events.DATASET_CREATED, eventHandler);

            // 触发创建
            await knowledgeBase.createDataset();

            expect(mockApiClient.createDataset).toHaveBeenCalledWith({
                name: 'test',
                description: expect.any(String)
            });
            expect(eventHandler).toHaveBeenCalledWith(mockDataset);
        });

        test('创建失败时应该处理错误', async () => {
            const error = new Error('API Error');
            mockApiClient.createDataset.mockRejectedValue(error);

            // 模拟用户输入
            global.prompt = jest.fn().mockReturnValue('test');

            // 模拟alert
            global.alert = jest.fn();

            // 监听错误事件
            const errorHandler = jest.fn();
            eventBus.on(Events.ERROR_OCCURRED, errorHandler);

            await knowledgeBase.createDataset();

            expect(global.alert).toHaveBeenCalled();
            expect(errorHandler).toHaveBeenCalledWith({
                source: 'knowledge-base',
                action: 'create-dataset',
                error
            });
        });
    });

    describe('文档上传', () => {
        test('成功上传文档时应该更新UI和触发事件', async () => {
            const mockFile = new File(['test'], 'test.txt', { type: 'text/plain' });
            const mockResponse = { 
                ok: true,
                json: () => Promise.resolve({ 
                    code: 0,
                    data: { id: '123' }
                })
            };

            // 模拟fetch
            global.fetch = jest.fn().mockResolvedValue(mockResponse);

            // 监听事件
            const uploadHandler = jest.fn();
            eventBus.on(Events.DOCUMENT_UPLOADED, uploadHandler);

            await knowledgeBase.uploadDocument(mockFile);

            expect(uploadHandler).toHaveBeenCalledWith({
                documentId: '123',
                filename: 'test.txt'
            });
            expect(mockElements.uploadProgress.classList.contains('active')).toBeFalsy();
        });

        test('上传失败时应该处理错误', async () => {
            const mockFile = new File(['test'], 'test.txt', { type: 'text/plain' });
            const error = new Error('Upload failed');

            // 模拟fetch失败
            global.fetch = jest.fn().mockRejectedValue(error);

            // 模拟alert
            global.alert = jest.fn();

            // 监听错误事件
            const errorHandler = jest.fn();
            eventBus.on(Events.ERROR_OCCURRED, errorHandler);

            await knowledgeBase.uploadDocument(mockFile);

            expect(global.alert).toHaveBeenCalled();
            expect(errorHandler).toHaveBeenCalledWith({
                source: 'knowledge-base',
                action: 'upload-document',
                error
            });
            expect(mockElements.uploadProgress.classList.contains('active')).toBeFalsy();
        });
    });

    describe('文档解析状态检查', () => {
        test('应该正确更新解析状态', async () => {
            const mockDocuments = [
                { id: '1', status: 'parsing', parse_progress: 50 },
                { id: '2', status: 'finished' }
            ];

            // 创建模拟的文档元素
            const doc1 = document.createElement('div');
            doc1.className = 'doc-item';
            doc1.dataset.id = '1';
            const status1 = document.createElement('div');
            status1.className = 'doc-status';
            doc1.appendChild(status1);

            const doc2 = document.createElement('div');
            doc2.className = 'doc-item';
            doc2.dataset.id = '2';
            const status2 = document.createElement('div');
            status2.className = 'doc-status';
            doc2.appendChild(status2);

            document.body.appendChild(doc1);
            document.body.appendChild(doc2);

            knowledgeBase.updateDocumentsStatus(mockDocuments);

            expect(status1.textContent).toBe('解析中 50%');
            expect(status2.textContent).toBe('已完成');
        });
    });
}); 