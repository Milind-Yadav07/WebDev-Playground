import React, { useState, useEffect } from 'react';
import CodeEditor from './CodeEditor';
import Preview from './Preview';
import AIAssistant from './AIAssistant';
import ErrorBoundary from './ErrorBoundary';
import { useEditor } from '../context/EditorContext';
import { FaCode, FaEye, FaRobot } from 'react-icons/fa';

const Layout = () => {
    const { html, setHtml, css, setCss, js, setJs, layout, theme } = useEditor();
    const [activeTab, setActiveTab] = useState('html');
    const [mobilePanel, setMobilePanel] = useState('editor'); // 'editor' | 'preview' | 'ai'
    const [isMobile, setIsMobile] = useState(false);

    // Detect mobile breakpoint
    useEffect(() => {
        const checkMobile = () => {
            setIsMobile(window.innerWidth <= 768);
        };
        checkMobile();
        window.addEventListener('resize', checkMobile);
        return () => window.removeEventListener('resize', checkMobile);
    }, []);

    // Auto-switch to tabbed mode on mobile for split layout
    const effectiveLayout = (isMobile && layout === 'split') ? 'tabs' : layout;

    const renderEditors = () => (
        <>
            <div className="editor-pane">
                <ErrorBoundary>
                    <CodeEditor language="html" value={html} onChange={setHtml} theme={theme} />
                </ErrorBoundary>
            </div>
            <div className="editor-pane">
                <ErrorBoundary>
                    <CodeEditor language="css" value={css} onChange={setCss} theme={theme} />
                </ErrorBoundary>
            </div>
            <div className="editor-pane" style={{ borderRight: 'none' }}>
                <ErrorBoundary>
                    <CodeEditor language="javascript" value={js} onChange={setJs} theme={theme} />
                </ErrorBoundary>
            </div>
        </>
    );

    const renderTabbedEditors = () => (
        <div className="tabbed-editor-container">
            <div className="tab-bar">
                {['html', 'css', 'javascript'].map((lang) => (
                    <button
                        key={lang}
                        onClick={() => setActiveTab(lang)}
                        className={`tab-btn ${activeTab === lang ? 'active' : ''}`}
                    >
                        {lang}
                    </button>
                ))}
            </div>
            <div className="tab-content">
                <ErrorBoundary>
                    {activeTab === 'html' && <CodeEditor language="html" value={html} onChange={setHtml} theme={theme} />}
                    {activeTab === 'css' && <CodeEditor language="css" value={css} onChange={setCss} theme={theme} />}
                    {activeTab === 'javascript' && <CodeEditor language="javascript" value={js} onChange={setJs} theme={theme} />}
                </ErrorBoundary>
            </div>
        </div>
    );

    const renderMobilePanelSwitcher = () => {
        const panels = layout === 'ai'
            ? [
                { key: 'editor', label: 'Code', icon: <FaCode /> },
                { key: 'preview', label: 'Preview', icon: <FaEye /> },
                { key: 'ai', label: 'AI', icon: <FaRobot /> }
            ]
            : [
                { key: 'editor', label: 'Code', icon: <FaCode /> },
                { key: 'preview', label: 'Preview', icon: <FaEye /> }
            ];

        return (
            <div className="mobile-panel-switcher">
                {panels.map(({ key, label, icon }) => (
                    <button
                        key={key}
                        onClick={() => setMobilePanel(key)}
                        className={`mobile-panel-btn ${mobilePanel === key ? 'active' : ''}`}
                    >
                        {icon} {label}
                    </button>
                ))}
            </div>
        );
    };

    // ===== MOBILE LAYOUT =====
    if (isMobile) {
        return (
            <div className={`main-layout ${effectiveLayout}`} style={{ flexDirection: 'column' }}>
                {renderMobilePanelSwitcher()}
                <div className="mobile-panel-content">
                    {mobilePanel === 'editor' && renderTabbedEditors()}
                    {mobilePanel === 'preview' && <Preview html={html} css={css} js={js} />}
                    {mobilePanel === 'ai' && layout === 'ai' && (
                        <ErrorBoundary>
                            <AIAssistant />
                        </ErrorBoundary>
                    )}
                    {/* If not in AI layout but user somehow is on AI panel, show editor */}
                    {mobilePanel === 'ai' && layout !== 'ai' && renderTabbedEditors()}
                </div>
            </div>
        );
    }

    // ===== DESKTOP LAYOUT =====
    return (
        <div className={`main-layout ${effectiveLayout}`}>
            {effectiveLayout === 'ai' ? (
                <>
                    <div className="ai-code-preview-container">
                        <div className="ai-code-area">
                            {renderTabbedEditors()}
                        </div>
                        <div className="ai-preview-area">
                            <Preview html={html} css={css} js={js} />
                        </div>
                    </div>
                    <div className="ai-assistant-panel">
                        <ErrorBoundary>
                            <AIAssistant />
                        </ErrorBoundary>
                    </div>
                </>
            ) : (
                <>
                    {/* Editor Section */}
                    <div className={`editor-section ${effectiveLayout === 'split' ? 'split-mode' : 'tabs-mode'}`}>
                        {effectiveLayout === 'split' ? renderEditors() : renderTabbedEditors()}
                    </div>

                    {/* Preview Section */}
                    <div className="preview-section">
                        <Preview html={html} css={css} js={js} />
                    </div>
                </>
            )}
        </div>
    );
};

export default Layout;
