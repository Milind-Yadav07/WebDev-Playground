import React, { createContext, useContext, useState, useEffect, useRef } from 'react';
import { io } from 'socket.io-client';
import { BASE_URL } from '../api/config';
import { useEditor } from './EditorContext';
import { useToast } from './ToastContext';

const RoomContext = createContext();

export const useRoom = () => {
    return useContext(RoomContext);
};

export const RoomProvider = ({ children }) => {
    const { 
        html, setHtml, 
        css, setCss, 
        js, setJs 
    } = useEditor();
    
    const { addToast } = useToast();

    const [roomId, setRoomId] = useState(null);
    const roomIdRef = useRef(roomId);
    const socketRef = useRef(null);
    const isRemoteChange = useRef(false);

    // User Authentication State
    const [user, setUser] = useState(() => {
        const storedUser = localStorage.getItem('webdev_playground_user');
        return storedUser ? JSON.parse(storedUser) : null;
    });
    const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
    const [isAdmin, setIsAdmin] = useState(false);
    const isAdminRef = useRef(isAdmin);

    const logout = () => {
        localStorage.removeItem('webdev_playground_user');
        setUser(null);
        setIsAdmin(false);
        leaveRoom();
        addToast('Logged out successfully', 'info');
    };

    // Refs to keep track of latest values for socket listeners
    const htmlRef = useRef(html);
    const cssRef = useRef(css);
    const jsRef = useRef(js);

    useEffect(() => { htmlRef.current = html; }, [html]);
    useEffect(() => { cssRef.current = css; }, [css]);
    useEffect(() => { jsRef.current = js; }, [js]);
    useEffect(() => { roomIdRef.current = roomId; }, [roomId]);
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
            addToast('Left collaboration room', 'info');
        }
    };

    const joinRoom = async (id) => {
        try {
            const response = await fetch(`${BASE_URL}/api/rooms/${id}`);
            const data = await response.json();

            if (data.exists) {
                setRoomId(id);
                const usernameToUse = user ? user.username : `Guest-${Math.floor(Math.random() * 1000)}`;
                socketRef.current.emit('join', { roomId: id, username: usernameToUse });
                
                if (user && user.id === data.adminId) {
                    setIsAdmin(true);
                }

                const newUrl = new URL(window.location);
                newUrl.searchParams.set('room', id);
                window.history.pushState({}, '', newUrl);
                addToast(`Successfully joined room ${id}`, 'success');
                return { success: true };
            } else {
                addToast(data.message || 'Room not found', 'error');
                return { success: false, message: data.message };
            }
        } catch (err) {
            console.error("Failed to join room:", err);
            addToast('Connection server error', 'error');
            return { success: false, message: "Server error" };
        }
    };

    const createRoom = async (id) => {
        if (!user) {
            setIsAuthModalOpen(true);
            return { success: false, message: "Authentication required" };
        }
        try {
            const response = await fetch(`${BASE_URL}/api/rooms`, {
                method: 'POST',
                headers: { 
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${user.token}`
                },
                body: JSON.stringify({ roomId: id })
            });
            if (response.ok) {
                await joinRoom(id);
                setIsAdmin(true);
                addToast('Collaboration room created successfully!', 'success');
                return { success: true };
            }
            const errData = await response.json();
            addToast(errData.error || "Failed to create room", 'error');
            return { success: false };
        } catch (err) {
            console.error("Failed to create room:", err);
            addToast('Failed to create room', 'error');
            return { success: false };
        }
    };

    const deleteRoom = async () => {
        if (!roomId || !isAdmin || !user) return;
        
        try {
            const response = await fetch(`${BASE_URL}/api/rooms/${roomId}`, {
                method: 'DELETE',
                headers: { 
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${user.token}`
                }
            });
            if (response.ok) {
                leaveRoom();
                addToast("Room deleted successfully", 'success');
            } else {
                const errData = await response.json();
                addToast(errData.error || "Failed to delete room", 'error');
            }
        } catch (err) {
            console.error("Failed to delete room:", err);
            addToast("Server connection error", 'error');
        }
    };

    useEffect(() => {
        // Initialize socket
        socketRef.current = io(BASE_URL);

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
            addToast(message, 'error');
            const newUrl = new URL(window.location);
            newUrl.searchParams.delete('room');
            window.history.pushState({}, '', newUrl);
            setRoomId(null);
            setIsAdmin(false);
        });

        socketRef.current.on('room-deleted', ({ message }) => {
            if (!isAdminRef.current) {
                addToast(message, 'info');
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
    }, [user]); // Reconnect/sync if user signs in/out

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

    const value = {
        roomId, joinRoom, leaveRoom, createRoom, deleteRoom, isAdmin,
        user, setUser, logout, isAuthModalOpen, setIsAuthModalOpen
    };

    return (
        <RoomContext.Provider value={value}>
            {children}
        </RoomContext.Provider>
    );
};
