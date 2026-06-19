import React, { useState, useEffect, useRef } from 'react';
import { FaDownload, FaMagic, FaPlus, FaSignInAlt, FaHistory, FaDoorOpen } from 'react-icons/fa';
import { useEditor } from '../context/EditorContext';
import ShareModal from './ShareModal';
import JoinModal from './JoinModal';

const HamburgerMenu = () => {
    const { layout, setLayout, html, css, js, joinRoom, createRoom, persistentAdminId } = useEditor();
    const [isDownloading, setIsDownloading] = useState(false);
    const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [isJoinModalOpen, setIsJoinModalOpen] = useState(false);
    const [currentShareUrl, setCurrentShareUrl] = useState('');
    const [myRooms, setMyRooms] = useState([]);
    const [isLoadingRooms, setIsLoadingRooms] = useState(false);
    const menuRef = useRef(null);

    const fetchMyRooms = async () => {
        setIsLoadingRooms(true);
        try {
            const response = await fetch(`http://localhost:5000/api/rooms/my-rooms/${persistentAdminId}`);
            if (response.ok) {
                const data = await response.json();
                setMyRooms(data);
            }
        } catch (err) {
            console.error("Failed to fetch my rooms:", err);
        } finally {
            setIsLoadingRooms(false);
        }
    };

    useEffect(() => {
        if (mobileMenuOpen) {
            fetchMyRooms();
        }
    }, [mobileMenuOpen]);

    const generateRoomId = () => {
        return Math.random().toString(36).substring(2, 11);
    };

    const handleCreateRoom = async () => {
        const newRoomId = generateRoomId();
        const result = await createRoom(newRoomId);
        if (result.success) {
            const shareUrl = `${window.location.origin}${window.location.pathname}?room=${newRoomId}`;
            setCurrentShareUrl(shareUrl);
            setIsModalOpen(true);
            setMobileMenuOpen(false); 
        }
    };

    const handleJoinRoom = () => {
        setIsJoinModalOpen(true);
        setMobileMenuOpen(false);
    };

    const handlePerformJoin = async (id) => {
        const result = await joinRoom(id);
        if (result.success) {
            setIsJoinModalOpen(false);
            setMobileMenuOpen(false);
        }
    };

    const downloadFile = (filename, content, type) => {
        const element = document.createElement('a');
        const file = new Blob([content], { type: type });
        element.href = URL.createObjectURL(file);
        element.download = filename;
        document.body.appendChild(element);
        element.click();
        document.body.removeChild(element);
    };

    const handleDownload = () => {
        setIsDownloading(true);
        const fullHtml = `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>WebDev Playground Export</title>
    <link rel="stylesheet" href="style.css">
</head>
<body>
    ${html}
    <script src="script.js"></script>
</body>
</html>`;

        downloadFile('index.html', fullHtml, 'text/html');
        setTimeout(() => downloadFile('style.css', css, 'text/css'), 100);
        setTimeout(() => downloadFile('script.js', js, 'text/javascript'), 200);
        setTimeout(() => setIsDownloading(false), 3000);
        setMobileMenuOpen(false);
    };

    const handleLayoutChange = (newLayout) => {
        setLayout(newLayout);
        setMobileMenuOpen(false);
    };

    useEffect(() => {
        const handleClickOutside = (event) => {
            if (menuRef.current && !menuRef.current.contains(event.target)) {
                setMobileMenuOpen(false);
            }
        };
        if (mobileMenuOpen) {
            document.addEventListener('mousedown', handleClickOutside);
        }
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, [mobileMenuOpen]);

    useEffect(() => {
        const handleResize = () => {
            if (window.innerWidth > 768) {
                setMobileMenuOpen(false);
            }
        };
        window.addEventListener('resize', handleResize);
        return () => window.removeEventListener('resize', handleResize);
    }, []);

    return (
        <div ref={menuRef}>
            {/* Hamburger Button */}
            <button
                className={`hamburger-btn ${mobileMenuOpen ? 'open' : ''}`}
                onClick={() => setMobileMenuOpen(prev => !prev)}
                title="Menu"
            >
                <span></span>
                <span></span>
                <span></span>
            </button>

            {/* Menu Overlay (Sidebar) */}
            <div className={`mobile-menu-overlay ${mobileMenuOpen ? 'open' : ''}`}>
                <div className="mobile-menu-row">

                    <button
                        onClick={handleDownload}
                        disabled={isDownloading}
                        className={`menu-item-btn download-btn ${isDownloading ? 'downloaded' : ''}`}
                    >
                        <FaDownload />
                        <span>{isDownloading ? 'Downloaded!' : 'Download Code'}</span>
                    </button>
                </div>

                <div className="mobile-menu-row">
                    <button
                        className="menu-item-btn ai-button"
                        onClick={() => handleLayoutChange('ai')}
                    >
                        <FaMagic /> AI Assistant
                    </button>
                </div>

                <div className="mobile-menu-row">
                    <button onClick={handleCreateRoom} className="menu-item-btn share-btn">
                        <FaPlus /> <span>Create New Room</span>
                    </button>
                </div>

                <div className="mobile-menu-row">
                    <button onClick={handleJoinRoom} className="menu-item-btn share-btn">
                        <FaSignInAlt /> <span>Join by Code</span>
                    </button>
                </div>

                {/* MY ACTIVE ROOMS SECTION */}
                <div className="my-rooms-section">
                    <div className="section-header">
                        <FaHistory /> <span>My Active Rooms</span>
                    </div>
                    
                    {isLoadingRooms ? (
                        <div className="rooms-loading">Loading your rooms...</div>
                    ) : myRooms.length > 0 ? (
                        <div className="rooms-list">
                            {myRooms.map(room => (
                                <div key={room.roomId} className="room-history-item">
                                    <div className="room-info">
                                        <span className="room-id-text">ID: {room.roomId}</span>
                                        <span className="room-date">{new Date(room.createdAt).toLocaleDateString()}</span>
                                    </div>
                                    <button 
                                        className="rejoin-text-btn"
                                        onClick={() => handlePerformJoin(room.roomId)}
                                        title="Re-join Room"
                                    >
                                        Re-Join
                                    </button>

                                </div>
                            ))}
                        </div>
                    ) : (
                        <div className="no-rooms-msg">No rooms created yet.</div>
                    )}
                </div>
            </div>

            {/* Share Modal Popup */}
            <ShareModal 
                isOpen={isModalOpen} 
                onClose={() => setIsModalOpen(false)} 
                shareUrl={currentShareUrl} 
            />

            {/* Join Modal Popup */}
            <JoinModal 
                isOpen={isJoinModalOpen} 
                onClose={() => setIsJoinModalOpen(false)} 
                onJoin={handlePerformJoin} 
            />
        </div>
    );
};

export default HamburgerMenu;
