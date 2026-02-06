import { WifiOff, RefreshCw } from 'lucide-react';

/**
 * Offline fallback page for PWA
 */
export default function OfflinePage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <div className="text-center space-y-6 p-8">
        <div className="flex justify-center">
          <div className="p-4 rounded-full bg-muted">
            <WifiOff className="h-12 w-12 text-muted-foreground" />
          </div>
        </div>
        
        <div className="space-y-2">
          <h1 className="text-2xl font-bold">You&apos;re Offline</h1>
          <p className="text-muted-foreground max-w-md">
            It looks like you&apos;ve lost your internet connection. 
            Please check your connection and try again.
          </p>
        </div>
        
        <button
          onClick={() => window.location.reload()}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-md bg-primary text-primary-foreground hover:bg-primary/90 transition-colors"
        >
          <RefreshCw className="h-4 w-4" />
          Try Again
        </button>
      </div>
    </div>
  );
}
