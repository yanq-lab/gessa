import { Loader2, CheckCircle2, XCircle } from "lucide-react";

interface RestoreProgressBarProps {
  progress: number;
  status: string;
  error: string | null;
}

export function RestoreProgressBar({ progress, status, error }: RestoreProgressBarProps) {
  const getStatusText = () => {
    switch (status) {
      case "queued":
        return "Waiting in queue...";
      case "processing":
        return "AI is analyzing your artwork...";
      case "ready":
        return "Restoration complete!";
      case "failed":
        return "Restoration failed";
      default:
        return "Preparing...";
    }
  };

  const getStatusColor = () => {
    switch (status) {
      case "ready":
        return "bg-green-500";
      case "failed":
        return "bg-red-500";
      default:
        return "bg-stone-900";
    }
  };

  return (
    <div className="w-full rounded-sm border border-stone-200 bg-white p-6">
      <div className="mb-4 flex items-center justify-between">
        <div className="flex items-center gap-2">
          {status === "ready" ? (
            <CheckCircle2 className="h-5 w-5 text-green-500" />
          ) : status === "failed" ? (
            <XCircle className="h-5 w-5 text-red-500" />
          ) : (
            <Loader2 className="h-5 w-5 animate-spin text-stone-400" />
          )}
          <span className="text-sm font-medium text-stone-900">{getStatusText()}</span>
        </div>
        <span className="text-sm text-stone-500">{progress}%</span>
      </div>

      <div className="h-2 w-full overflow-hidden rounded-full bg-stone-100">
        <div
          className={`h-full rounded-full transition-all duration-500 ${getStatusColor()}`}
          style={{ width: `${progress}%` }}
        />
      </div>

      {status !== "ready" && status !== "failed" && (
        <p className="mt-2 text-xs text-stone-500">
          This usually takes 1-2 minutes. You can leave this page and come back later.
        </p>
      )}

      {status === "failed" && (
        <div className="mt-3 rounded-sm bg-red-50 p-3 text-sm text-red-600">
          <p className="font-medium">Restoration failed</p>
          <p className="mt-1 text-xs">{error || "Unknown error occurred"}</p>
          <p className="mt-2 text-xs text-stone-500">Please try again or use the original photo.</p>
        </div>
      )}

      {error && status !== "failed" && (
        <div className="mt-3 rounded-sm bg-red-50 p-3 text-sm text-red-600">
          {error}
        </div>
      )}
    </div>
  );
}
