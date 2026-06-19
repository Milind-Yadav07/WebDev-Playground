import React from 'react';
import { FaMoon, FaSun, FaColumns, FaTable, FaSignOutAlt, FaTrash } from 'react-icons/fa';
import { useEditor } from '../context/EditorContext';
import HamburgerMenu from './HamburgerMenu';

const Navbar = () => {
    const { theme, toggleTheme, layout, setLayout, roomId, leaveRoom, deleteRoom, isAdmin } = useEditor();


    return (
        <nav className="navbar">
            <div className="navbar-brand">
                <h1>WebDev Playground</h1>
            </div>

            <div className="navbar-actions">
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


