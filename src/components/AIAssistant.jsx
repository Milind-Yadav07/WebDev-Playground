import React, { useState, useRef, useEffect } from 'react';
import { FaPaperPlane, FaRobot, FaUser, FaSpinner, FaHistory, FaPlus, FaTrash } from 'react-icons/fa';
import { ChatGoogleGenerativeAI } from "@langchain/google-genai";
import { SystemMessage, HumanMessage, AIMessage } from "@langchain/core/messages";
import { useEditor } from '../context/EditorContext';

const AIAssistant = () => {
    const { html, setHtml, css, setCss, js, setJs, messages, setMessages, theme } = useEditor();
    const [input, setInput] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [isHistoryOpen, setIsHistoryOpen] = useState(false);
    const [history, setHistory] = useState([]);
    const [currentChatId, setCurrentChatId] = useState(null);
    const messagesEndRef = useRef(null);

    const API_URL = 'http://localhost:5000/api/chats';

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


    // Restore missing AI configuration
    const apiKey = import.meta.env.VITE_GEMINI_API_KEY;
    const modelName = import.meta.env.VITE_GEMINI_MODEL || "gemini-3-flash-preview";
    const isApiKeyValid = apiKey && apiKey !== "YOUR_API_KEY_HERE";

    const getChatModel = () => {
        if (!isApiKeyValid) return null;
        try {
            return new ChatGoogleGenerativeAI({
                apiKey: apiKey,
                model: modelName || "gemini-1.5-flash",
                modelName: modelName || "gemini-1.5-flash",
                maxOutputTokens: 4096,
                temperature: 0.7,
                safetySettings: [
                    { category: "HARM_CATEGORY_HARASSMENT", threshold: "BLOCK_NONE" },
                    { category: "HARM_CATEGORY_HATE_SPEECH", threshold: "BLOCK_NONE" },
                    { category: "HARM_CATEGORY_SEXUALLY_EXPLICIT", threshold: "BLOCK_NONE" },
                    { category: "HARM_CATEGORY_DANGEROUS_CONTENT", threshold: "BLOCK_NONE" },
                ],
            });
        } catch (err) {
            console.error("Failed to initialize ChatGoogleGenerativeAI:", err);
            return null;
        }
    };


    const systemInstruction = `You are a world-class senior developer helping the user in a live code playground.

    OUTPUT RULES:
    1. FOR WEBSITE/UI REQUESTS: You MUST provide ALL THREE BLOCKS: \`\`\`html, \`\`\`css, AND \`\`\`js.
    2. FOR LOGIC/DSA QUESTIONS: Provide ONLY the JavaScript block (\`\`\`js\`).
    
    GENERAL GUIDELINES:
    - Always provide the full code within the block(s).
    - Briefly explain your logic.
    - Wrap code in triple backticks.`;

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

        if (!isApiKeyValid) {
            setMessages(prev => [...prev, { 
                id: Date.now(), 
                text: "API Key is missing or invalid. Please check your .env file.", 
                sender: 'ai' 
            }]);
            return;
        }

        const userMsgText = input;
        const userMsg = { id: Date.now(), text: userMsgText, sender: 'user' };
        const newMsgs = [...messages, userMsg];
        setMessages(newMsgs);
        setInput('');
        setIsLoading(true);

        try {
            const chatModel = getChatModel();
            if (!chatModel) throw new Error("Could not initialize model");

            const langchainMessages = [new SystemMessage(systemInstruction)];
            messages.slice(-5).forEach(m => {
                if (m.sender === 'user') langchainMessages.push(new HumanMessage(m.text));
                else if (m.sender === 'ai') langchainMessages.push(new AIMessage(m.text));
            });

            const contextualPrompt = `CURRENT CODE IN EDITOR:
--- HTML ---
${html}
--- CSS ---
${css}
--- JS ---
${js}
USER REQUEST: ${userMsgText}
INSTRUCTION: Update the code. You MUST provide the updated HTML, CSS, and JS blocks.`;

            langchainMessages.push(new HumanMessage(contextualPrompt));

            const aiMsgId = Date.now() + 1;
            setMessages(prev => [...prev, { id: aiMsgId, text: '', sender: 'ai' }]);
            
            const stream = await chatModel.stream(langchainMessages);
            let fullText = '';

            for await (const chunk of stream) {
                if (chunk && chunk.content) {
                    fullText += chunk.content;
                    setMessages(prev => prev.map(msg => 
                        msg.id === aiMsgId ? { ...msg, text: fullText } : msg
                    ));
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
        <div className="ai-assistant-wrapper" style={{
            display: 'flex',
            flexDirection: 'column',
            height: '100%',
            backgroundColor: 'var(--editor-bg)',
            color: 'var(--text-color)',
            fontFamily: 'inherit',
            position: 'relative',
            overflow: 'hidden'
        }}>
            {/* History Sidebar Overlay */}
            <div className="ai-history-sidebar" style={{
                position: 'absolute',
                top: 0,
                left: isHistoryOpen ? 0 : '-100%',
                width: '100%',
                height: '100%',
                backgroundColor: 'var(--bg-color)',
                zIndex: 100,
                transition: 'left 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                display: 'flex',
                flexDirection: 'column',
                borderRight: '1px solid var(--border-color)',
                boxShadow: isHistoryOpen ? '5px 0 15px rgba(0,0,0,0.1)' : 'none'
            }}>
                <div style={{ 
                    padding: '1rem', 
                    borderBottom: '1px solid var(--border-color)', 
                    display: 'flex', 
                    justifyContent: 'space-between', 
                    alignItems: 'center',
                    backgroundColor: 'var(--editor-bg)'
                }}>
                    <h3 style={{ margin: 0, fontSize: '0.95rem', fontWeight: '600' }}>Recent Chats</h3>
                    <button 
                        onClick={() => setIsHistoryOpen(false)} 
                        style={{ background: 'transparent', border: 'none', color: 'var(--secondary-color)', cursor: 'pointer', padding: '5px' }}
                    >
                        <FaPlus style={{ transform: 'rotate(45deg)', fontSize: '1.2rem' }} />
                    </button>
                </div>

                <button 
                    onClick={createNewChat} 
                    style={{ 
                        margin: '1rem', 
                        padding: '0.75rem', 
                        borderRadius: '10px', 
                        border: '1px dashed var(--primary-color)', 
                        background: 'rgba(37, 99, 235, 0.05)', 
                        color: 'var(--primary-color)', 
                        cursor: 'pointer', 
                        display: 'flex', 
                        alignItems: 'center', 
                        gap: '0.6rem', 
                        justifyContent: 'center',
                        fontWeight: '600',
                        fontSize: '0.85rem',
                        transition: 'all 0.2s'
                    }}
                    onMouseOver={(e) => e.currentTarget.style.background = 'rgba(37, 99, 235, 0.1)'}
                    onMouseOut={(e) => e.currentTarget.style.background = 'rgba(37, 99, 235, 0.05)'}
                >
                    <FaPlus size={14} /> New Conversation
                </button>

                <div style={{ flex: 1, overflowY: 'auto', padding: '0 1rem 1rem' }}>
                    {history.length === 0 ? (
                        <div style={{ textAlign: 'center', color: 'var(--secondary-color)', marginTop: '3rem' }}>
                            <FaHistory size={32} style={{ opacity: 0.2, marginBottom: '1rem' }} />
                            <p style={{ fontSize: '0.85rem' }}>Your chat history will appear here.</p>
                        </div>
                    ) : (
                        history.map(chat => (
                            <div 
                                key={chat._id} 
                                onClick={() => loadHistoryChat(chat)}
                                style={{
                                    padding: '0.85rem',
                                    borderRadius: '12px',
                                    backgroundColor: currentChatId === chat.id ? 'var(--editor-bg)' : 'transparent',
                                    border: `1px solid ${currentChatId === chat.id ? 'var(--primary-color)' : 'transparent'}`,
                                    cursor: 'pointer',
                                    marginBottom: '0.6rem',
                                    display: 'flex',
                                    justifyContent: 'space-between',
                                    alignItems: 'center',
                                    transition: 'all 0.2s',
                                    group: 'history-item'
                                }}
                                onMouseOver={(e) => {
                                    if (currentChatId !== chat.id) e.currentTarget.style.backgroundColor = 'rgba(0,0,0,0.03)';
                                }}
                                onMouseOut={(e) => {
                                    if (currentChatId !== chat.id) e.currentTarget.style.backgroundColor = 'transparent';
                                }}
                            >
                                <div style={{ 
                                    overflow: 'hidden', 
                                    textOverflow: 'ellipsis', 
                                    whiteSpace: 'nowrap', 
                                    fontSize: '0.8rem', 
                                    flex: 1,
                                    color: currentChatId === chat.id ? 'var(--primary-color)' : 'var(--text-color)',
                                    fontWeight: currentChatId === chat.id ? '600' : '400'
                                }}>
                                    {chat.title}
                                </div>
                                <button 
                                    onClick={(e) => deleteHistoryChat(e, chat._id)}
                                    style={{ 
                                        background: 'transparent', 
                                        border: 'none', 
                                        color: 'var(--secondary-color)', 
                                        cursor: 'pointer', 
                                        padding: '4px',
                                        opacity: 0.6,
                                        transition: 'all 0.2s'
                                    }}
                                    onMouseOver={(e) => {
                                        e.currentTarget.style.color = '#ef4444';
                                        e.currentTarget.style.opacity = 1;
                                    }}
                                    onMouseOut={(e) => {
                                        e.currentTarget.style.color = 'var(--secondary-color)';
                                        e.currentTarget.style.opacity = 0.6;
                                    }}
                                >
                                    <FaTrash size={12} />
                                </button>
                            </div>
                        ))
                    )}
                </div>
            </div>

            {/* Header */}
            <div className="ai-assistant-header" style={{
                padding: '0.75rem',
                borderBottom: '1px solid var(--border-color)',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                backgroundColor: 'var(--bg-color)',
                flexShrink: 0
            }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                    <FaRobot style={{ color: 'var(--primary-color)', fontSize: '1.1rem' }} />
                    <h3 style={{ margin: 0, fontSize: '0.95rem', fontWeight: '600' }}>AI Assistant</h3>
                </div>
                
                <div style={{ display: 'flex', gap: '0.5rem' }}>
                    <button 
                        onClick={() => setIsHistoryOpen(true)}
                        style={{
                            background: 'transparent',
                            border: '1px solid var(--border-color)',
                            color: 'var(--text-color)',
                            cursor: 'pointer',
                            padding: '0.4rem 0.6rem',
                            borderRadius: '6px',
                            fontSize: '0.75rem',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '0.4rem',
                            transition: 'all 0.2s'
                        }}
                        onMouseOver={(e) => e.currentTarget.style.backgroundColor = 'var(--editor-bg)'}
                        onMouseOut={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                        title="Chat History"
                    >
                        <FaHistory />
                    </button>

                    <button 
                        onClick={createNewChat}
                        style={{
                            background: 'transparent',
                            border: `1px solid ${theme === 'light' ? '#000000' : '#ffffff'}`,
                            color: theme === 'light' ? '#000000' : '#ffffff',
                            cursor: 'pointer',
                            padding: '0.4rem 0.8rem',
                            borderRadius: '6px',
                            fontSize: '0.75rem',
                            fontWeight: '500',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '0.4rem',
                            transition: 'all 0.2s cubic-bezier(0.175, 0.885, 0.32, 1.275)',
                            whiteSpace: 'nowrap',
                            boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
                        }}
                        onMouseOver={(e) => {
                            e.currentTarget.style.transform = 'scale(1.05)';
                            e.currentTarget.style.boxShadow = '0 4px 8px rgba(0,0,0,0.15)';
                        }}
                        onMouseOut={(e) => {
                            e.currentTarget.style.transform = 'scale(1)';
                            e.currentTarget.style.boxShadow = '0 2px 4px rgba(0,0,0,0.1)';
                        }}
                        title="Start a New Conversation"
                    >
                        <FaPlus size={10} />
                        New Chat
                    </button>
                </div>
            </div>



            {/* Messages */}
            <div className="ai-messages" style={{
                flex: 1,
                overflowY: 'auto',
                padding: '1rem',
                display: 'flex',
                flexDirection: 'column',
                gap: '1rem',
                minHeight: 0
            }}>
                {messages.map((msg) => (
                    <div 
                        key={msg.id}
                        style={{
                            alignSelf: msg.sender === 'user' ? 'flex-end' : 'flex-start',
                            maxWidth: '92%',
                            display: 'flex',
                            gap: '0.6rem',
                            flexDirection: msg.sender === 'user' ? 'row-reverse' : 'row'
                        }}
                    >
                        <div style={{
                            width: '28px',
                            height: '28px',
                            borderRadius: '50%',
                            backgroundColor: msg.sender === 'user' ? '#3b82f6' : 'var(--primary-color)',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            color: 'white',
                            fontSize: '0.7rem',
                            flexShrink: 0
                        }}>
                            {msg.sender === 'user' ? <FaUser /> : <FaRobot />}
                        </div>
                        <div style={{
                            backgroundColor: msg.sender === 'user' ? '#3b82f6' : 'var(--bg-color)',
                            color: msg.sender === 'user' ? 'white' : 'var(--text-color)',
                            padding: '0.75rem 0.9rem',
                            borderRadius: '12px',
                            borderTopRightRadius: msg.sender === 'user' ? '2px' : '12px',
                            borderTopLeftRadius: msg.sender === 'ai' ? '2px' : '12px',
                            fontSize: '0.85rem',
                            lineHeight: '1.5',
                            boxShadow: '0 2px 4px rgba(0,0,0,0.05)',
                            border: msg.sender === 'ai' ? '1px solid var(--border-color)' : 'none',
                            whiteSpace: 'pre-wrap',
                            overflow: 'hidden',
                            wordBreak: 'break-word'
                        }}>
                            {msg.text}
                        </div>
                    </div>
                ))}
                {isLoading && (
                    <div style={{ alignSelf: 'flex-start', display: 'flex', gap: '0.6rem', alignItems: 'center', padding: '0.4rem 0.75rem' }}>
                        <div style={{
                            width: '28px',
                            height: '28px',
                            borderRadius: '50%',
                            backgroundColor: 'var(--primary-color)',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            color: 'white'
                        }}>
                            <FaSpinner style={{ animation: 'spin 1s linear infinite' }} />
                        </div>
                        <span style={{ fontSize: '0.8rem', color: 'var(--secondary-color)' }}>AI is thinking...</span>
                    </div>
                )}
                <div ref={messagesEndRef} />
            </div>

            {/* Input Form */}
            <form 
                onSubmit={handleSend}
                className="ai-input-form"
                style={{
                    padding: '0.75rem',
                    borderTop: '1px solid var(--border-color)',
                    backgroundColor: 'var(--bg-color)',
                    display: 'flex',
                    gap: '0.6rem',
                    flexShrink: 0
                }}
            >
                <input 
                    type="text"
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    placeholder={isLoading ? "Generating..." : "Ask AI to code..."}
                    disabled={isLoading}
                    style={{
                        flex: 1,
                        backgroundColor: 'var(--editor-bg)',
                        border: '1px solid var(--border-color)',
                        borderRadius: '20px',
                        padding: '0.65rem 1rem',
                        color: 'var(--text-color)',
                        fontSize: '0.85rem',
                        outline: 'none',
                        transition: 'border-color 0.2s',
                        opacity: isLoading ? 0.7 : 1,
                        minWidth: 0
                    }}
                    onFocus={(e) => e.target.style.borderColor = 'var(--primary-color)'}
                    onBlur={(e) => e.target.style.borderColor = 'var(--border-color)'}
                />
                <button 
                    type="submit"
                    disabled={isLoading}
                    style={{
                        backgroundColor: 'var(--primary-color)',
                        color: 'white',
                        border: 'none',
                        width: '38px',
                        height: '38px',
                        borderRadius: '50%',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        cursor: isLoading ? 'not-allowed' : 'pointer',
                        transition: 'transform 0.2s, filter 0.2s',
                        opacity: isLoading ? 0.7 : 1,
                        flexShrink: 0
                    }}
                    onMouseOver={(e) => {
                        if (!isLoading) {
                            e.currentTarget.style.transform = 'scale(1.05)';
                            e.currentTarget.style.filter = 'brightness(1.1)';
                        }
                    }}
                    onMouseOut={(e) => {
                        e.currentTarget.style.transform = 'scale(1)';
                        e.currentTarget.style.filter = 'brightness(1)';
                    }}
                >
                    {isLoading ? <FaSpinner style={{ animation: 'spin 1s linear infinite' }} /> : <FaPaperPlane />}
                </button>
            </form>
        </div>
    );
};

export default AIAssistant;
