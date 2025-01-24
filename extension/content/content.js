// 监听来自popup的消息
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.type === 'getPageContent') {
        // 提取页面内容
        const content = extractPageContent();
        sendResponse({ content });
    }
    return true;
});

// 提取页面内容的函数
function extractPageContent() {
    // 获取页面主要内容
    const article = document.querySelector('article');
    const main = document.querySelector('main');
    const content = document.querySelector('.content');
    
    // 按优先级选择内容容器
    let container = article || main || content || document.body;
    
    // 创建一个副本以进行清理
    let clone = container.cloneNode(true);
    
    // 移除不需要的元素
    removeUnwantedElements(clone);
    
    // 获取清理后的文本内容
    let text = clone.innerText || clone.textContent;
    
    // 基本的文本清理
    text = cleanText(text);
    
    return {
        title: document.title,
        url: window.location.href,
        content: text
    };
}

// 移除不需要的元素
function removeUnwantedElements(element) {
    const unwantedSelectors = [
        'script',
        'style',
        'iframe',
        'nav',
        'footer',
        'header',
        '.ad',
        '.ads',
        '.advertisement',
        '.social-share',
        '.comments',
        '#comments',
        '.sidebar',
        '.related-content'
    ];
    
    unwantedSelectors.forEach(selector => {
        const elements = element.querySelectorAll(selector);
        elements.forEach(el => el.remove());
    });
}

// 清理文本内容
function cleanText(text) {
    return text
        // 移除多余的空白字符
        .replace(/\s+/g, ' ')
        // 移除多余的换行
        .replace(/\n+/g, '\n')
        // 移除开头和结尾的空白
        .trim();
} 