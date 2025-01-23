import { apiClient } from '../core/api.js';
import { KnowledgeBase } from './components/knowledge-base.js';
import { Chat } from './components/chat.js';
import { Toolbox } from './components/toolbox.js';
import { logger } from '../core/logger.js';

class SidePanel {
    constructor() {
        this.elements = {};
        this.components = {};
        logger.info('Initializing SidePanel...');
    }

    async initialize() {
        try {
            await this.initializeElements();
            await this.bindTabEvents();
            await this.initializeComponents();
            await this.activateDefaultTab();
            logger.info('SidePanel initialized successfully');
        } catch (error) {
            logger.error('Failed to initialize SidePanel:', error);
            console.error('初始化失败:', error);
        }
    }

    async initializeElements() {
        logger.debug('Initializing DOM elements...');
        
        // Tab elements
        this.elements.tabs = document.querySelectorAll('.tab');
        this.elements.tabContents = document.querySelectorAll('.tab-content');
        
        // Chat elements
        this.elements.chatContent = document.getElementById('chat');
        this.elements.agentSelect = document.getElementById('agentSelect');
        this.elements.btnUseContext = document.getElementById('btnUseContext');
        this.elements.chatMessages = document.getElementById('chatMessages');
        this.elements.chatInput = document.getElementById('chatInput');
        this.elements.btnSend = document.getElementById('btnSend');
        this.elements.btnClear = document.getElementById('btnClear');
        this.elements.loadingIndicator = document.getElementById('loadingIndicator');
        
        // Knowledge base elements
        this.elements.knowledgeContent = document.getElementById('knowledge');
        this.elements.btnCreateDataset = document.getElementById('btnCreateDataset');
        this.elements.btnDeleteDataset = document.getElementById('btnDeleteDataset');
        this.elements.btnRefreshDatasets = document.getElementById('btnRefreshDatasets');
        this.elements.kbList = document.getElementById('kbList');
        this.elements.kbDocs = document.getElementById('kbDocs');
        
        // Tools elements
        this.elements.toolsContent = document.getElementById('tools');
        this.elements.toolContent = document.getElementById('toolContent');
        this.elements.output = document.getElementById('output');

        // Verify critical elements
        const criticalElements = [
            'chatContent',
            'agentSelect',
            'chatMessages',
            'chatInput',
            'btnSend',
            'knowledgeContent',
            'kbList',
            'kbDocs',
            'toolsContent',
            'toolContent'
        ];

        for (const elementName of criticalElements) {
            if (!this.elements[elementName]) {
                logger.warn(`Critical element not found: ${elementName}`);
                console.warn(`未找到关键元素: ${elementName}`);
            }
        }

        logger.debug('DOM elements initialized');
    }

    async bindTabEvents() {
        logger.debug('Binding tab events...');
        
        this.elements.tabs.forEach(tab => {
            tab.addEventListener('click', () => {
                const tabId = tab.getAttribute('data-tab');
                logger.debug(`Tab clicked: ${tabId}`);
                this.activateTab(tabId);
            });
        });

        logger.debug('Tab events bound successfully');
    }

    async initializeComponents() {
        logger.debug('Initializing components...');
        
        // Initialize Chat component
        this.components.chat = new Chat(this.elements);
        
        // Initialize KnowledgeBase component
        this.components.knowledgeBase = new KnowledgeBase(this.elements);
        
        // Initialize Toolbox component
        this.components.toolbox = new Toolbox(this.elements);

        logger.debug('Components initialized');
    }

    activateTab(tabId) {
        logger.debug(`Activating tab: ${tabId}`);
        
        // Remove active class from all tabs and contents
        this.elements.tabs.forEach(tab => tab.classList.remove('active'));
        this.elements.tabContents.forEach(content => content.classList.remove('active'));
        
        // Add active class to selected tab and content
        const selectedTab = Array.from(this.elements.tabs).find(tab => tab.getAttribute('data-tab') === tabId);
        const selectedContent = document.getElementById(tabId);
        
        if (selectedTab && selectedContent) {
            selectedTab.classList.add('active');
            selectedContent.classList.add('active');
            
            // Load specific content based on tab
            switch (tabId) {
                case 'chat':
                    logger.debug('Initializing chat...');
                    this.components.chat.initialize();
                    break;
                case 'knowledge':
                    logger.debug('Loading knowledge base...');
                    this.components.knowledgeBase.loadDatasets();
                    break;
                case 'tools':
                    logger.debug('Initializing toolbox...');
                    this.components.toolbox.initialize();
                    break;
            }
        } else {
            logger.warn(`Tab or content not found: ${tabId}`);
        }
    }

    activateDefaultTab() {
        const defaultTab = 'chat';
        this.activateTab(defaultTab);
    }
}

// Initialize when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    logger.info('DOM loaded, initializing SidePanel...');
    const sidePanel = new SidePanel();
    sidePanel.initialize();
}); 