# AI Browser Extension

一个基于 AI 的浏览器扩展，用于文本处理和知识管理。

## 功能特性

### 1. 智能助手
- 文本摘要生成
- 文本翻译
- 智能问答
- Agent 调用

### 2. 知识库管理
- 知识库创建和删除
- 文档添加和删除
- 文档树形展示
- 实时刷新

### 3. 工具箱
- PDF 解析工具
  - 文本提取
  - 元数据解析
  - 大纲提取
- 智能搜索（待实现）
- TDMS 助手（待实现）
- LCM 助手（待实现）
- 数据分析（待实现）
- 格式转换（待实现）

## 安装说明

1. 克隆仓库：
```bash
git clone https://github.com/yourusername/AI-Browser-Extension.git
```

2. 在 Chrome 浏览器中：
   - 打开 `chrome://extensions/`
   - 启用"开发者模式"
   - 点击"加载已解压的扩展程序"
   - 选择项目中的 `extension` 目录

## 使用说明

### 智能助手
1. 点击扩展图标打开弹出窗口
2. 选中网页文本后可以：
   - 点击"生成摘要"生成文本摘要
   - 点击"翻译选中文本"进行翻译
3. 在侧边栏中可以：
   - 选择不同的 Agent 进行对话
   - 使用当前页面作为上下文进行问答

### 知识库管理
1. 在侧边栏的"知识库"标签页中：
   - 创建/删除知识库
   - 添加当前页面到知识库
   - 删除选中的文档
   - 浏览知识库文档树

### PDF 工具
1. 在侧边栏的"工具箱"标签页中：
   - 选择"PDF 解析"工具
   - 点击"解析当前 PDF"按钮
   - 查看解析结果，包括元数据、大纲和内容

## 开发说明

### 目录结构
```
extension/
├── manifest.json      # 扩展配置文件
├── background.js      # 后台服务脚本
├── sidepanel.js      # 侧边栏脚本
├── sidepanel.html    # 侧边栏界面
├── popup.js          # 弹出窗口脚本
├── popup.html        # 弹出窗口界面
├── content_script.js # 内容注入脚本
├── tools/           # 工具模块目录
│   └── pdf/         # PDF 工具模块
│       ├── ui.js
│       ├── parser.js
│       └── content-script.js
└── lib/             # 第三方库
    ├── pdf.min.js
    └── pdf.worker.min.js
```

### API 集成
- RAGFlow API: 用于知识库管理和 Agent 调用
- Ollama API: 用于文本处理和智能对话

## 贡献指南

1. Fork 本仓库
2. 创建特性分支：`git checkout -b feature/AmazingFeature`
3. 提交更改：`git commit -m 'Add some AmazingFeature'`
4. 推送分支：`git push origin feature/AmazingFeature`
5. 提交 Pull Request

## 许可证

本项目采用 MIT 许可证 - 详见 [LICENSE](LICENSE) 文件 