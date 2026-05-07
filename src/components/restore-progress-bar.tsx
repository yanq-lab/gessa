import { CheckCircle2, XCircle } from "lucide-react";

interface RestoreProgressBarProps {
  progress: number;
  status: string;
  error: string | null;
  originalImage?: string | null;
}

export function RestoreProgressBar({ progress, status, error, originalImage }: RestoreProgressBarProps) {
  const getStatusText = () => {
    switch (status) {
      case "queued":
        return "Preparing...";
      case "processing":
        return "AI is restoring your artwork...";
      case "ready":
        return "Restoration complete!";
      case "failed":
        return "Restoration failed";
      default:
        return "Preparing...";
    }
  };

  if (status === "ready") {
    return (
      <div className="w-full rounded-sm border border-green-200 bg-green-50 p-4">
        <div className="flex items-center gap-2">
          <CheckCircle2 className="h-5 w-5 text-green-500" />
          <span className="text-sm font-medium text-green-700">{getStatusText()}</span>
        </div>
      </div>
    );
  }

  if (status === "failed") {
    return (
      <div className="w-full rounded-sm border border-red-200 bg-red-50 p-4">
        <div className="flex items-center gap-2">
          <XCircle className="h-5 w-5 text-red-500" />
          <span className="text-sm font-medium text-red-700">{getStatusText()}</span>
        </div>
        {error && <p className="mt-2 text-xs text-red-600">{error}</p>}
        <p className="mt-2 text-xs text-stone-500">Please try again or use the original photo.</p>
      </div>
    );
  }

  return (
    <div className="w-full">
      {/* Image canvas with shimmer animation */}
      <div className="relative mx-auto w-full max-w-2xl overflow-hidden rounded-sm border border-stone-200 bg-stone-100 aspect-[4/3]">
        {originalImage ? (
          <>
            <img
              src={originalImage}
              alt="Original artwork"
              className="absolute inset-0 h-full w-full object-contain opacity-40"
            />
            <div className="absolute inset-0 shimmer-overlay" />
          </>
        ) : (
          <div className="absolute inset-0 shimmer-placeholder" />
        )}
      </div>

      <div className="mt-4 flex items-center justify-center gap-3">
        <div className="h-2 w-2 animate-pulse rounded-full bg-stone-400" />
        <span className="text-sm font-medium text-stone-600">{getStatusText()}</span>
      </div>
      <p className="mt-2 text-center text-xs text-stone-400">
        This usually takes 1-2 minutes. You can leave this page and come back later.
      </p>

      <style jsx>{`
        .shimmer-overlay {
          background: linear-gradient(
            90deg,
            transparent 0%,
            rgba(255,255,255,0.15) 25%,
            rgba(255,255,255,0.35) 50%,
            rgba(255,255,255,0.15) 75%,
            transparent 100%
          );
          background-size: 200% 100%;
          animation: shimmer 2s ease-in-out infinite;
        }
        .shimmer-placeholder {
          background: linear-gradient(
            90deg,
            #e7e5e4 0%,
            #d6d3d1 25%,
            #e7e5e4 50%,
            #d6d3d1 75%,
            #e7e5e4 100%
          );
          background-size: 200% 100%;
          animation: shimmer 2s ease-in-out infinite;
        }
        @keyframes shimmer {
          0% { background-position: 200% 0; }
          100% { background-position: -200% 0; }
        }
      `}</style>
    </div>
  );
}