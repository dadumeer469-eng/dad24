import React, { Component, ErrorInfo, ReactNode } from "react";
import { RefreshCw, AlertTriangle } from "lucide-react";

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error("Uncaught runtime error caught by ErrorBoundary:", error, errorInfo);
  }

  private handleReload = () => {
    window.location.reload();
  };

  public render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-zinc-950 text-white flex flex-col items-center justify-center p-6 text-center">
          <div className="w-16 h-16 rounded-full bg-pink-500/10 border border-pink-500/30 flex items-center justify-center text-[#D70F64] mb-4 animate-bounce">
            <AlertTriangle className="w-8 h-8" />
          </div>
          <h1 className="text-2xl font-black uppercase tracking-tight mb-2">
            DADU <span className="text-[#D70F64]">EXPRESS</span>
          </h1>
          <p className="text-zinc-400 text-sm max-w-xs mb-6">
            Connecting to Dadu Express server... Please tap below to refresh the page.
          </p>
          <button
            onClick={this.handleReload}
            className="bg-[#D70F64] hover:bg-pink-700 text-white font-extrabold px-6 py-3 rounded-2xl flex items-center gap-2 shadow-lg shadow-pink-500/30 active:scale-95 transition cursor-pointer"
          >
            <RefreshCw className="w-4 h-4" />
            Reload Dadu Express
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}
