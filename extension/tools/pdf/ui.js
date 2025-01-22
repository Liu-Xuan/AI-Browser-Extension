export class PdfToolUI {
    constructor() {
        this.statusLogArea = null;
        this.progressContainer = null;
        this.resultArea = null;
    }

    initialize() {
        return `
            <div class="pdf-tool">
                <div class="tool-header">
                    <h3>PDF 解析工具</h3>
                    <div class="tool-actions">
                        <button id="parsePdfBtn" class="btn btn-primary">
                            <i class="fas fa-file-import"></i> 解析当前 PDF
                        </button>
                        <button id="clearResultBtn" class="btn btn-secondary">
                            <i class="fas fa-trash"></i> 清除结果
                        </button>
                    </div>
                </div>
                <div id="progressContainer" style="display: none;">
                    <div class="progress-bar">
                        <div class="progress-inner" style="width: 0%"></div>
                        <div class="progress-text">0%</div>
                    </div>
                </div>
                <div id="resultArea" class="result-area">
                    <div id="statusLogArea" class="status-log-area"></div>
                </div>
            </div>
        `;
    }

    showStatus(message) {
        const statusLogArea = document.getElementById('statusLogArea');
        const logEntry = document.createElement('div');
        logEntry.className = 'log-entry';
        logEntry.innerHTML = `
            <span class="log-time">[${new Date().toLocaleTimeString()}]</span>
            <span class="log-message">${message}</span>
        `;
        statusLogArea.appendChild(logEntry);
        statusLogArea.scrollTop = statusLogArea.scrollHeight;
    }

    updateProgress(percent, message = '') {
        const progressContainer = document.getElementById('progressContainer');
        const progressInner = progressContainer.querySelector('.progress-inner');
        const progressText = progressContainer.querySelector('.progress-text');
        
        progressContainer.style.display = 'block';
        progressInner.style.width = `${percent}%`;
        progressText.textContent = message || `${Math.round(percent)}%`;
    }

    showError(message) {
        const resultArea = document.getElementById('resultArea');
        const errorDiv = document.createElement('div');
        errorDiv.className = 'error-message';
        errorDiv.innerHTML = `
            <i class="fas fa-exclamation-circle"></i>
            <div class="error-content">
                <div class="error-title">错误</div>
                <div class="error-text">${message}</div>
            </div>
        `;
        
        if (resultArea.firstChild) {
            resultArea.insertBefore(errorDiv, resultArea.firstChild);
        } else {
            resultArea.appendChild(errorDiv);
        }
    }

    displayPdfResult(data) {
        const resultArea = document.getElementById('resultArea');
        
        let html = '<div class="pdf-result">';
        
        if (data.metadata) {
            html += `
                <div class="metadata-section">
                    <h4>文档信息</h4>
                    <table class="metadata-table">
                        ${Object.entries(data.metadata).map(([key, value]) => `
                            <tr>
                                <td>${key}</td>
                                <td>${value}</td>
                            </tr>
                        `).join('')}
                    </table>
                </div>
            `;
        }

        if (data.content) {
            const previewLength = 1000;
            const hasMore = data.content.length > previewLength;
            const previewContent = data.content.slice(0, previewLength) + (hasMore ? '...' : '');
            
            html += `
                <div class="content-section">
                    <h4>内容预览 (总字数: ${data.content.length})</h4>
                    <div class="content-preview">
                        ${previewContent}
                        ${hasMore ? '<div class="fade-out"></div>' : ''}
                    </div>
                </div>
            `;
        }

        html += '</div>';
        resultArea.innerHTML = html;
    }

    bindEvents() {
        const parsePdfBtn = document.getElementById('parsePdfBtn');
        const clearResultBtn = document.getElementById('clearResultBtn');

        parsePdfBtn.addEventListener('click', async () => {
            try {
                this.showStatus('开始 PDF 解析流程...');
                
                const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
                if (!tab) {
                    this.showError('无法获取当前标签页');
                    return;
                }

                this.showStatus(`当前页面: ${tab.url}`);
                this.updateProgress(10, '正在初始化...');

                const result = await new Promise((resolve, reject) => {
                    const timeoutId = setTimeout(() => {
                        reject(new Error('请求超时'));
                    }, 30000);

                    const messageListener = (message) => {
                        if (message.action === 'pdfParseResult') {
                            clearTimeout(timeoutId);
                            chrome.runtime.onMessage.removeListener(messageListener);
                            if (message.success) {
                                resolve(message.data);
                            } else {
                                reject(new Error(message.error));
                            }
                        }
                    };

                    chrome.runtime.onMessage.addListener(messageListener);

                    this.showStatus('正在发送解析请求到后台...');
                    chrome.runtime.sendMessage({
                        action: 'parsePdf',
                        url: tab.url
                    });
                });

                this.updateProgress(90, '正在处理结果...');
                this.showStatus('解析完成，正在显示结果...');
                this.displayPdfResult(result);
                this.updateProgress(100, '完成');

            } catch (error) {
                this.showStatus(`错误: ${error.message}`);
                this.showError(error.message);
                this.updateProgress(0);
            }
        });

        clearResultBtn.addEventListener('click', () => {
            const statusLogArea = document.getElementById('statusLogArea');
            const progressContainer = document.getElementById('progressContainer');
            if (statusLogArea) {
                statusLogArea.innerHTML = '';
            }
            progressContainer.style.display = 'none';
        });
    }
} 