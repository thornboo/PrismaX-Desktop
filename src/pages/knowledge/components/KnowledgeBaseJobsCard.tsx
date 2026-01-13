import { Pause, Play, Square } from "lucide-react";
import type { KnowledgeJob } from "../types";
import { formatDate, formatProgress } from "../utils/format";

interface KnowledgeBaseJobsCardProps {
  jobs: KnowledgeJob[];
  onPause: (jobId: string) => Promise<void>;
  onResume: (jobId: string, jobType: string) => Promise<void>;
  onCancel: (jobId: string) => Promise<void>;
}

export function KnowledgeBaseJobsCard({
  jobs,
  onPause,
  onResume,
  onCancel,
}: KnowledgeBaseJobsCardProps) {
  return (
    <div className="rounded-lg border border-border p-4">
      <div className="text-sm font-medium">任务</div>
      {jobs.length === 0 ? (
        <div className="mt-2 text-sm text-muted-foreground">暂无任务</div>
      ) : (
        <div className="mt-3 space-y-2">
          {jobs.slice(0, 20).map((job) => (
            <div
              key={job.id}
              className="flex items-center justify-between gap-3 rounded border border-border p-3"
            >
              <div className="min-w-0">
                <div className="text-sm truncate">
                  {job.type} · <span className="text-muted-foreground">{job.status}</span>
                </div>
                <div className="text-xs text-muted-foreground mt-1">
                  进度 {formatProgress(job.progressCurrent, job.progressTotal)} · 更新{" "}
                  {formatDate(job.updatedAt)}
                </div>
                {job.errorMessage && (
                  <div className="text-xs text-destructive mt-1 truncate">{job.errorMessage}</div>
                )}
              </div>
              <div className="flex items-center gap-1">
                {job.status === "processing" && (
                  <button
                    onClick={() => void onPause(job.id)}
                    className="p-2 rounded hover:bg-accent transition-colors"
                    title="暂停"
                  >
                    <Pause size={16} />
                  </button>
                )}
                {job.status === "paused" && (
                  <button
                    onClick={() => void onResume(job.id, String(job.type))}
                    className="p-2 rounded hover:bg-accent transition-colors"
                    title="继续"
                  >
                    <Play size={16} />
                  </button>
                )}
                {["pending", "processing", "paused"].includes(String(job.status)) && (
                  <button
                    onClick={() => void onCancel(job.id)}
                    className="p-2 rounded hover:bg-destructive/20 text-destructive transition-colors"
                    title="取消"
                  >
                    <Square size={16} />
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
