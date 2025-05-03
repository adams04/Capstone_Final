import React, { useState } from 'react';
import { FiZap, FiSend, FiCheckSquare, FiUsers } from 'react-icons/fi';

const AIChatBot = ({ 
  onGenerateTasks, 
  onGenerateStandup, 
  messages = { 
    tasks: [
      { text: "Hello! I'm your AI Task Generator. Describe the project you need done.", sender: 'bot' }
    ],
    standup: [
      { text: "Hi! I'm your Standup Generator. I'll help you summarize your daily progress.", sender: 'bot' }
    ] 
  },
  setMessages 
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [activeChat, setActiveChat] = useState('tasks');
  const [newMessage, setNewMessage] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);

  const handleSendMessage = async () => {
    if (activeChat === 'tasks' && !newMessage.trim()) return;
  
    try {
      setIsGenerating(true);
  
      if (activeChat === 'tasks') {
        setMessages(prev => ({
          ...prev,
          tasks: [...prev.tasks, { text: newMessage, sender: 'user' }]
        }));
        setNewMessage('');
        await onGenerateTasks(newMessage);
      } else {    
        await onGenerateStandup();
      }
    } catch (error) {
      setMessages(prev => {
        const updatedStandup = [...prev.standup];
        if (updatedStandup.length > 0 && 
            updatedStandup[updatedStandup.length - 1].text.includes("Generating")) {
          updatedStandup.pop();
        }
        return {
          ...prev,
          standup: [...updatedStandup, { 
            text: "Sorry, something went wrong. Please try again.", 
            sender: 'bot' 
          }]
        };
      });
    } finally {
      setIsGenerating(false);
    }
  };

  const switchChat = (chatType) => {
    if (!isGenerating) {
      setActiveChat(chatType);
    }
  };

  return (
    <div className="ai-chatbot-container">
      <button 
        className="ai-thunder-button"
        onClick={() => setIsOpen(!isOpen)}
        aria-label="AI Assistant"
      >
        <FiZap size={24} />
      </button>

      {isOpen && (
        <div className="ai-chat-window">
          <div className="ai-chat-header">
            <h3>AI Assistant</h3>
            <button onClick={() => setIsOpen(false)} aria-label="Close chat">
              ×
            </button>
          </div>
          
          <div className="ai-chat-selector">
            <button
              className={`ai-chat-option ${activeChat === 'tasks' ? 'active' : ''}`}
              onClick={() => switchChat('tasks')}
            >
              <FiCheckSquare /> Task Generator
            </button>
            <button
              className={`ai-chat-option ${activeChat === 'standup' ? 'active' : ''}`}
              onClick={() => switchChat('standup')}
            >
              <FiUsers /> Standup Generator
            </button>
          </div>
          
          <div className="ai-messages-container">
            {messages[activeChat].map((msg, index) => (
              <div 
                key={index} 
                className={`ai-message ${msg.sender}`}
              >
                {msg.text.split('\n').map((line, i) => (
                  <React.Fragment key={i}>
                    {line}
                    <br />
                  </React.Fragment>
                ))}
              </div>
            ))}
          </div>
          
          {activeChat === 'tasks' ? (
            <div className="ai-input-container">
              <input
                type="text"
                value={newMessage}
                onChange={(e) => setNewMessage(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && handleSendMessage()}
                aria-label="Type your message"
                placeholder="Describe your project..."
              />
              <button 
                onClick={handleSendMessage}
                disabled={!newMessage.trim()}
                aria-label="Send message"
              >
                <FiSend />
              </button>
            </div>
          ) : (
            <div className="ai-standup-generator-container">
              <button
                className="ai-standup-generator-button"
                onClick={handleSendMessage}
                disabled={isGenerating}
              >
                {isGenerating ? 'Generating Standup...' : 'Generate My Standup'}
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default AIChatBot;