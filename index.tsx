import React, { Component, ErrorInfo, ReactNode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App';

interface ErrorBoundaryProps {
  children?: ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
}

// Fixed: Explicitly declaring state as a property of the class to resolve 'Property does not exist' errors in this specific TypeScript environment.
// Using Component directly from the react import ensures that the generics are correctly applied to the class instance.
class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  // Explicitly initialize state property to satisfy compiler checks for class members.
  public state: ErrorBoundaryState = {
    hasError: false,
    error: null
  };

  // Fixed: Explicitly declaring props to resolve 'Property does not exist' error in this specific TypeScript environment.
  public props: ErrorBoundaryProps;

  constructor(props: ErrorBoundaryProps) {
    super(props);
    // Fixed: Manual assignment of props to satisfy the compiler's strict check in this environment.
    this.props = props;
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error("APP CRASH:", error, errorInfo);
  }

  render() {
    // Fixed: Accessed this.state which is now explicitly declared and inherited from Component.
    if (this.state.hasError) {
      return (
        <div style={{
          padding: '40px',
          color: '#ff4444',
          backgroundColor: '#040404',
          minHeight: '100vh',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          textAlign: 'center',
          fontFamily: 'sans-serif'
        }}>
          <h1 style={{ color: '#f46c24', fontSize: '2rem', marginBottom: '1rem' }}>Ups! Niečo sa nepodarilo.</h1>
          <pre style={{ background: '#111', padding: '1rem', borderRadius: '8px', fontSize: '0.8rem', maxWidth: '100%', overflow: 'auto' }}>
            {/* Accessing error details from the explicitly declared state */}
            {this.state.error?.message}
          </pre>
          <button 
            onClick={() => window.location.reload()}
            style={{ marginTop: '20px', padding: '10px 20px', background: '#f46c24', color: '#fff', border: 'none', borderRadius: '5px', cursor: 'pointer' }}
          >
            Obnoviť aplikáciu
          </button>
        </div>
      );
    }
    // Fixed: Correctly return children from props inherited from the Component class, now explicitly declared.
    return this.props.children;
  }
}

const container = document.getElementById('root');
if (container) {
  const root = createRoot(container);
  root.render(
    <ErrorBoundary>
      <App />
    </ErrorBoundary>
  );
}