import { apiClient } from '../../core/api.js';
import { logger } from '../../core/logger.js';

/**
 * 工具箱组件类
 */
export class Toolbox {
    /**
     * 构造函数
     * @param {Object} elements - DOM元素引用
     */
    constructor(elements) {
        this.elements = elements;
        this.tools = [
            {
                id: 'translate',
                name: '翻译',
                icon: 'fa-language',
                description: '将选中的文本翻译成中文或英文'
            },
            {
                id: 'summarize',
                name: '总结',
                icon: 'fa-file-alt',
                description: '生成选中文本的摘要'
            },
            {
                id: 'pdf',
                name: 'PDF工具',
                icon: 'fa-file-pdf',
                description: '解析PDF文件内容'
            }
        ];
        logger.info('Toolbox component initialized');
    }

    /**
     * 初始化工具箱
     */
    initialize() {
        logger.debug('Initializing Toolbox...');
        this.initializeTools();
        this.bindEvents();
    }

    /**
     * 初始化工具列表
     */
    initializeTools() {
        if (!this.elements.toolContent) {
            logger.error('Tool content element not found');
            return;
        }

        this.elements.toolContent.innerHTML = '';
        
        this.tools.forEach(tool => {
            const div = document.createElement('div');
            div.className = 'tool-item';
            div.setAttribute('data-tool', tool.id);
            div.title = tool.description;
            
            div.innerHTML = `
                <i class="fas ${tool.icon}"></i>
                <span>${tool.name}</span>
            `;
            
            div.addEventListener('click', () => this.selectTool(tool));
            this.elements.toolContent.appendChild(div);
        });

        logger.debug('Tools initialized');
    }

    /**
     * 绑定事件处理函数
     */
    bindEvents() {
        logger.debug('Binding Toolbox events...');
        
        // 工具选择事件已在initializeTools中绑定
        
        // 清空输出
        if (this.elements.output) {
            const btnClear = document.createElement('button');
            btnClear.className = 'btn-secondary';
            btnClear.innerHTML = '<i class="fas fa-trash"></i> 清空';
            btnClear.addEventListener('click', () => this.clearOutput());
            
            this.elements.output.parentNode.insertBefore(btnClear, this.elements.output);
        }
    }

    async selectTool(tool) {
        logger.debug(`Selected tool: ${tool.name}`);
        
        const selectedText = await this.getSelectedText();
        if (!selectedText) {
            alert('请先选择要处理的文本');
            return;
        }

        switch (tool.id) {
            case 'translate':
                await this.translate(selectedText);
                break;
            case 'summarize':
                await this.summarize(selectedText);
                break;
            case 'pdf':
                this.loadPDFTool();
                break;
        }
    }

    async translate(text) {
        try {
            logger.debug('Translating text...');
            this.showLoading();
            
            const response = await apiClient.translate(text);
            this.updateOutput(`翻译结果:\n${response}`);
            
            logger.debug('Translation completed');
        } catch (error) {
            logger.error('Translation failed:', error);
            this.showError('翻译失败：' + error.message);
        } finally {
            this.hideLoading();
        }
    }

    async summarize(text) {
        try {
            logger.debug('Summarizing text...');
            this.showLoading();
            
            const response = await apiClient.summarize(text);
            this.updateOutput(`摘要:\n${response}`);
            
            logger.debug('Summarization completed');
        } catch (error) {
            logger.error('Summarization failed:', error);
            this.showError('生成摘要失败：' + error.message);
        } finally {
            this.hideLoading();
        }
    }

    loadPDFTool() {
        logger.debug('Loading PDF tool...');
        // TODO: 实现PDF工具功能
        alert('PDF工具功能开发中...');
    }

    async getSelectedText() {
        try {
            const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
            const [{result}] = await chrome.scripting.executeScript({
                target: { tabId: tab.id },
                function: () => window.getSelection().toString()
            });
            return result;
        } catch (error) {
            logger.error('Failed to get selected text:', error);
            return '';
        }
    }

    updateOutput(content) {
        if (this.elements.output) {
            this.elements.output.textContent = content;
        }
    }

    showError(message) {
        this.updateOutput(`错误: ${message}`);
    }

    clearOutput() {
        this.updateOutput('');
    }

    /**
     * 显示加载状态
     */
    showLoading() {
        if (this.elements.output) {
            const loadingDiv = document.createElement('div');
            loadingDiv.className = 'loading-indicator';
            loadingDiv.innerHTML = '<div class="spinner"></div>';
            this.elements.output.appendChild(loadingDiv);
        }
    }

    /**
     * 隐藏加载状态
     */
    hideLoading() {
        if (this.elements.output) {
            const loadingDiv = this.elements.output.querySelector('.loading-indicator');
            if (loadingDiv) {
                loadingDiv.remove();
            }
        }
    }
} 