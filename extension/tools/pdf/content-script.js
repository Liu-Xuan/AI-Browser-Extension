import { PdfParser } from './parser.js';

const parser = new PdfParser();

// 检查是否是 PDF 页面并开始监听
if (parser.isPdfPage()) {
    parser.startObserving();
}

// 监听来自扩展的消息
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.action === 'getPdfContent') {
        if (!parser.isPdfPage()) {
            sendResponse({ error: '当前页面不是 PDF' });
            return;
        }

        // 获取内容并发送响应
        parser.getPdfContent()
            .then(content => {
                if (!content || !content.content) {
                    sendResponse({ error: '无法获取 PDF 内容' });
                } else {
                    sendResponse({ success: true, data: content });
                }
            })
            .catch(error => {
                sendResponse({ error: error.message });
            });

        return true; // 保持消息通道开启
    }
}); 