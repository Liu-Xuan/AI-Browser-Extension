import { logger } from './logger.js';

/**
 * 配置管理类
 */
export class Config {
    constructor() {
        this.configs = {};
    }

    /**
     * 初始化配置
     */
    async init() {
        try {
            // 从 Chrome 存储中读取配置
            const result = await chrome.storage.local.get([
                'DEEPSEEK_API_KEY',
                'OPENAI_API_KEY',
                'RAGFLOW_API_KEY',
                'API_BASE_URL'
            ]);

            this.configs = {
                DEEPSEEK_API_KEY: result.DEEPSEEK_API_KEY || '',
                OPENAI_API_KEY: result.OPENAI_API_KEY || '',
                RAGFLOW_API_KEY: result.RAGFLOW_API_KEY || '',
                API_BASE_URL: result.API_BASE_URL || 'http://172.19.12.146:8888/api/v1'
            };

            logger.debug('配置加载完成:', {
                deepseekKeySet: !!this.configs.DEEPSEEK_API_KEY,
                openaiKeySet: !!this.configs.OPENAI_API_KEY,
                ragflowKeySet: !!this.configs.RAGFLOW_API_KEY,
                apiBaseUrl: this.configs.API_BASE_URL
            });
        } catch (error) {
            logger.error('加载配置失败:', error);
            throw error;
        }
    }

    /**
     * 获取配置值
     * @param {string} key - 配置键名
     * @returns {string} 配置值
     */
    get(key) {
        return this.configs[key] || '';
    }

    /**
     * 设置配置值
     * @param {string} key - 配置键名
     * @param {string} value - 配置值
     */
    async set(key, value) {
        try {
            await chrome.storage.local.set({ [key]: value });
            this.configs[key] = value;
            logger.debug(`配置已更新: ${key}`);
        } catch (error) {
            logger.error(`更新配置失败: ${key}`, error);
            throw error;
        }
    }
}

// 创建全局配置实例
export const config = new Config(); 