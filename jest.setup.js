// 添加自定义匹配器
expect.extend({
    toBeWithinRange(received, floor, ceiling) {
        const pass = received >= floor && received <= ceiling;
        if (pass) {
            return {
                message: () => `expected ${received} not to be within range ${floor} - ${ceiling}`,
                pass: true,
            };
        } else {
            return {
                message: () => `expected ${received} to be within range ${floor} - ${ceiling}`,
                pass: false,
            };
        }
    },
});

// 模拟浏览器环境
global.chrome = {
    runtime: {
        sendMessage: jest.fn(),
        onMessage: {
            addListener: jest.fn(),
            removeListener: jest.fn()
        }
    },
    tabs: {
        query: jest.fn(),
        sendMessage: jest.fn(),
        create: jest.fn(),
        update: jest.fn()
    },
    storage: {
        local: {
            get: jest.fn(),
            set: jest.fn()
        }
    }
};

// 模拟 fetch
global.fetch = jest.fn();

// 模拟 FormData
global.FormData = class FormData {
    constructor() {
        this.data = {};
    }
    append(key, value) {
        this.data[key] = value;
    }
    get(key) {
        return this.data[key];
    }
};

// 模拟 File
global.File = class File {
    constructor(bits, name, options = {}) {
        this.bits = bits;
        this.name = name;
        this.type = options.type || '';
        this.size = bits.length;
    }
};

// 清除所有模拟的计时器
afterEach(() => {
    jest.clearAllTimers();
}); 