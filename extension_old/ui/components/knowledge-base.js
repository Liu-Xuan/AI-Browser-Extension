import { apiClient } from '../../core/api.js';
import { state, elements, formatFileSize, getStatusText } from '../../core/state.js';
import { eventBus, Events } from '../../core/events.js';
import { logger } from '../../core/logger.js';

/**
 * 知识库管理组件
 * 负责知识库的创建、删除、文档上传和管理等功能
 */
export class KnowledgeBase {
    /**
     * 构造函数
     * @param {Object} elements - DOM元素引用
     */
    constructor(elements) {
        this.elements = elements;
        this.selectedDataset = null;
        this.bindEvents();
        this.loadDatasets();
        logger.info('KnowledgeBase component initialized');
    }

    /**
     * 绑定事件处理函数
     */
    bindEvents() {
        logger.debug('Binding KnowledgeBase events...');

        // 创建知识库
        if (this.elements.btnCreateDataset) {
            this.elements.btnCreateDataset.addEventListener('click', () => this.createDataset());
        }

        // 删除知识库
        if (this.elements.btnDeleteDataset) {
            this.elements.btnDeleteDataset.addEventListener('click', () => this.deleteDataset());
        }

        // 刷新知识库列表
        if (this.elements.btnRefreshDatasets) {
            this.elements.btnRefreshDatasets.addEventListener('click', () => this.loadDatasets());
        }

        // 拖拽上传
        if (this.elements.kbDocs) {
            this.elements.kbDocs.addEventListener('dragover', (e) => {
                e.preventDefault();
                e.stopPropagation();
                this.elements.kbDocs.classList.add('dragover');
            });

            this.elements.kbDocs.addEventListener('dragleave', () => {
                this.elements.kbDocs.classList.remove('dragover');
            });

            this.elements.kbDocs.addEventListener('drop', async (e) => {
                e.preventDefault();
                e.stopPropagation();
                this.elements.kbDocs.classList.remove('dragover');

                if (!this.selectedDataset) {
                    alert('请先选择知识库');
                    return;
                }

                const files = Array.from(e.dataTransfer.files);
                for (const file of files) {
                    await this.uploadDocument(file);
                }
            });
        }

        // 添加当前页面
        if (this.elements.btnAddToKB) {
            this.elements.btnAddToKB.addEventListener('click', () => this.addCurrentPage());
        }

        // 删除文档
        if (this.elements.btnDeleteFromKB) {
            this.elements.btnDeleteFromKB.addEventListener('click', () => this.deleteDocuments());
        }

        // 监听其他组件的事件
        eventBus.on(Events.SEARCH_COMPLETED, () => {
            logger.debug('Search completed, refreshing documents');
            if (state.selectedDataset) {
                this.loadDocuments(state.selectedDataset);
            }
        });
    }

    /**
     * 创建知识库
     */
    async createDataset() {
        const name = prompt('请输入知识库名称:');
        if (!name) return;

        const description = prompt('请输入知识库描述:');
        if (!description) return;

        try {
            logger.debug('Creating dataset...');
            const dataset = await apiClient.createDataset({
                name,
                description
            });
            
            await this.loadDatasets();
            this.selectDataset(dataset.id);
            logger.debug('Dataset created successfully');
        } catch (error) {
            logger.error('Failed to create dataset:', error);
            alert('创建知识库失败：' + error.message);
        }
    }

    /**
     * 删除知识库
     */
    async deleteDataset() {
        if (!this.selectedDataset) {
            alert('请先选择要删除的知识库');
            return;
        }

        if (!confirm('确定要删除该知识库吗？')) return;

        try {
            logger.debug('Deleting dataset...');
            await apiClient.deleteDataset(this.selectedDataset);
            this.selectedDataset = null;
            await this.loadDatasets();
            logger.debug('Dataset deleted successfully');
        } catch (error) {
            logger.error('Failed to delete dataset:', error);
            alert('删除知识库失败：' + error.message);
        }
    }

    /**
     * 加载知识库列表
     */
    async loadDatasets() {
        try {
            logger.debug('Loading datasets...');
            const datasets = await apiClient.getDatasets();
            this.renderDatasets(datasets);
            logger.debug('Datasets loaded:', datasets);
        } catch (error) {
            logger.error('Failed to load datasets:', error);
            alert('加载知识库列表失败：' + error.message);
        }
    }

    /**
     * 渲染知识库列表
     * @param {Array} datasets - 知识库列表
     */
    renderDatasets(datasets) {
        if (!this.elements.kbList) return;

        this.elements.kbList.innerHTML = '';
        
        datasets.forEach(dataset => {
            const div = document.createElement('div');
            div.className = `kb-item ${dataset.id === this.selectedDataset ? 'active' : ''}`;
            div.innerHTML = `
                <div class="dataset-info">
                    <div class="dataset-name">${dataset.name}</div>
                    <div class="dataset-meta">${dataset.description}</div>
                </div>
            `;
            
            div.addEventListener('click', () => this.selectDataset(dataset.id));
            this.elements.kbList.appendChild(div);
        });
    }

