import React from "react";

export default class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  componentDidCatch(error, info) {
    console.error("App crash caught by ErrorBoundary:", error, info?.componentStack);
  }

  handleReload = () => {
    this.setState({ hasError: false });
    window.location.href = "/";
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-zinc-950 px-6 text-center">
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-amber-400/15 text-amber-300">
            <svg viewBox="0 0 24 24" className="h-7 w-7" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 9v4M12 17h.01M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
            </svg>
          </div>
          <h1 className="font-heading text-xl font-bold text-white">Something went wrong</h1>
          <p className="max-w-sm text-sm text-zinc-400">
            The app hit an unexpected error. Your data is safe — reload to get back to ripping packs.
          </p>
          <button
            onClick={this.handleReload}
            className="rounded-full bg-gradient-to-r from-amber-300 to-orange-500 px-6 py-3 text-sm font-bold text-black transition-transform hover:scale-105"
          >
            Back to PackPulseDrops
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}