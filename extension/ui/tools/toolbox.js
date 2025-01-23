import { apiClient } from '../../core/api.js';
import { getSelectedText } from '../../core/state.js';

export class Toolbox {
    constructor(elements) {
        this.elements = elements;
        this.bindEvents();
    }

    initializeTools() {
        if (!this.elements.toolContent) return;

        this.elements.toolContent.innerHTML = `
            <div class="tools-grid">
                <div class="tool-item" data-tool="translate">
                    <i class="fas fa-language"></i>
                    <span>翻译</span>
                </div>
                <div class="tool-item" data-tool="summarize">
                    <i class="fas fa-file-alt"></i>
                    <span>摘要</span>
                </div>
                <div class="tool-item" data-tool="pdf">
                    <i class="fas fa-file-pdf"></i>
                    <span>PDF 工具</span>
                </div>
            </div>
            <div id="output" class="output"></div>
        `;

        // 重新绑定工具点击事件
        this.bindToolEvents();
    }

    bindEvents() {
        // 翻译功能
        if (this.elements.btnTranslate) {
            this.elements.btnTranslate.addEventListener('click', () => this.translate());
        }

        // 摘要功能
        if (this.elements.btnSummarize) {
            this.elements.btnSummarize.addEventListener('click', () => this.summarize());
        }
    }

    bindToolEvents() {
        const toolsContainer = document.querySelector('.tools-grid');
        if (!toolsContainer) return;

        toolsContainer.addEventListener('click', async (e) => {
            const toolItem = e.target.closest('.tool-item');
            if (!toolItem) return;

            // 移除其他工具项的选中状态
            document.querySelectorAll('.tool-item').forEach(item => {
                item.classList.remove('active');
            });
            toolItem.classList.add('active');

            const toolType = toolItem.dataset.tool;
            if (toolType === 'pdf') {
                this.loadPDFTool();
            }
        });
    }

    async loadPDFTool() {
        try {
            const { PDFTool } = await import('./pdf/ui.js');
            const pdfTool = new PDFTool(this.elements.toolContent);
            this.elements.toolContent.innerHTML = pdfTool.initialize();
            pdfTool.bindEvents();
        } catch (error) {
            console.error('加载 PDF 工具失败:', error);
            this.elements.toolContent.innerHTML = '<div class="error">加载 PDF 工具失败</div>';
        }
    }

    async translate() {
        try {
            const text = await getSelectedText();
            if (!text) {
                this.updateOutput('请先选择要翻译的文本', true);
                return;
            }

            this.updateOutput('正在翻译...');
            const response = await apiClient.translate(text);
            this.updateOutput(response.translation);
        } catch (error) {
            this.updateOutput('翻译失败: ' + error.message, true);
        }
    }

    async summarize() {
        try {
            const text = await getSelectedText();
            if (!text) {
                this.updateOutput('请先选择要摘要的文本', true);
                return;
            }

            this.updateOutput('正在生成摘要...');
            const response = await apiClient.summarize(text);
            this.updateOutput(response.summary);
        } catch (error) {
            this.updateOutput('生成摘要失败: ' + error.message, true);
        }
    }

    updateOutput(text, isError = false) {
        if (!this.elements.output) return;

        this.elements.output.textContent = text;
        this.elements.output.style.color = isError ? '#dc3545' : '#666';
        this.elements.output.classList.add('active');
    }
} 