import React from 'react';
import Navbar from './components/Navbar';
import Layout from './components/Layout';
import AuthModal from './components/AuthModal';
import { EditorProvider } from './context/EditorContext';
import { ToastProvider } from './context/ToastContext';
import { RoomProvider } from './context/RoomContext';

function App() {
  return (
    <EditorProvider>
      <ToastProvider>
        <RoomProvider>
          <div className="App">
            <Navbar />
            <Layout />
            <AuthModal />
          </div>
        </RoomProvider>
      </ToastProvider>
    </EditorProvider>
  )
}

export default App;
