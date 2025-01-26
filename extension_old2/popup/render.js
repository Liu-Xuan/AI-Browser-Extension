// React 组件渲染
const container = document.getElementById('document-list');
ReactDOM.render(
    React.createElement('div', { className: 'app-container' },
        React.createElement(DocumentList)
    ),
    container
); 