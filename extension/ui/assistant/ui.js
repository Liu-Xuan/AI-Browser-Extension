import { eventBus, EventTypes } from '../../core/events.js';

class AssistantUI {
    constructor() {
        this.container = null;
        this.isDragging = false;
        this.dragOffset = { x: 0, y: 0 };
        this.initUI();
        this.initEventListeners();
    }

    initUI() {
        // 创建浮动窗口容器
        this.container = document.createElement('div');
        this.container.id = 'ai-assistant-container';
        this.container.innerHTML = `
            <div class="ai-assistant-header">
                <span class="ai-assistant-title">AI 助手</span>
                <div class="ai-assistant-controls">
                    <button class="minimize">_</button>
                    <button class="close">×</button>
                </div>
            </div>
            <div class="ai-assistant-content">
                <div class="ai-assistant-result"></div>
                <div class="ai-assistant-buttons">
                    <button class="translate-btn">翻译</button>
                    <button class="summarize-btn">摘要</button>
                    <button class="qa-btn">问答</button>
                </div>
            </div>
        `;

        // 添加样式
        const style = document.createElement('style');
        style.textContent = `
            #ai-assistant-container {
                position: fixed;
                right: 20px;
                top: 20px;
                width: 300px;
                background: white;
                border-radius: 8px;
                box-shadow: 0 2px 10px rgba(0,0,0,0.1);
                z-index: 10000;
                font-family: Arial, sans-serif;
            }
            .ai-assistant-header {
                padding: 10px;
                background: #f5f5f5;
                border-radius: 8px 8px 0 0;
                cursor: move;
                display: flex;
                justify-content: space-between;
                align-items: center;
            }
            .ai-assistant-content {
                padding: 15px;
            }
            .ai-assistant-result {
                min-height: 100px;
                margin-bottom: 10px;
                white-space: pre-wrap;
            }
            .ai-assistant-buttons {
                display: flex;
                gap: 10px;
            }
            .ai-assistant-buttons button {
                flex: 1;
                padding: 8px;
                border: none;
                border-radius: 4px;
                background: #007bff;
                color: white;
                cursor: pointer;
            }
            .ai-assistant-buttons button:hover {
                background: #0056b3;
            }
        `;

        document.head.appendChild(style);
        document.body.appendChild(this.container);
    }

    initEventListeners() {
        // 拖拽功能
        const header = this.container.querySelector('.ai-assistant-header');
        header.addEventListener('mousedown', this.startDragging.bind(this));
        document.addEventListener('mousemove', this.drag.bind(this));
        document.addEventListener('mouseup', this.stopDragging.bind(this));

        // 按钮点击事件
        const buttons = this.container.querySelector('.ai-assistant-buttons');
        buttons.addEventListener('click', (e) => {
            if (e.target.matches('button')) {
                const action = e.target.className.replace('-btn', '');
                this.handleAction(action);
            }
        });

        // 监听结果事件
        eventBus.on(EventTypes.TRANSLATION_COMPLETED, this.showResult.bind(this));
        eventBus.on(EventTypes.SUMMARY_COMPLETED, this.showResult.bind(this));
        eventBus.on(EventTypes.QA_COMPLETED, this.showResult.bind(this));
        eventBus.on(EventTypes.ERROR_OCCURRED, this.showError.bind(this));
    }

    startDragging(e) {
        this.isDragging = true;
        const rect = this.container.getBoundingClientRect();
        this.dragOffset = {
            x: e.clientX - rect.left,
            y: e.clientY - rect.top
        };
    }

    drag(e) {
        if (!this.isDragging) return;
        
        const x = e.clientX - this.dragOffset.x;
        const y = e.clientY - this.dragOffset.y;
        
        this.container.style.left = `${x}px`;
        this.container.style.top = `${y}px`;
    }

    stopDragging() {
        this.isDragging = false;
    }

    handleAction(action) {
        const selectedText = window.getSelection().toString().trim();
        if (!selectedText) {
            this.showError({ error: '请先选择文本' });
            return;
        }

        this.showLoading();
        eventBus.emit(`${action}_requested`, { text: selectedText });
    }

    showResult(result) {
        const resultDiv = this.container.querySelector('.ai-assistant-result');
        resultDiv.textContent = result.text || JSON.stringify(result, null, 2);
        resultDiv.classList.remove('loading', 'error');
    }

    showError({ error }) {
        const resultDiv = this.container.querySelector('.ai-assistant-result');
        resultDiv.textContent = `错误: ${error}`;
        resultDiv.classList.add('error');
    }

    showLoading() {
        const resultDiv = this.container.querySelector('.ai-assistant-result');
        resultDiv.textContent = '处理中...';
        resultDiv.classList.add('loading');
    }
}

// 初始化UI
const ui = new AssistantUI(); 