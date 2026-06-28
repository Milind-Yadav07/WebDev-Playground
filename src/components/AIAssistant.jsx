import React, { useState, useRef, useEffect } from 'react';
import { FaPaperPlane, FaRobot, FaUser, FaSpinner, FaHistory, FaPlus, FaTrash } from 'react-icons/fa';
import { useEditor } from '../context/EditorContext';
import { BASE_URL } from '../api/config';

const AIAssistant = () => {
    const { html, setHtml, css, setCss, js, setJs, messages, setMessages, theme } = useEditor();
    const [input, setInput] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [isHistoryOpen, setIsHistoryOpen] = useState(false);
    const [history, setHistory] = useState([]);
    const [currentChatId, setCurrentChatId] = useState(null);
    const messagesEndRef = useRef(null);

    const API_URL = `${BASE_URL}/api/chats`;

    // Load history from MongoDB on mount
    useEffect(() => {
        const fetchHistory = async () => {
            try {
                const response = await fetch(API_URL);
                const data = await response.json();
                setHistory(data);
            } catch (err) {
                console.error("Failed to fetch history:", err);
            }
        };
        fetchHistory();
    }, []);

    const loadHistoryChat = (chat) => {
        setMessages(chat.messages);
        setCurrentChatId(chat._id);
        setIsHistoryOpen(false);
    };

    const deleteHistoryChat = async (e, id) => {
        e.stopPropagation();
        try {
            await fetch(`${API_URL}/${id}`, { method: 'DELETE' });
            setHistory(prev => prev.filter(chat => chat._id !== id));
            if (currentChatId === id) {
                createNewChat();
            }
        } catch (err) {
            console.error("Failed to delete chat:", err);
        }
    };
    const saveToHistory = async (msgs) => {
        if (msgs.length <= 1) return;
        
        const userFirstMsg = msgs.find(m => m.sender === 'user')?.text || 'New Chat';
        const title = userFirstMsg.length > 30 ? userFirstMsg.substring(0, 30) + '...' : userFirstMsg;

        try {
            const response = await fetch(API_URL, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    id: currentChatId,
                    title,
                    messages: msgs
                })
            });
            const savedChat = await response.json();
            
            if (!currentChatId) {
                setCurrentChatId(savedChat._id);
                setHistory(prev => [savedChat, ...prev]);
            } else {
                setHistory(prev => prev.map(chat => 
                    chat._id === savedChat._id ? savedChat : chat
                ));
            }
        } catch (err) {
            console.error("Failed to save to history:", err);
        }
    };

    const createNewChat = () => {
        setMessages([{ id: Date.now(), text: "Hello! I'm Myra, your AI Assistant. How can I help you today?", sender: 'ai' }]);
        setCurrentChatId(null);
        setIsHistoryOpen(false);
    };

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    };

    useEffect(() => {
        scrollToBottom();
    }, [messages]);

    const updatePlaygroundCode = (text) => {
        const extractBlock = (regex) => {
            const match = text.match(regex);
            return (match && match[1]) ? match[1].trim() : null;
        };

        const newHtml = extractBlock(/```html\s*([\s\S]*?)(?:```|$)/i);
        const newCss = extractBlock(/```(?:css|style)\s*([\s\S]*?)(?:```|$)/i);
        const newJs = extractBlock(/```(?:js|javascript|jsx)\s*([\s\S]*?)(?:```|$)/i);

        if (newHtml !== null) setHtml(newHtml);
        if (newCss !== null) setCss(newCss);
        if (newJs !== null) setJs(newJs);
    };


    const handleSend = async (e) => {
        e.preventDefault();
        if (!input.trim() || isLoading) return;

        const userMsgText = input;
        const userMsg = { id: Date.now(), text: userMsgText, sender: 'user' };
        const newMsgs = [...messages, userMsg];
        setMessages(newMsgs);
        setInput('');
        setIsLoading(true);

        const aiMsgId = Date.now() + 1;
        setMessages(prev => [...prev, { id: aiMsgId, text: '', sender: 'ai' }]);

        try {
            const response = await fetch(`${BASE_URL}/api/ai/chat`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    messages: messages,
                    html,
                    css,
                    js,
                    userMsgText
                })
            });

            if (!response.ok) {
                throw new Error(`Server responded with status ${response.status}`);
            }

            const reader = response.body.getReader();
            const decoder = new TextDecoder();
            let buffer = '';
            let fullText = '';

            while (true) {
                const { value, done } = await reader.read();
                if (done) break;

                buffer += decoder.decode(value, { stream: true });
                const lines = buffer.split('\n');
                buffer = lines.pop() || '';

                for (const line of lines) {
                    const trimmed = line.trim();
                    if (trimmed.startsWith('data: ')) {
                        try {
                            const data = JSON.parse(trimmed.slice(6));
                            if (data.error) {
                                throw new Error(data.error);
                            }
                            if (data.text) {
                                fullText += data.text;
                                setMessages(prev => prev.map(msg => 
                                    msg.id === aiMsgId ? { ...msg, text: fullText } : msg
                                ));
                            }
                        } catch (e) {
                            console.error("SSE chunk parse error:", e);
                        }
                    }
                }
            }

            const finalTrimmed = buffer.trim();
            if (finalTrimmed.startsWith('data: ')) {
                try {
                    const data = JSON.parse(finalTrimmed.slice(6));
                    if (data.error) throw new Error(data.error);
                    if (data.text) {
                        fullText += data.text;
                        setMessages(prev => prev.map(msg => 
                            msg.id === aiMsgId ? { ...msg, text: fullText } : msg
                        ));
                    }
                } catch (e) {
                    console.error("SSE final chunk parse error:", e);
                }
            }

            if (!fullText) throw new Error("Empty response from AI");

            const updatedMsgs = [...newMsgs, { id: aiMsgId, text: fullText, sender: 'ai' }];
            saveToHistory(updatedMsgs);
            updatePlaygroundCode(fullText);
        } catch (error) {
            console.error("AI Assistant Error:", error);
            let userErrorMessage = "Sorry, I encountered an error. This might be due to safety filters or a connection timeout.";
            
            if (error.message?.includes("safety")) {
                userErrorMessage = "The AI response was stopped by safety filters. Try rephrasing your request.";
            } else if (error.message) {
                userErrorMessage = `Error: ${error.message}`;
            }

            const errorMsg = { id: Date.now() + 2, text: userErrorMessage, sender: 'ai' };
            setMessages(prev => [...prev, errorMsg]);
        } finally {
            setIsLoading(false);
        }
    };


    const clearChat = () => {
        if (messages.length <= 1) return;
        createNewChat();
    };


    return (
        <div className="ai-assistant-wrapper">
            {/* History Sidebar Overlay */}
            <div className={`ai-history-sidebar ${isHistoryOpen ? 'open' : ''}`}>
                <div className="ai-history-header">
                    <h3 className="ai-history-title">Recent Chats</h3>
                    <button 
                        onClick={() => setIsHistoryOpen(false)} 
                        className="ai-history-close"
                    >
                        <FaPlus style={{ transform: 'rotate(45deg)', fontSize: '1.2rem' }} />
                    </button>
                </div>

                <button 
                    onClick={createNewChat} 
                    className="ai-new-chat-btn"
                >
                    <FaPlus size={14} /> New Conversation
                </button>

                <div className="ai-history-list">
                    {history.length === 0 ? (
                        <div className="ai-history-empty">
                            <FaHistory size={32} />
                            <p>Your chat history will appear here.</p>
                        </div>
                    ) : (
                        history.map(chat => (
                            <div 
                                key={chat._id} 
                                onClick={() => loadHistoryChat(chat)}
                                className={`ai-history-item ${currentChatId === chat._id ? 'active' : ''}`}
                            >
                                <div className="ai-history-item-title">
                                    {chat.title}
                                </div>
                                <button 
                                    onClick={(e) => deleteHistoryChat(e, chat._id)}
                                    className="ai-history-delete-btn"
                                >
                                    <FaTrash size={12} />
                                </button>
                            </div>
                        ))
                    )}
                </div>
            </div>

            {/* Header */}
            <div className="ai-assistant-header">
                <div className="ai-header-brand">
                    <FaRobot style={{ color: 'var(--primary-color)', fontSize: '1.1rem' }} />
                    <h3 className="ai-header-title">AI Assistant</h3>
                </div>
                
                <div className="ai-header-actions">
                    <button 
                        onClick={() => setIsHistoryOpen(true)}
                        className="ai-header-btn"
                        title="Chat History"
                    >
                        <FaHistory />
                    </button>

                    <button 
                        onClick={createNewChat}
                        className="ai-header-btn-new"
                        title="Start a New Conversation"
                    >
                        <FaPlus size={10} />
                        New Chat
                    </button>
                </div>
            </div>

            {/* Messages */}
            <div className="ai-messages">
                {messages.map((msg) => (
                    <div 
                        key={msg.id}
                        className={`ai-message-row ${msg.sender === 'user' ? 'user' : 'ai'}`}
                    >
                        <div className="ai-message-avatar">
                            {msg.sender === 'user' ? <FaUser /> : <FaRobot />}
                        </div>
                        <div className="ai-message-bubble">
                            {msg.text}
                        </div>
                    </div>
                ))}
                {isLoading && (
                    <div className="ai-thinking-row">
                        <div className="ai-message-avatar">
                            <FaSpinner style={{ animation: 'spin 1s linear infinite' }} />
                        </div>
                        <span className="ai-thinking-text">AI is thinking...</span>
                    </div>
                )}
                <div ref={messagesEndRef} />
            </div>

            {/* Input Form */}
            <form onSubmit={handleSend} className="ai-input-form">
                <input 
                    type="text"
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    placeholder={isLoading ? "Generating..." : "Ask AI to code..."}
                    disabled={isLoading}
                    className="ai-chat-input"
                />
                <button 
                    type="submit"
                    disabled={isLoading}
                    className="ai-send-btn"
                >
                    {isLoading ? <FaSpinner style={{ animation: 'spin 1s linear infinite' }} /> : <FaPaperPlane />}
                </button>
            </form>
        </div>
    );
};

export default AIAssistant;
