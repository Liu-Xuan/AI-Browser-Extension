// 内容脚本功能
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

        // 监听来自扩展的消息
        chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
            if (request.action === 'getPageContent') {
                try {
                    // 获取页面内容
                    const content = {
                        title: document.title,
                        url: window.location.href,
                        text: this.extractPageContent(),
                        timestamp: new Date().toISOString()
                    };
                    
                    // 发送响应
                    sendResponse({ content });
                } catch (error) {
                    console.error('Error getting page content:', error);
                    sendResponse({ error: error.message });
                }
                return true; // 保持消息通道开启
            }
        });
    }

    handleHotkey(action) {
        if (this.selectedText) {
            assistant.handleSelectedText(this.selectedText, action);
        }
    }

    // 提取页面主要内容
    extractPageContent() {
        // 移除不需要的元素
        const elementsToRemove = [
            'script',
            'style',
            'iframe',
            'noscript',
            'header',
            'footer',
            'nav',
            'aside'
        ];

        // 创建页面内容的副本
        const contentClone = document.body.cloneNode(true);

        // 移除不需要的元素
        elementsToRemove.forEach(tag => {
            const elements = contentClone.getElementsByTagName(tag);
            while (elements.length > 0) {
                elements[0].parentNode.removeChild(elements[0]);
            }
        });

        // 获取主要内容
        let mainContent = '';

        // 尝试从article或main标签获取内容
        const article = contentClone.querySelector('article') || contentClone.querySelector('main');
        if (article) {
            mainContent = article.textContent;
        } else {
            // 如果没有特定标签，获取body的文本内容
            mainContent = contentClone.textContent;
        }

        // 清理文本内容
        return this.cleanText(mainContent);
    }

    // 清理文本内容
    cleanText(text) {
        return text
            .replace(/[\r\n]+/g, '\n') // 统一换行符
            .replace(/[\t]+/g, ' ') // 替换制表符为空格
            .replace(/ +/g, ' ') // 合并多个空格
            .trim(); // 移除首尾空白
    }
}

// 初始化内容脚本
const contentScript = new ContentScript(); 