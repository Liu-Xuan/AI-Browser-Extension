import { apiClient } from '../../../core/api.js';

export class PDFTool {
    constructor(container) {
        this.container = container;
        this.init();
    }

    init() {
        this.container.innerHTML = `
            <div class="pdf-tool">
                <div class="tool-header">
                    <h3>PDF 解析工具</h3>
                    <div class="tool-actions">
                        <button id="btnSelectPDF">选择 PDF</button>
                        <button id="btnParse" disabled>解析</button>
                    </div>
                </div>
                <div id="progressArea" style="display: none;">
                    <div class="progress-bar">
                        <div class="progress-inner" style="width: 0%"></div>
                        <div class="progress-text">0%</div>
                    </div>
                </div>
                <div id="resultArea" class="result-area" style="display: none;">
                    <div class="metadata-section">
                        <h4>文档信息</h4>
                        <table class="metadata-table" id="metadataTable"></table>
                    </div>
                    <div class="outline-section">
                        <h4>目录结构</h4>
                        <ul class="outline-list" id="outlineList"></ul>
                    </div>
                    <div class="content-section">
                        <h4>内容预览</h4>
                        <div class="content-preview" id="contentPreview">
                            <div class="fade-out"></div>
                        </div>
                    </div>
                </div>
                <div id="statusLog" class="status-log-area" style="display: none;"></div>
            </div>
        `;

        this.bindEvents();
    }

    bindEvents() {
        const btnSelectPDF = this.container.querySelector('#btnSelectPDF');
        const btnParse = this.container.querySelector('#btnParse');
        
        btnSelectPDF.addEventListener('click', () => this.selectPDF());
        btnParse.addEventListener('click', () => this.parsePDF());
    }

    async selectPDF() {
        try {
            const [fileHandle] = await window.showOpenFilePicker({
                types: [{
                    description: 'PDF 文件',
                    accept: { 'application/pdf': ['.pdf'] }
                }]
            });
            
            this.file = await fileHandle.getFile();
            const btnParse = this.container.querySelector('#btnParse');
            btnParse.disabled = false;
            
            this.showMessage(`已选择文件: ${this.file.name}`, 'success');
        } catch (error) {
            if (error.name !== 'AbortError') {
                this.showMessage('选择文件失败: ' + error.message, 'error');
            }
        }
    }

    async parsePDF() {
        if (!this.file) {
            this.showMessage('请先选择 PDF 文件', 'error');
            return;
        }

        try {
            this.showProgress(true);
            this.log('开始解析 PDF...');

            // 读取文件内容
            const arrayBuffer = await this.file.arrayBuffer();
            const base64 = btoa(String.fromCharCode(...new Uint8Array(arrayBuffer)));

            this.updateProgress(10);
            this.log('正在获取文档元数据...');
            const metadata = await apiClient.getPDFMetadata(this.file.name, base64);

            this.updateProgress(30);
            this.log('正在获取文档目录...');
            const outline = await apiClient.getPDFOutline(this.file.name, base64);

            this.updateProgress(50);
            this.log('正在提取文档内容...');
            const content = await apiClient.getPDFContent(this.file.name, base64);

            this.updateProgress(90);
            this.log('正在整理结果...');

            // 显示结果
            this.showResult({
                metadata: metadata.data,
                outline: outline.data,
                content: content.data
            });

            this.updateProgress(100);
            this.log('PDF 解析完成');
        } catch (error) {
            this.showMessage('解析失败: ' + error.message, 'error');
            this.log('解析失败: ' + error.message);
        } finally {
            this.showProgress(false);
        }
    }

    showProgress(show) {
        const progressArea = this.container.querySelector('#progressArea');
        progressArea.style.display = show ? 'block' : 'none';
    }

    updateProgress(percent) {
        const progressInner = this.container.querySelector('.progress-inner');
        const progressText = this.container.querySelector('.progress-text');
        
        progressInner.style.width = `${percent}%`;
        progressText.textContent = `${percent}%`;
    }

    showResult(data) {
        const resultArea = this.container.querySelector('#resultArea');
        resultArea.style.display = 'block';

        // 显示元数据
        const metadataTable = this.container.querySelector('#metadataTable');
        metadataTable.innerHTML = Object.entries(data.metadata)
            .map(([key, value]) => `
                <tr>
                    <td>${key}</td>
                    <td>${value}</td>
                </tr>
            `).join('');

        // 显示目录
        const outlineList = this.container.querySelector('#outlineList');
        outlineList.innerHTML = this.renderOutline(data.outline);

        // 显示内容预览
        const contentPreview = this.container.querySelector('#contentPreview');
        contentPreview.innerHTML = `
            <p>${data.content.slice(0, 1000)}...</p>
            <div class="fade-out"></div>
        `;
    }

    renderOutline(outline, level = 0) {
        if (!outline || !outline.length) return '';
        
        return outline.map(item => `
            <li class="outline-item" style="padding-left: ${level * 20}px">
                ${item.title}
                ${item.children ? this.renderOutline(item.children, level + 1) : ''}
            </li>
        `).join('');
    }

    showMessage(message, type = 'info') {
        const messageDiv = document.createElement('div');
        messageDiv.className = `${type}-message`;
        messageDiv.textContent = message;
        
        this.container.insertBefore(messageDiv, this.container.firstChild);
        
        setTimeout(() => messageDiv.remove(), 5000);
    }

    log(message) {
        const statusLog = this.container.querySelector('#statusLog');
        statusLog.style.display = 'block';
        
        const logEntry = document.createElement('div');
        logEntry.className = 'log-entry';
        logEntry.innerHTML = `
            <span class="log-time">[${new Date().toLocaleTimeString()}]</span>
            <span class="log-message">${message}</span>
        `;
        
        statusLog.appendChild(logEntry);
        statusLog.scrollTop = statusLog.scrollHeight;
    }
} 