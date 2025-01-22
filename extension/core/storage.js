// 存储管理模块
class StorageManager {
    constructor() {
        this.cache = new Map();
        this.cacheTimeout = 5 * 60 * 1000; // 5分钟缓存过期
    }

    // 保存数据到本地存储
    async set(key, value) {
        try {
            await chrome.storage.local.set({ [key]: value });
            this.updateCache(key, value);
        } catch (error) {
            console.error('Error saving to storage:', error);
            throw error;
        }
    }

    // 从本地存储获取数据
    async get(key) {
        // 先检查缓存
        const cachedValue = this.getFromCache(key);
        if (cachedValue !== undefined) {
            return cachedValue;
        }

        try {
            const result = await chrome.storage.local.get(key);
            const value = result[key];
            this.updateCache(key, value);
            return value;
        } catch (error) {
            console.error('Error reading from storage:', error);
            throw error;
        }
    }

    // 从本地存储删除数据
    async remove(key) {
        try {
            await chrome.storage.local.remove(key);
            this.cache.delete(key);
        } catch (error) {
            console.error('Error removing from storage:', error);
            throw error;
        }
    }

    // 清除所有数据
    async clear() {
        try {
            await chrome.storage.local.clear();
            this.cache.clear();
        } catch (error) {
            console.error('Error clearing storage:', error);
            throw error;
        }
    }

    // 更新缓存
    updateCache(key, value) {
        this.cache.set(key, {
            value,
            timestamp: Date.now()
        });
    }

    // 从缓存获取数据
    getFromCache(key) {
        const cached = this.cache.get(key);
        if (!cached) return undefined;

        // 检查缓存是否过期
        if (Date.now() - cached.timestamp > this.cacheTimeout) {
            this.cache.delete(key);
            return undefined;
        }

        return cached.value;
    }
}

export const storage = new StorageManager(); 