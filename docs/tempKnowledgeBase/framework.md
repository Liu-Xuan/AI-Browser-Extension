# Simple Browser Extension Framework

## 项目架构

### 目录结构
```
simple-browser-extension/
├── manifest/
│   └── manifest.json      # 扩展配置文件
├── panel/
│   └── panel.html        # 侧边栏HTML
├── scripts/
│   └── panel.js         # 侧边栏脚本
├── styles/
│   └── panel.css        # 侧边栏样式
└── assets/             # 图标资源
    ├── icon16.png
    ├── icon48.png
    └── icon128.png
```

### 核心功能模块
1. 文件管理
   - 文件上传
   - 文件列表显示
   - 文件删除
2. RAGflow集成
   - iframe嵌入
   - 界面交互

### 技术栈
- Frontend:
  - HTML5
  - CSS3
  - JavaScript
- Browser API:
  - Chrome Extension API
  - Side Panel API
- Backend Integration:
  - RAGFlow API

### 组件说明
1. 侧边栏面板
   - 文件列表管理
   - RAGflow Chat iframe集成

2. 文件管理
   - 文件上传功能
   - 文件列表显示
   - 文件删除功能

### 通信流程
1. 用户界面 -> RAGFlow API
   - 文件上传
   - 文件删除
2. RAGFlow API -> 用户界面
   - 操作结果反馈

### 设计特点
1. 简单性
   - 最小化功能集
   - 清晰的界面结构
   - 直观的用户交互
2. 可扩展性
   - 模块化设计
   - 清晰的代码结构
   - 易于添加新功能 