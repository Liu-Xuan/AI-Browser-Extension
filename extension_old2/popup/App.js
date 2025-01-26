import React from 'react';
import { Box } from '@mui/material';
import TempKnowledgePanel from './components/TempKnowledgePanel';

const App = () => {
    return (
        <Box sx={{ 
            width: '100%', 
            height: '100vh',
            display: 'flex',
            flexDirection: 'column',
            overflow: 'hidden'
        }}>
            {/* 临时知识库面板 */}
            <Box sx={{ p: 2 }}>
                <TempKnowledgePanel />
            </Box>
            
            {/* 聊天面板 */}
            <Box sx={{ 
                flex: 1,
                minHeight: 0,
                border: 'none'
            }}>
                <iframe
                    src={`http://172.19.12.146:8888/chat/share?shared_id=e4021ad6d94911ef9e010242ac120005&from=agent&auth=RkOWJkMGYyZDFhZTExZWZhYmRmMDI0Mm`}
                    style={{
                        width: '100%',
                        height: '100%',
                        border: 'none'
                    }}
                    title="RAGflow Chat"
                />
            </Box>
        </Box>
    );
};

export default App; 