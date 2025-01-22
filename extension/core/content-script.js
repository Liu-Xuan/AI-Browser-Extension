import { eventBus, EventTypes } from '../../core/events.js';
import { assistant } from './assistant.js';

class ContentScript {
    constructor() {
        this.selectedText = '';
        this.initEventListeners();
    }

    initEventListeners() {
        // 监听文本选择
        document.addEventListener('mouseup', () => {
            const text = window.getSelection().toString().trim();
            if (text) {
                this.selectedText = text;
                eventBus.emit(EventTypes.TEXT_SELECTED, { text });
            }
        });

        // 监听键盘快捷键
        document.addEventListener('keydown', (event) => {
            // Alt + T: 翻译
            if (event.altKey && event.key === 't') {
                this.handleHotkey('translate');
            }
            // Alt + S: 摘要
            else if (event.altKey && event.key === 's') {
                this.handleHotkey('summarize');
            }
            // Alt + Q: 问答
            else if (event.altKey && event.key === 'q') {
                this.handleHotkey('qa');
            }
        });

        // 监听来自后台的消息
        chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
            if (request.type === 'getSelectedText') {
                sendResponse({ text: this.selectedText });
            }
            return true;
        });
    }

    handleHotkey(action) {
        if (this.selectedText) {
            assistant.handleSelectedText(this.selectedText, action);
        }
    }

    // 获取页面主要内容
    getPageContent() {
        // 移除不需要的元素
        const elementsToRemove = [
            'script', 'style', 'nav', 'header', 'footer',
            'iframe', 'noscript', 'img', 'svg', 'canvas'
        ];

        const content = document.body.cloneNode(true);
        elementsToRemove.forEach(tag => {
            const elements = content.getElementsByTagName(tag);
            for (let i = elements.length - 1; i >= 0; i--) {
                elements[i].remove();
            }
        });

        return content.textContent.trim()
            .replace(/\s+/g, ' ')
            .replace(/\n+/g, '\n');
    }
}

// 初始化内容脚本
const contentScript = new ContentScript(); 