import React from 'react';
import { FaMoon, FaSun, FaColumns, FaTable, FaSignOutAlt, FaTrash, FaUser, FaSignInAlt } from 'react-icons/fa';
import { useEditor } from '../context/EditorContext';
import { useRoom } from '../context/RoomContext';
import HamburgerMenu from './HamburgerMenu';

const Navbar = () => {
    const { theme, toggleTheme, layout, setLayout } = useEditor();
    const { roomId, leaveRoom, deleteRoom, isAdmin, user, logout, setIsAuthModalOpen } = useRoom();


    return (
        <nav className="navbar">
            <div className="navbar-brand">
                <h1>WebDev Playground</h1>
            </div>

            <div className="navbar-actions">
                {/* User Authentication Status */}
                {user ? (
                    <div className="user-badge" style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.5rem',
                        background: 'var(--editor-bg)',
                        padding: '0.4rem 0.8rem',
                        borderRadius: '20px',
                        border: '1px solid var(--border-color)',
                        fontSize: '0.8rem',
                        fontWeight: '600'
                    }}>
                        <FaUser style={{ color: 'var(--primary-color)' }} />
                        <span style={{ color: 'var(--text-color)' }}>{user.username}</span>
                        <button 
                            onClick={logout} 
                            style={{
                                background: 'transparent',
                                border: 'none',
                                color: 'var(--secondary-color)',
                                cursor: 'pointer',
                                padding: '2px',
                                display: 'flex',
                                alignItems: 'center',
                                transition: 'color 0.2s'
                            }}
                            onMouseOver={(e) => e.currentTarget.style.color = '#ef4444'}
                            onMouseOut={(e) => e.currentTarget.style.color = 'var(--secondary-color)'}
                            title="Log Out"
                        >
                            <FaSignOutAlt />
                        </button>
                    </div>
                ) : (
                    <button 
                        onClick={() => setIsAuthModalOpen(true)}
                        className="login-navbar-btn"
                        title="Log In / Sign Up"
                    >
                        <span>Log In</span>
                    </button>
                )}

                {/* Room Status & Leave Button - Only visible when in a room */}
                {roomId && (
                    <div className="room-status" style={{ display: 'flex', gap: '0.8rem', alignItems: 'center' }}>
                        <span className="room-badge">Room: {roomId}</span>
                        
                        {isAdmin && (
                            <button 
                                onClick={deleteRoom}
                                className="delete-room-btn"
                                title="Delete Room and End Collaboration"
                            >
                                <FaTrash />
                                <span>Delete Room</span>
                            </button>
                        )}


                        <button 
                            onClick={leaveRoom}
                            className="leave-btn"
                            title="Leave Collaboration Room"
                        >
                            <FaSignOutAlt />
                            <span>Leave</span>
                        </button>
                    </div>
                )}


                {/* Layout toggle - always visible in navbar as requested */}
                <div className="layout-toggle-group">
                    <button
                        onClick={() => setLayout('split')}
                        title="Split View"
                        className={`layout-toggle-btn ${layout === 'split' ? 'active' : ''}`}
                    >
                        <FaColumns />
                    </button>
                    <button
                        onClick={() => setLayout('tabs')}
                        title="Tabbed View"
                        className={`layout-toggle-btn ${layout === 'tabs' ? 'active' : ''}`}
                    >
                        <FaTable />
                    </button>
                </div>

                {/* Theme toggle - always visible */}
                <button
                    onClick={toggleTheme}
                    className="theme-toggle-btn"
                    title={theme === 'light' ? 'Switch to Dark Mode' : 'Switch to Light Mode'}
                >
                    {theme === 'light' ? <FaMoon /> : <FaSun />}
                </button>

                {/* New Hamburger Menu Component */}
                <HamburgerMenu />
            </div>
        </nav>
    );
};

export default Navbar;


