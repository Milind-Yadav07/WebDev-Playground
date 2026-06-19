import React, { createContext, useContext, useState, useEffect, useRef } from 'react';
import { io } from 'socket.io-client';

const EditorContext = createContext();

export const useEditor = () => {
    return useContext(EditorContext);
};

export const EditorProvider = ({ children }) => {
    const [html, setHtml] = useState('<h1>Hello From WebDev Playground✌️</h1>');
    const [css, setCss] = useState('body{ font-family: sans-serif; padding: 2rem; background-color: #000000ff; color: #79afffff;}');
    const [js, setJs] = useState('console.log("Hello from WebDev Playground");');
    const [theme, setTheme] = useState('light');
    const [layout, setLayout] = useState('split');
    const [messages, setMessages] = useState([
        { id: 1, text: "Hello! I'm Myra, your AI Assistant", sender: 'ai' }
    ]);

    const [roomId, setRoomId] = useState(null);
    const roomIdRef = useRef(roomId);
    const socketRef = useRef(null);
    const isRemoteChange = useRef(false);

    // Persistent Admin ID for identifying the user across sessions and rooms
    const [persistentAdminId] = useState(() => {
        let id = localStorage.getItem('webdev_playground_admin_id');
        if (!id) {
            id = Math.random().toString(36).substring(2, 15);
            localStorage.setItem('webdev_playground_admin_id', id);
        }
        return id;
    });

    
    // Refs to keep track of latest values for socket listeners
    const htmlRef = useRef(html);
    const cssRef = useRef(css);
    const jsRef = useRef(js);

    useEffect(() => { htmlRef.current = html; }, [html]);
    useEffect(() => { cssRef.current = css; }, [css]);
    useEffect(() => { jsRef.current = js; }, [js]);
    useEffect(() => { roomIdRef.current = roomId; }, [roomId]);

    const [isAdmin, setIsAdmin] = useState(false);
    const isAdminRef = useRef(isAdmin);
    useEffect(() => { isAdminRef.current = isAdmin; }, [isAdmin]);

    const leaveRoom = () => {
        const currentRoomId = roomIdRef.current;
        if (socketRef.current) {
            if (currentRoomId) {
                socketRef.current.emit('leave', { roomId: currentRoomId });
            }
            setRoomId(null);
            setIsAdmin(false);
            
            const newUrl = new URL(window.location);
            newUrl.searchParams.delete('room');
            window.history.pushState({}, '', newUrl);
        }
    };


    const joinRoom = async (id) => {
        try {
            const response = await fetch(`http://localhost:5000/api/rooms/${id}`);
            const data = await response.json();

            if (data.exists) {
                setRoomId(id);
                socketRef.current.emit('join', { roomId: id, username: `User-${Math.floor(Math.random() * 1000)}` });
                
                if (persistentAdminId === data.adminId) {
                    setIsAdmin(true);
                }

                const newUrl = new URL(window.location);
                newUrl.searchParams.set('room', id);
                window.history.pushState({}, '', newUrl);
                return { success: true };
            } else {
                alert(data.message || 'Room not found');
                return { success: false, message: data.message };
            }
        } catch (err) {
            console.error("Failed to join room:", err);
            return { success: false, message: "Server error" };
        }
    };

    const createRoom = async (id) => {
        try {
            const response = await fetch('http://localhost:5000/api/rooms', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ roomId: id, adminId: persistentAdminId })
            });
            if (response.ok) {
                await joinRoom(id);
                setIsAdmin(true);
                return { success: true };
            }
            return { success: false };
        } catch (err) {
            console.error("Failed to create room:", err);
            return { success: false };
        }
    };



    const deleteRoom = async () => {
        if (!roomId || !isAdmin) return;
        
        try {
            const response = await fetch(`http://localhost:5000/api/rooms/${roomId}`, {
                method: 'DELETE',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ adminId: persistentAdminId })
            });
            if (response.ok) {
                leaveRoom();
                alert("Room deleted successfully");
            }
        } catch (err) {
            console.error("Failed to delete room:", err);
        }
    };


    useEffect(() => {
        // Initialize socket
        socketRef.current = io('http://localhost:5000');

        socketRef.current.on('code-change', ({ code, type }) => {
            isRemoteChange.current = true;
            if (type === 'html') setHtml(code);
            if (type === 'css') setCss(code);
            if (type === 'js') setJs(code);
            setTimeout(() => { isRemoteChange.current = false; }, 0);
        });

        socketRef.current.on('joined', ({ username, socketId }) => {
            if (socketId !== socketRef.current.id) {
                socketRef.current.emit('sync-code', {
                    socketId,
                    code: htmlRef.current,
                    type: 'html'
                });
                socketRef.current.emit('sync-code', {
                    socketId,
                    code: cssRef.current,
                    type: 'css'
                });
                socketRef.current.emit('sync-code', {
                    socketId,
                    code: jsRef.current,
                    type: 'js'
                });
            }
        });

        socketRef.current.on('error', ({ message }) => {
            alert(message);
            const newUrl = new URL(window.location);
            newUrl.searchParams.delete('room');
            window.history.pushState({}, '', newUrl);
            setRoomId(null);
            setIsAdmin(false);
        });

        socketRef.current.on('room-deleted', ({ message }) => {
            if (!isAdminRef.current) {
                alert(message);
            }
            leaveRoom();
        });



        const params = new URLSearchParams(window.location.search);
        const urlRoomId = params.get('room');
        if (urlRoomId) {
            joinRoom(urlRoomId);
        }

        return () => {
            if (socketRef.current) {
                socketRef.current.disconnect();
            }
        };
    }, []);


    // Emit changes when state updates, but only if it's NOT from a remote source
    useEffect(() => {
        if (roomId && !isRemoteChange.current) {
            socketRef.current.emit('code-change', { roomId, code: html, type: 'html' });
        }
    }, [html, roomId]);

    useEffect(() => {
        if (roomId && !isRemoteChange.current) {
            socketRef.current.emit('code-change', { roomId, code: css, type: 'css' });
        }
    }, [css, roomId]);

    useEffect(() => {
        if (roomId && !isRemoteChange.current) {
            socketRef.current.emit('code-change', { roomId, code: js, type: 'js' });
        }
    }, [js, roomId]);

    useEffect(() => {
        document.documentElement.setAttribute('data-theme', theme);
    }, [theme]);

    const toggleTheme = () => {
        setTheme(prev => prev === 'light' ? 'dark' : 'light');
    };

    const value = {
        html, setHtml,
        css, setCss,
        js, setJs,
        theme, setTheme,
        layout, setLayout,
        messages, setMessages,
        toggleTheme,
        roomId, joinRoom, leaveRoom, createRoom, deleteRoom, isAdmin, persistentAdminId
    };




    return (
        <EditorContext.Provider value={value}>
            {children}
        </EditorContext.Provider>
    );
};

