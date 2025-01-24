/**
 * 日志级别枚举
 * @enum {string}
 */
export const LogLevel = {
    /** 调试信息 */
    DEBUG: 'debug',
    /** 普通信息 */
    INFO: 'info',
    /** 警告信息 */
    WARN: 'warn',
    /** 错误信息 */
    ERROR: 'error'
};

/**
 * 日志记录器类
 * 用于统一管理应用程序的日志记录
 */
class Logger {
    /**
     * 构造函数
     */
    constructor() {
        /** @type {string} 当前日志级别 */
        this.level = LogLevel.INFO;
        /** @type {Array} 日志记录数组 */
        this.logs = [];
        /** @type {number} 最大日志数量 */
        this.maxLogs = 1000;
    }

    /**
     * 设置日志级别
     * @param {LogLevel} level - 日志级别
     */
    setLevel(level) {
        if (!Object.values(LogLevel).includes(level)) {
            throw new Error(`Invalid log level: ${level}`);
        }
        this.level = level;
    }

    /**
     * 记录调试信息
     * @param {string} message - 日志消息
     * @param {*} [data] - 附加数据
     */
    debug(message, data) {
        if (this.shouldLog(LogLevel.DEBUG)) {
            this.log('debug', message, data);
        }
    }

    /**
     * 记录普通信息
     * @param {string} message - 日志消息
     * @param {*} [data] - 附加数据
     */
    info(message, data) {
        if (this.shouldLog(LogLevel.INFO)) {
            this.log('info', message, data);
        }
    }

    /**
     * 记录警告信息
     * @param {string} message - 日志消息
     * @param {*} [data] - 附加数据
     */
    warn(message, data) {
        if (this.shouldLog(LogLevel.WARN)) {
            this.log('warn', message, data);
        }
    }

    /**
     * 记录错误信息
     * @param {string} message - 日志消息
     * @param {Error|*} [error] - 错误对象或附加数据
     */
    error(message, error) {
        if (this.shouldLog(LogLevel.ERROR)) {
            this.log('error', message, error);
        }
    }

    /**
     * 记录日志
     * @private
     * @param {LogLevel} level - 日志级别
     * @param {string} message - 日志消息
     * @param {*} [data] - 附加数据
     */
    log(level, message, data) {
        const logEntry = {
            timestamp: new Date().toISOString(),
            level,
            message,
            data: data || null
        };

        // 添加到日志数组
        this.logs.push(logEntry);
        if (this.logs.length > this.maxLogs) {
            this.logs.shift();
        }

        // 控制台输出
        const consoleMethod = console[level] || console.log;
        if (data) {
            consoleMethod(`[${level.toUpperCase()}] ${message}`, data);
        } else {
            consoleMethod(`[${level.toUpperCase()}] ${message}`);
        }
    }

    /**
     * 判断是否应该记录该级别的日志
     * @private
     * @param {LogLevel} level - 日志级别
     * @returns {boolean} 是否应该记录
     */
    shouldLog(level) {
        const levels = Object.values(LogLevel);
        return levels.indexOf(level) >= levels.indexOf(this.level);
    }

    /**
     * 获取所有日志
     * @returns {Array} 日志数组
     */
    getLogs() {
        return this.logs;
    }

    /**
     * 清除日志
     */
    clearLogs() {
        this.logs = [];
    }

    /**
     * 导出日志
     * @returns {string} JSON格式的日志
     */
    exportLogs() {
        return JSON.stringify(this.logs, null, 2);
    }

    /**
     * 获取指定级别的日志
     * @param {LogLevel} level - 日志级别
     * @returns {Array} 过滤后的日志数组
     */
    getLogsByLevel(level) {
        return this.logs.filter(log => log.level === level);
    }

    /**
     * 获取指定时间范围的日志
     * @param {Date} startTime - 开始时间
     * @param {Date} endTime - 结束时间
     * @returns {Array} 过滤后的日志数组
     */
    getLogsByTimeRange(startTime, endTime) {
        return this.logs.filter(log => {
            const logTime = new Date(log.timestamp);
            return logTime >= startTime && logTime <= endTime;
        });
    }

    /**
     * 搜索日志
     * @param {string} keyword - 搜索关键词
     * @returns {Array} 匹配的日志数组
     */
    searchLogs(keyword) {
        const searchTerm = keyword.toLowerCase();
        return this.logs.filter(log => 
            log.message.toLowerCase().includes(searchTerm) ||
            (log.data && JSON.stringify(log.data).toLowerCase().includes(searchTerm))
        );
    }
}

// 创建全局日志记录器实例
export const logger = new Logger(); 