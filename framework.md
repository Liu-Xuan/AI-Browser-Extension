# 项目框架说明

## 项目概述
这是一个浏览器插件，用于管理和访问 RAGFlow 知识库。插件提供了文件管理和智能对话两个主要功能区域。

## 技术架构

### 1. 浏览器插件架构
- 使用 Chrome Extension Manifest V3
- 采用侧边栏模式（Side Panel）展示界面
- 使用原生 JavaScript 实现功能
- 使用 HTML5 + CSS3 构建用户界面

### 2. 文件系统
- 文件管理模块
  - 显示知识库文件列表
  - 支持文件上传功能
  - 文件信息展示（名称、大小、日期）

### 3. API 集成
- RAGFlow HTTP API 集成
  - 知识库管理
  - 文件上传和管理
  - 智能对话功能

### 4. 用户界面
- 响应式布局设计
  - 文件列表区域（上方）
  - RAGFlow Chat 对话区域（下方）
- 现代化 UI 设计
  - 动画效果
  - 状态反馈
  - 错误提示

## 文件结构

### 主要文件
1. `manifest.json`
   - 插件配置文件
   - 定义权限和功能

2. `panel.html`
   - 侧边栏主页面
   - 定义页面结构
   - 集成样式和脚本

3. `panel.css`
   - 样式定义文件
   - 实现响应式布局
   - 定义视觉效果

4. `panel.js`
   - 主要功能实现
   - API 调用处理
   - 用户交互逻辑

## 功能模块

### 1. 文件管理模块
```javascript
// 状态管理
const state = {
    files: [],      // 存储文件列表
    datasetId: null // 存储知识库ID
};

// 主要功能
- 获取知识库ID
- 获取文件列表
- 上传文件
- 显示文件信息
```

### 2. API 通信模块
```javascript
// API 配置
const RAGFLOW_CONFIG = {
    API_KEY: '...',
    BASE_URL: '...',
    DATASET_NAME: '...'
};

// 主要功能
- 知识库连接
- 文件上传请求
- 错误处理
```

### 3. 用户界面模块
```html
<!-- 主要结构 -->
<div class="container">
    <!-- 文件列表区域 -->
    <div class="file-list-section">
        <!-- 文件管理界面 -->
    </div>
    
    <!-- 聊天窗口区域 -->
    <div class="iframe-container">
        <!-- RAGFlow Chat 嵌入 -->
    </div>
</div>
```

## 数据流

1. 初始化流程
   - 加载插件 → 获取知识库ID → 获取文件列表 → 显示界面

2. 文件上传流程
   - 选择文件 → 上传到API → 更新文件列表 → 更新界面

3. 错误处理流程
   - 捕获错误 → 显示错误信息 → 提供重试选项 