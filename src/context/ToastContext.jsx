import React, { createContext, useContext, useState, useCallback } from 'react';
import { FaCheckCircle, FaExclamationCircle, FaInfoCircle, FaTimes } from 'react-icons/fa';

const ToastContext = createContext();

export const useToast = () => {
    return useContext(ToastContext);
};

export const ToastProvider = ({ children }) => {
    const [toasts, setToasts] = useState([]);

    const addToast = useCallback((message, type = 'info') => {
        const id = Date.now() + Math.random();
        setToasts((prev) => [...prev, { id, message, type }]);
        
        // Auto-remove toast after 4 seconds
        setTimeout(() => {
            setToasts((prev) => prev.filter((toast) => toast.id !== id));
        }, 4000);
    }, []);

    const removeToast = useCallback((id) => {
        setToasts((prev) => prev.filter((toast) => toast.id !== id));
    }, []);

    const getIcon = (type) => {
        switch (type) {
            case 'success':
                return <FaCheckCircle style={{ color: '#10b981' }} />;
            case 'error':
                return <FaExclamationCircle style={{ color: '#ef4444' }} />;
            case 'info':
            default:
                return <FaInfoCircle style={{ color: '#3b82f6' }} />;
        }
    };

    return (
        <ToastContext.Provider value={{ addToast }}>
            {children}
            
            {/* Toast Container */}
            <div className="toast-container">
                {toasts.map((toast) => (
                    <div key={toast.id} className={`toast-item ${toast.type}`}>
                        <div className="toast-icon">
                            {getIcon(toast.type)}
                        </div>
                        <div className="toast-message">
                            {toast.message}
                        </div>
                        <button className="toast-close" onClick={() => removeToast(toast.id)}>
                            <FaTimes />
                        </button>
                    </div>
                ))}
            </div>
        </ToastContext.Provider>
    );
};
