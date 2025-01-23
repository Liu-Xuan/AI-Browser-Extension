// 全局状态管理
export const state = {
    currentDatasetId: '',
    refreshInterval: null,
    chatHistory: [],
    currentAgentId: null,
    currentSessionId: null,
    selectedDataset: null,
    selectedDocuments: new Set(),
    usePageContext: false,
    currentPageContent: null,
    uploadStartTime: 0,
    uploadedSize: 0,
    parsingStatusInterval: null,
    lastSearchQuery: '',
    isSearching: false
};

// DOM 元素引用
export const elements = {};

// 浏览器相关工具函数
export async function getSelectedText() {
    try {
        const [tab] = await chrome.tabs.query({active: true, currentWindow: true});
        const [{result}] = await chrome.scripting.executeScript({
            target: {tabId: tab.id},
            function: () => window.getSelection().toString().trim()
        });
        return result;
    } catch (error) {
        console.error('获取选中文本失败:', error);
        return '';
    }
}

export async function getCurrentPageContent() {
    try {
        const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
        if (!tab) return null;
        
        const result = await chrome.scripting.executeScript({
            target: { tabId: tab.id },
            function: () => {
                return {
                    title: document.title,
                    url: window.location.href,
                    content: document.body.innerText
                };
            }
        });
        
        return result[0].result;
    } catch (error) {
        console.error('获取页面内容失败:', error);
        return null;
    }
}

// 工具函数
export function formatFileSize(bytes) {
    if (!bytes) return '0 B';
    const units = ['B', 'KB', 'MB', 'GB'];
    let size = bytes;
    let unitIndex = 0;
    while (size >= 1024 && unitIndex < units.length - 1) {
        size /= 1024;
        unitIndex++;
    }
    return `${size.toFixed(1)} ${units[unitIndex]}`;
}

export function getStatusText(status) {
    const statusMap = {
        'pending': '等待解析',
        'parsing': '解析中',
        'finished': '已完成',
        'failed': '解析失败',
        'stopped': '已停止'
    };
    return statusMap[status] || status;
}

// 初始化 DOM 元素
export function initializeElements() {
    const elementIds = [
        'tabs',
        'tabContents',
        'btnSummarize',
        'btnTranslate',
        'btnAsk',
        'btnAddToKB',
        'btnDeleteFromKB',
        'output',
        'qaInput',
        'qaMessages',
        'kbTree',
        'kbDocs',
        'btnCreateDataset',
        'btnDeleteDataset',
        'btnRefresh',
        'agentSelector',
        'btnToggleContext',
        'searchInput',
        'btnSearch',
        'searchResults'
    ];

    elementIds.forEach(id => {
        elements[id] = document.getElementById(id);
    });

    // 获取所有标签页
    elements.tabElements = document.querySelectorAll('.tab');
    elements.tabContentElements = document.querySelectorAll('.tab-content');
} 