import React from 'react';

interface State {
  hasError: boolean;
  message: string;
}

export class ErrorBoundary extends React.Component<
  { children: React.ReactNode },
  State
> {
  constructor(props: { children: React.ReactNode }) {
    super(props);
    this.state = { hasError: false, message: '' };
  }

  static getDerivedStateFromError(error: Error): State {
    return {
      hasError: true,
      message: error.message || 'An unexpected error occurred.',
    };
  }

  componentDidCatch(error: Error) {
    console.error('Application error caught by ErrorBoundary:', error);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-[#0B0D11] text-[#F1F5F9] flex items-center justify-center p-6">
          <div className="max-w-md w-full rounded-2xl bg-[#131720] border border-white/[0.08] p-6">
            <h2 className="text-lg font-semibold text-white">Something went wrong</h2>
            <p className="mt-2 text-sm text-slate-400">
              AurumPulse encountered a recoverable error while syncing data. Reload the view to
              continue.
            </p>
            <button
              type="button"
              onClick={() => window.location.reload()}
              className="mt-5 min-h-[44px] px-4 py-2 rounded-xl bg-[#D4AF37] text-[#0B0D11] text-sm font-semibold hover:bg-[#E5BE52] transition-colors"
            >
              Reload App
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
