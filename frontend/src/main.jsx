import React, { Component } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { AuthProvider } from './contexts/AuthContext';
import App from './App';
import './styles/global.css';

class ErrorBoundary extends Component {
  state = { failed: false };
  static getDerivedStateFromError() { return { failed: true }; }
  render() {
    if (this.state.failed) return <main className="page centered"><h1>Algo no salió como esperábamos</h1><p>Recarga la página para volver a tu universo.</p><button className="button primary" onClick={() => window.location.reload()}>Recargar EventPass</button></main>;
    return this.props.children;
  }
}

createRoot(document.getElementById('root')).render(<ErrorBoundary><BrowserRouter><AuthProvider><App /></AuthProvider></BrowserRouter></ErrorBoundary>);
