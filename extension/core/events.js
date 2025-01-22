// 事件管理模块
class EventBus {
    constructor() {
        this.events = {};
    }

    // 注册事件监听器
    on(eventName, callback) {
        if (!this.events[eventName]) {
            this.events[eventName] = [];
        }
        this.events[eventName].push(callback);
    }

    // 移除事件监听器
    off(eventName, callback) {
        if (!this.events[eventName]) return;
        this.events[eventName] = this.events[eventName].filter(cb => cb !== callback);
    }

    // 触发事件
    emit(eventName, data) {
        if (!this.events[eventName]) return;
        this.events[eventName].forEach(callback => {
            try {
                callback(data);
            } catch (error) {
                console.error(`Error in event handler for ${eventName}:`, error);
            }
        });
    }

    // 只监听一次的事件
    once(eventName, callback) {
        const onceCallback = (data) => {
            callback(data);
            this.off(eventName, onceCallback);
        };
        this.on(eventName, onceCallback);
    }
}

// 预定义事件类型
export const EventTypes = {
    TEXT_SELECTED: 'text_selected',
    TRANSLATION_REQUESTED: 'translation_requested',
    TRANSLATION_COMPLETED: 'translation_completed',
    SUMMARY_REQUESTED: 'summary_requested',
    SUMMARY_COMPLETED: 'summary_completed',
    QA_REQUESTED: 'qa_requested',
    QA_COMPLETED: 'qa_completed',
    ERROR_OCCURRED: 'error_occurred'
};

export const eventBus = new EventBus(); 