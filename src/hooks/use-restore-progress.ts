"use client";
import { useState, useEffect, useCallback, useRef } from "react";
import { supabase } from "@/lib/supabase";

interface RestoreJob {
  id: string;
  status: "queued" | "processing" | "ready" | "failed";
  mode: string;
  error: string | null;
  createdAt: string;
  startedAt: string | null;
  completedAt: string | null;
}

interface RestoreProgress {
  job: RestoreJob | null;
  progress: number;
  isPolling: boolean;
  error: string | null;
}

export function useRestoreProgress() {
  const [progress, setProgress] = useState<RestoreProgress>({
    job: null,
    progress: 0,
    isPolling: false,
    error: null,
  });
  
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const stopPolling = useCallback(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
    setProgress(prev => ({ ...prev, isPolling: false }));
  }, []);

  const calculateProgress = (job: RestoreJob): number => {
    switch (job.status) {
      case "queued": return 10;
      case "processing": return 50;
      case "ready": return 100;
      case "failed": return 0;
      default: return 0;
    }
  };

  const setJobStatus = useCallback((job: RestoreJob) => {
    const progressPercent = calculateProgress(job);
    setProgress({
      job,
      progress: progressPercent,
      isPolling: job.status !== "ready" && job.status !== "failed",
      error: job.error,
    });
    if (job.status === "ready" || job.status === "failed") {
      stopPolling();
    }
  }, [stopPolling]);

  const startPolling = useCallback((jobId: string) => {
    stopPolling();
    
    setProgress({
      job: null,
      progress: 5,
      isPolling: true,
      error: null,
    });

    const poll = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session) {
          setProgress(prev => ({ ...prev, error: "Session expired", isPolling: false }));
          stopPolling();
          return;
        }

        const res = await fetch(
          `${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/restore-artwork?jobId=${jobId}`,
          {
            headers: {
              "Authorization": `Bearer ${session.access_token}`,
            },
          }
        );

        if (!res.ok) {
          throw new Error(`Failed to fetch status: ${res.status}`);
        }

        const data = await res.json();
        
        if (!data.ok) {
          throw new Error(data.error?.message || "Unknown error");
        }

        const job = data.job as RestoreJob;
        const progressPercent = calculateProgress(job);

        setProgress({
          job,
          progress: progressPercent,
          isPolling: true,
          error: null,
        });

        // Stop polling if job is complete or failed
        if (job.status === "ready" || job.status === "failed") {
          stopPolling();
        }
      } catch (err: any) {
        setProgress(prev => ({
          ...prev,
          error: err.message,
          isPolling: false,
        }));
        stopPolling();
      }
    };

    // Poll immediately, then every 3 seconds
    poll();
    intervalRef.current = setInterval(poll, 3000);
  }, [stopPolling]);

  useEffect(() => {
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, []);

  return {
    ...progress,
    startPolling,
    stopPolling,
    setJobStatus,
  };
}
