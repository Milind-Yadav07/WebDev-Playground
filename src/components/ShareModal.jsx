import React, { useState } from 'react';
import { FaCopy, FaCheck, FaTimes } from 'react-icons/fa';

const ShareModal = ({ isOpen, onClose, shareUrl }) => {
    const [copied, setCopied] = useState(false);

    if (!isOpen) return null;

    const handleCopy = () => {
        navigator.clipboard.writeText(shareUrl).then(() => {
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
        });
    };

    return (
        <div className="modal-overlay">
            <div className="modal-content share-modal">
                <div className="modal-header">
                    <h2>Share Room</h2>
                    <button className="close-btn" onClick={onClose}>
                        <FaTimes />
                    </button>
                </div>
                
                <div className="modal-body">
                    <p>Invite others to code with you in real-time by sharing this link.</p>
                    
                    <div className="share-input-group">
                        <input 
                            type="text" 
                            value={shareUrl} 
                            readOnly 
                            className="share-url-input"
                        />
                        <button 
                            className={`copy-btn ${copied ? 'copied' : ''}`} 
                            onClick={handleCopy}
                        >
                            {copied ? <FaCheck /> : <FaCopy />}
                            <span>{copied ? 'Copied!' : 'Copy'}</span>
                        </button>
                    </div>
                </div>

                <div className="modal-footer">
                    <button className="done-btn" onClick={onClose}>Done</button>
                </div>
            </div>
        </div>
    );
};

export default ShareModal;
