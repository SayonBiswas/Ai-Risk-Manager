import React from 'react';

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error('ErrorBoundary caught an error:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-[#13131b] flex flex-col items-center justify-center">
          {/* Background gradient */}
          <div className="fixed inset-0 bg-[radial-gradient(ellipse_at_center,rgba(192,193,255,0.05)_0%,transparent_65%)] pointer-events-none" />

          <div className="glass-panel w-full max-w-[500px] rounded-xl p-12 relative z-10 text-center">
            {/* Heading */}
            <h1 className="text-2xl font-bold text-[#e4e1ed] mb-4">Something went wrong</h1>

            {/* Error message (only in dev) */}
            {import.meta.env.DEV && this.state.error && (
              <pre className="font-mono text-xs text-[#ffb4ab] bg-[#0d0d15] border border-[#464554] rounded p-4 mb-8 overflow-auto max-h-[200px] text-left">
                {this.state.error.message}
              </pre>
            )}

            {/* Reload button */}
            <button
              onClick={() => window.location.reload()}
              className="bg-[#c0c1ff] text-[#1000a9] font-semibold rounded py-2.5 px-6 text-sm hover:bg-[#d0d1ff] active:scale-[0.98] transition-all"
            >
              Reload page
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
