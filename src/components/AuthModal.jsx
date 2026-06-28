import React, { useState } from 'react';
import { FaTimes, FaUser, FaLock, FaSignInAlt, FaUserPlus, FaSpinner } from 'react-icons/fa';
import { useRoom } from '../context/RoomContext';
import { useToast } from '../context/ToastContext';
import { BASE_URL } from '../api/config';

const AuthModal = () => {
    const { isAuthModalOpen, setIsAuthModalOpen, setUser } = useRoom();
    const { addToast } = useToast();
    const [isLoginTab, setIsLoginTab] = useState(true);
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState('');

    if (!isAuthModalOpen) return null;

    const handleClose = () => {
        setIsAuthModalOpen(false);
        setUsername('');
        setPassword('');
        setError('');
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!username.trim() || !password.trim()) {
            setError('Please fill in all fields');
            return;
        }

        setIsLoading(true);
        setError('');

        const endpoint = isLoginTab ? '/api/auth/login' : '/api/auth/register';

        try {
            const response = await fetch(`${BASE_URL}${endpoint}`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ username: username.trim(), password: password.trim() })
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.error || 'Authentication failed');
            }

            // Save user details to Context and LocalStorage
            const userData = {
                id: data.user.id,
                username: data.user.username,
                token: data.token
            };
            
            localStorage.setItem('webdev_playground_user', JSON.stringify(userData));
            setUser(userData);
            addToast(isLoginTab ? 'Logged in successfully!' : 'Account registered successfully!', 'success');
            handleClose();
        } catch (err) {
            setError(err.message || 'An error occurred. Please try again.');
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="modal-overlay" style={{ zIndex: 2000 }}>
            <div className="modal-content auth-modal" style={{ maxWidth: '420px', padding: '1.75rem' }}>
                <div className="modal-header" style={{ marginBottom: '1.25rem' }}>
                    <h2 style={{ fontSize: '1.35rem', fontWeight: '700' }}>WebDev Account</h2>
                    <button className="close-btn" onClick={handleClose}>
                        <FaTimes />
                    </button>
                </div>

                <div className="auth-tabs" style={{
                    display: 'flex',
                    background: 'var(--editor-bg)',
                    padding: '4px',
                    borderRadius: '10px',
                    marginBottom: '1.5rem',
                    border: '1px solid var(--border-color)'
                }}>
                    <button 
                        onClick={() => { setIsLoginTab(true); setError(''); }}
                        style={{
                            flex: 1,
                            padding: '0.6rem',
                            border: 'none',
                            borderRadius: '8px',
                            background: isLoginTab ? 'var(--bg-color)' : 'transparent',
                            color: isLoginTab ? 'var(--primary-color)' : 'var(--secondary-color)',
                            fontWeight: '600',
                            fontSize: '0.85rem',
                            cursor: 'pointer',
                            transition: 'all 0.2s',
                            boxShadow: isLoginTab ? '0 2px 4px rgba(0,0,0,0.05)' : 'none'
                        }}
                    >
                        Sign In
                    </button>
                    <button 
                        onClick={() => { setIsLoginTab(false); setError(''); }}
                        style={{
                            flex: 1,
                            padding: '0.6rem',
                            border: 'none',
                            borderRadius: '8px',
                            background: !isLoginTab ? 'var(--bg-color)' : 'transparent',
                            color: !isLoginTab ? 'var(--primary-color)' : 'var(--secondary-color)',
                            fontWeight: '600',
                            fontSize: '0.85rem',
                            cursor: 'pointer',
                            transition: 'all 0.2s',
                            boxShadow: !isLoginTab ? '0 2px 4px rgba(0,0,0,0.05)' : 'none'
                        }}
                    >
                        Register
                    </button>
                </div>

                {error && (
                    <div style={{
                        padding: '0.75rem 1rem',
                        backgroundColor: 'rgba(239, 68, 68, 0.1)',
                        border: '1px solid rgba(239, 68, 68, 0.2)',
                        color: '#ef4444',
                        borderRadius: '8px',
                        fontSize: '0.8rem',
                        marginBottom: '1.25rem',
                        textAlign: 'center',
                        fontWeight: '500'
                    }}>
                        {error}
                    </div>
                )}

                <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                        <label style={{ fontSize: '0.75rem', fontWeight: '600', color: 'var(--secondary-color)' }}>Username</label>
                        <div style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '0.75rem',
                            background: 'var(--editor-bg)',
                            padding: '0.4rem 0.8rem',
                            borderRadius: '10px',
                            border: '1px solid var(--border-color)'
                        }}>
                            <FaUser style={{ color: 'var(--secondary-color)', fontSize: '0.85rem' }} />
                            <input 
                                type="text"
                                placeholder="Enter username..."
                                value={username}
                                onChange={(e) => setUsername(e.target.value)}
                                disabled={isLoading}
                                style={{
                                    flex: 1,
                                    background: 'transparent',
                                    border: 'none',
                                    outline: 'none',
                                    color: 'var(--text-color)',
                                    fontSize: '0.9rem',
                                    padding: '0.4rem 0'
                                }}
                                autoFocus
                            />
                        </div>
                    </div>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem', marginBottom: '0.5rem' }}>
                        <label style={{ fontSize: '0.75rem', fontWeight: '600', color: 'var(--secondary-color)' }}>Password</label>
                        <div style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '0.75rem',
                            background: 'var(--editor-bg)',
                            padding: '0.4rem 0.8rem',
                            borderRadius: '10px',
                            border: '1px solid var(--border-color)'
                        }}>
                            <FaLock style={{ color: 'var(--secondary-color)', fontSize: '0.85rem' }} />
                            <input 
                                type="password"
                                placeholder="Enter password..."
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                disabled={isLoading}
                                style={{
                                    flex: 1,
                                    background: 'transparent',
                                    border: 'none',
                                    outline: 'none',
                                    color: 'var(--text-color)',
                                    fontSize: '0.9rem',
                                    padding: '0.4rem 0'
                                }}
                            />
                        </div>
                    </div>

                    <button 
                        type="submit" 
                        disabled={isLoading}
                        style={{
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            gap: '0.6rem',
                            backgroundColor: 'var(--primary-color)',
                            color: 'white',
                            border: 'none',
                            padding: '0.75rem',
                            borderRadius: '10px',
                            fontWeight: '600',
                            fontSize: '0.9rem',
                            cursor: 'pointer',
                            transition: 'all 0.2s',
                            marginTop: '0.5rem'
                        }}
                        onMouseOver={(e) => {
                            if (!isLoading) {
                                e.currentTarget.style.filter = 'brightness(1.1)';
                                e.currentTarget.style.transform = 'translateY(-1px)';
                            }
                        }}
                        onMouseOut={(e) => {
                            e.currentTarget.style.filter = 'brightness(1)';
                            e.currentTarget.style.transform = 'translateY(0)';
                        }}
                    >
                        {isLoading ? (
                            <FaSpinner style={{ animation: 'spin 1s linear infinite' }} />
                        ) : isLoginTab ? (
                            <FaSignInAlt />
                        ) : (
                            <FaUserPlus />
                        )}
                        <span>
                            {isLoading 
                                ? (isLoginTab ? 'Signing In...' : 'Registering...') 
                                : (isLoginTab ? 'Sign In' : 'Create Account')}
                        </span>
                    </button>
                </form>
            </div>
        </div>
    );
};

export default AuthModal;
