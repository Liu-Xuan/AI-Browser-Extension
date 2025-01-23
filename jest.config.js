module.exports = {
    // 测试环境
    testEnvironment: 'jsdom',
    
    // 测试文件匹配模式
    testMatch: [
        '**/tests/**/*.test.js'
    ],
    
    // 模块文件扩展名
    moduleFileExtensions: ['js', 'json'],
    
    // 模块名称映射
    moduleNameMapper: {
        '^@/(.*)$': '<rootDir>/extension/$1'
    },
    
    // 测试覆盖率配置
    collectCoverage: true,
    coverageDirectory: 'coverage',
    coverageReporters: ['text', 'lcov'],
    collectCoverageFrom: [
        'extension/**/*.js',
        '!extension/tests/**',
        '!**/node_modules/**'
    ],
    
    // 在每个测试文件之前运行的设置文件
    setupFilesAfterEnv: ['<rootDir>/jest.setup.js'],
    
    // 转换器配置
    transform: {
        '^.+\\.js$': 'babel-jest'
    },
    
    // 不需要转换的依赖
    transformIgnorePatterns: [
        '/node_modules/',
        '\\.pnp\\.[^\\/]+$'
    ],
    
    // 测试超时设置（默认5秒）
    testTimeout: 10000
}; 