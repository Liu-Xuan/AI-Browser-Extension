import { apiClient } from '../../core/api.js';
import { eventBus, EventTypes } from '../../core/events.js';

class Assistant {
    constructor() {
        this.initEventListeners();
    }

    initEventListeners() {
        // 监听翻译请求
        eventBus.on(EventTypes.TRANSLATION_REQUESTED, async ({ text, targetLang = 'zh' }) => {
            try {
                const result = await apiClient.translate(text, targetLang);
                eventBus.emit(EventTypes.TRANSLATION_COMPLETED, result);
            } catch (error) {
                eventBus.emit(EventTypes.ERROR_OCCURRED, {
                    type: 'translation',
                    error: error.message
                });
            }
        });

        // 监听摘要请求
        eventBus.on(EventTypes.SUMMARY_REQUESTED, async ({ text, maxLength }) => {
            try {
                const result = await apiClient.summarize(text, maxLength);
                eventBus.emit(EventTypes.SUMMARY_COMPLETED, result);
            } catch (error) {
                eventBus.emit(EventTypes.ERROR_OCCURRED, {
                    type: 'summary',
                    error: error.message
                });
            }
        });

        // 监听问答请求
        eventBus.on(EventTypes.QA_REQUESTED, async ({ context, question, history }) => {
            try {
                const result = await apiClient.qa(context, question, history);
                eventBus.emit(EventTypes.QA_COMPLETED, result);
            } catch (error) {
                eventBus.emit(EventTypes.ERROR_OCCURRED, {
                    type: 'qa',
                    error: error.message
                });
            }
        });
    }

    // 处理选中的文本
    async handleSelectedText(text, action) {
        switch (action) {
            case 'translate':
                eventBus.emit(EventTypes.TRANSLATION_REQUESTED, { text });
                break;
            case 'summarize':
                eventBus.emit(EventTypes.SUMMARY_REQUESTED, { text });
                break;
            case 'qa':
                eventBus.emit(EventTypes.QA_REQUESTED, { context: text });
                break;
            default:
                console.error(`Unknown action: ${action}`);
        }
    }
}

export const assistant = new Assistant(); 