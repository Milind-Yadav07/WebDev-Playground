import React, { useState } from 'react';
import { FaSignInAlt, FaTimes, FaSpinner } from 'react-icons/fa';

const JoinModal = ({ isOpen, onClose, onJoin }) => {
    const [inputValue, setInputValue] = useState('');
    const [isJoining, setIsJoining] = useState(false);

    if (!isOpen) return null;

    const handleJoin = async (e) => {
        e.preventDefault();
        if (inputValue.trim() && !isJoining) {
            setIsJoining(true);
            let id = inputValue.trim();
            try {
                const url = new URL(id);
                const roomParam = url.searchParams.get('room');
                if (roomParam) id = roomParam;
            } catch (e) {}

            await onJoin(id);
            setIsJoining(false);
            setInputValue('');
        }
    };



    return (
        <div className="modal-overlay">
            <div className="modal-content join-modal">
                <div className="modal-header">
                    <h2>Join Room</h2>
                    <button className="close-btn" onClick={onClose}>
                        <FaTimes />
                    </button>
                </div>
                
                <div className="modal-body">
                    <p>Paste the Room ID or the complete URL shared by your colleague to join their live session.</p>
                    
                    <form onSubmit={handleJoin}>
                        <div className="join-input-group">
                            <input 
                                type="text" 
                                placeholder="Enter Room ID or URL..." 
                                value={inputValue} 
                                onChange={(e) => setInputValue(e.target.value)}
                                className="join-room-input"
                                autoFocus
                            />
                        </div>
                        <div className="modal-footer">
                            <button type="button" className="cancel-btn" onClick={onClose} disabled={isJoining}>Cancel</button>
                            <button type="submit" className="join-btn" disabled={isJoining || !inputValue.trim()}>
                                {isJoining ? <FaSpinner className="spin" style={{ animation: 'fa-spin 2s linear infinite' }} /> : <FaSignInAlt />}
                                <span>{isJoining ? 'Joining...' : 'Join Now'}</span>
                            </button>
                        </div>

                    </form>
                </div>
            </div>
        </div>
    );
};

export default JoinModal;
