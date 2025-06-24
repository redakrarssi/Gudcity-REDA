import React, { Component, ErrorInfo, ReactNode } from 'react';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

/**
 * List of error messages to ignore (typically from browser extensions)
 */
const IGNORED_ERROR_MESSAGES = [
  'Could not establish connection. Receiving end does not exist.',
  'Extension context invalidated',
  'The message port closed before a response was received',
  'Failed to execute \'postMessage\' on \'Window\'',
  'Cannot read properties of undefined (reading \'postMessage\')'
];

/**
 * Error Boundary component to catch and handle React errors gracefully
 */
class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = {
      hasError: false,
      error: null
    };
  }

  static getDerivedStateFromError(error: Error): State {
    // Check if this is an error we should ignore
    if (error.message && IGNORED_ERROR_MESSAGES.some(msg => error.message.includes(msg))) {
      console.warn('Ignoring browser extension error:', error.message);
      // Return no error state so the component continues to render normally
      return {
        hasError: false,
        error: null
      };
    }
    
    // Update state so the next render will show the fallback UI
    return {
      hasError: true,
      error
    };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo): void {
    // Skip logging for ignored errors
    if (error.message && IGNORED_ERROR_MESSAGES.some(msg => error.message.includes(msg))) {
      return;
    }
    
    // Log the error to the console
    console.warn('Error caught by ErrorBoundary:', error);
    console.warn('Component stack:', errorInfo.componentStack);
    
    // You can also log the error to an error reporting service here
  }

  render(): ReactNode {
    if (this.state.hasError) {
      // You can render any custom fallback UI
      if (this.props.fallback) {
        return this.props.fallback;
      }
      
      return (
        <div style={{ 
          padding: '20px', 
          margin: '20px', 
          backgroundColor: '#f8f9fa', 
          border: '1px solid #dee2e6',
          borderRadius: '4px'
        }}>
          <h2>Something went wrong</h2>
          <p>The application encountered an error. Please try refreshing the page.</p>
          <details style={{ whiteSpace: 'pre-wrap', marginTop: '10px' }}>
            <summary>Error details</summary>
            {this.state.error && this.state.error.toString()}
          </details>
          <button 
            onClick={() => window.location.reload()}
            style={{
              marginTop: '15px',
              padding: '8px 16px',
              backgroundColor: '#007bff',
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              cursor: 'pointer'
            }}
          >
            Refresh Page
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary; 