    /**
     * 选择知识库
     * @param {string} datasetId - 知识库ID
     */
    async selectDataset(datasetId) {
        this.selectedDataset = datasetId;
        
        try {
            logger.debug('Loading documents...');
            const documents = await apiClient.getDocuments(datasetId);
            this.renderDocuments(documents);
            logger.debug('Documents loaded successfully');
        } catch (error) {
            logger.error('Failed to load documents:', error);
            this.renderDocuments([]);  // 显示空状态
            this.showError('加载文档列表失败：' + error.message);
        }
    }

    /**
     * 渲染文档列表
     * @param {Array} documents - 文档列表
     */
    renderDocuments(documents = []) {
        if (!this.elements.kbDocs) {
            logger.warn('Document container not found');
            return;
        }

        this.elements.kbDocs.innerHTML = '';
        
        if (!Array.isArray(documents) || documents.length === 0) {
            this.elements.kbDocs.innerHTML = '<div class="empty-message">暂无文档，请上传或拖拽文件到此处</div>';
            return;
        }
        
        documents.forEach(doc => {
            if (!doc || typeof doc !== 'object') {
                logger.warn('Invalid document object:', doc);
                return;
            }

            const div = document.createElement('div');
            div.className = 'doc-item';
            div.innerHTML = `
                <div class="doc-info">
                    <div class="doc-name">${doc.name || '未命名文档'}</div>
                    <div class="doc-status ${doc.status || 'unknown'}">${this.getStatusText(doc.status)}</div>
                </div>
                <div class="doc-meta">
                    <span class="doc-size">${this.formatFileSize(doc.size || 0)}</span>
                    <button class="btn-delete" data-id="${doc.id}">删除</button>
                </div>
            `;
            
            const btnDelete = div.querySelector('.btn-delete');
            if (btnDelete && doc.id) {
                btnDelete.addEventListener('click', (e) => {
                    e.stopPropagation();
                    this.deleteDocument(doc.id);
                });
            }
            
            this.elements.kbDocs.appendChild(div);
        });
    }

    /**
     * 上传文档
     * @param {File} file - 文件对象
     */
    async uploadDocument(file) {
        if (!this.selectedDataset) {
            alert('请先选择知识库');
            return;
        }

        try {
            logger.debug('Uploading document...');
            await apiClient.uploadDocument(this.selectedDataset, file);
            await this.selectDataset(this.selectedDataset);
            logger.debug('Document uploaded successfully');
        } catch (error) {
            logger.error('Failed to upload document:', error);
            alert('上传文档失败：' + error.message);
        }
    }

    /**
     * 删除文档
     * @param {Array} documentIds - 文档ID列表
     */
    async deleteDocuments(documentIds) {
        if (!this.selectedDataset) {
            alert('请先选择知识库');
            return;
        }

        if (!confirm('确定要删除选中的文档吗？')) return;

        try {
            await apiClient.deleteDocuments(this.selectedDataset, documentIds);
            await this.selectDataset(this.selectedDataset);
            
            eventBus.emit(Events.DOCUMENTS_DELETED, {
                datasetId: this.selectedDataset,
                documentIds
            });
        } catch (error) {
            console.error('Failed to delete documents:', error);
            alert('删除文档失败：' + error.message);
        }
    }

    async addCurrentPage() {
        if (!state.selectedDataset) {
            alert('请先选择要添加到的知识库');
            return;
        }

        try {
            const content = await getCurrentPageContent();
            if (!content) {
                alert('无法获取页面内容');
                return;
            }

            await apiClient.uploadDocument(state.selectedDataset, content);
            await this.selectDataset(state.selectedDataset);
        } catch (error) {
            console.error('添加文档失败:', error);
            alert('添加文档失败: ' + error.message);
        }
    }

    formatFileSize(bytes) {
        if (bytes === 0) return '0 B';
        const k = 1024;
        const sizes = ['B', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    }

    getStatusText(status) {
        const statusMap = {
            'pending': '等待处理',
            'processing': '处理中',
            'finished': '已完成',
            'failed': '处理失败'
        };
        return statusMap[status] || status;
    }

    async deleteDocument(documentId) {
        if (!confirm('确定要删除该文档吗？')) return;

        try {
            logger.debug('Deleting document...');
            await apiClient.deleteDocuments(this.selectedDataset, [documentId]);
            await this.selectDataset(this.selectedDataset);
            logger.debug('Document deleted successfully');
        } catch (error) {
            logger.error('Failed to delete document:', error);
            alert('删除文档失败：' + error.message);
        }
    }

    /**
     * 显示错误消息
     * @param {string} message - 错误信息
     */
    showError(message) {
        const errorDiv = document.createElement('div');
        errorDiv.className = 'error-message';
        errorDiv.textContent = message;
        
        if (this.elements.kbDocs) {
            this.elements.kbDocs.insertBefore(errorDiv, this.elements.kbDocs.firstChild);
            
            // 3秒后自动移除错误消息
            setTimeout(() => {
                errorDiv.remove();
            }, 3000);
        }
    }
} 