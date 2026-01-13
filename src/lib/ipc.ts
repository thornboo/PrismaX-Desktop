import type { IpcResponse } from "@/types/electron.d";

export const IPC_ERROR_CANCELLED = "操作已取消";

export function isIpcCancelled(response: IpcResponse<unknown>): boolean {
  return !response.success && response.error === IPC_ERROR_CANCELLED;
}
