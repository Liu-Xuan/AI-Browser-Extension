/**
 * 事件总线类
 * 用于组件间的事件通信
 */
class EventBus {
    constructor() {
        // 存储事件监听器的映射
        this.events = {};
    }

    /**
     * 订阅事件
     * @param {string} event - 事件名称
     * @param {Function} callback - 回调函数
     */
    on(event, callback) {
        if (!this.events[event]) {
            this.events[event] = [];
        }
        this.events[event].push(callback);
    }

    /**
     * 取消订阅事件
     * @param {string} event - 事件名称
     * @param {Function} callback - 回调函数
     */
    off(event, callback) {
        if (!this.events[event]) return;
        this.events[event] = this.events[event].filter(cb => cb !== callback);
    }

    /**
     * 触发事件
     * @param {string} event - 事件名称
     * @param {*} data - 事件数据
     */
    emit(event, data) {
        if (!this.events[event]) return;
        this.events[event].forEach(callback => {
            try {
                callback(data);
            } catch (error) {
                console.error(`Error in event handler for ${event}:`, error);
            }
        });
    }

    /**
     * 只监听一次的事件
     * @param {string} eventName - 事件名称
     * @param {Function} callback - 回调函数
     */
    once(eventName, callback) {
        const onceCallback = (data) => {
            callback(data);
            this.off(eventName, onceCallback);
        };
        this.on(eventName, onceCallback);
    }
}

/**
 * 事件常量定义
 */
export const Events = {
    // 知识库相关事件
    DATASET_CREATED: 'dataset:created',
    DATASET_DELETED: 'dataset:deleted',
    DATASET_SELECTED: 'dataset:selected',
    DOCUMENT_UPLOADED: 'document:uploaded',
    DOCUMENT_DELETED: 'document:deleted',
    DOCUMENT_PARSED: 'document:parsed',
    
    // 搜索相关事件
    SEARCH_STARTED: 'search:started',
    SEARCH_COMPLETED: 'search:completed',
    SEARCH_FAILED: 'search:failed',
    
    // 聊天相关事件
    CHAT_STARTED: 'chat:started',
    CHAT_COMPLETED: 'chat:completed',
    CHAT_FAILED: 'chat:failed',
    AGENT_CHANGED: 'agent:changed',
    CONTEXT_TOGGLED: 'context:toggled',
    
    // 工具相关事件
    TOOL_SELECTED: 'tool:selected',
    TRANSLATION_STARTED: 'translation:started',
    TRANSLATION_COMPLETED: 'translation:completed',
    SUMMARIZATION_STARTED: 'summarization:started',
    SUMMARIZATION_COMPLETED: 'summarization:completed',
    
    // UI状态事件
    UI_LOADING: 'ui:loading',
    UI_LOADED: 'ui:loaded',
    ERROR_OCCURRED: 'error:occurred'
};

// 创建全局事件总线实例
export const eventBus = new EventBus(); 