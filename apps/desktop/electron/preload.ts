import { contextBridge, ipcRenderer } from "electron";

contextBridge.exposeInMainWorld("electron", {
  db: {
    hello: () => ipcRenderer.invoke("db:hello"),
  },
  chat: {
    ensure: () => ipcRenderer.invoke("chat:ensure") as Promise<{ conversationId: string }>,
    history: (conversationId: string) =>
      ipcRenderer.invoke("chat:history", { conversationId }) as Promise<{
        conversationId: string;
        messages: Array<{ id: string; role: string; content: string }>;
      }>,
    send: (input: { conversationId: string; content: string; modelId?: string }) =>
      ipcRenderer.invoke("chat:send", input) as Promise<{ requestId: string; error?: string }>,
    onMeta: (callback: (payload: { requestId: string; userMessageId: string; assistantMessageId: string }) => void) => {
      const listener = (_event: unknown, payload: any) => callback(payload);
      ipcRenderer.on("chat:meta", listener);
      return () => ipcRenderer.removeListener("chat:meta", listener);
    },
    onToken: (callback: (payload: { requestId: string; token: string }) => void) => {
      const listener = (_event: unknown, payload: any) => callback(payload);
      ipcRenderer.on("chat:token", listener);
      return () => ipcRenderer.removeListener("chat:token", listener);
    },
    onDone: (callback: (payload: { requestId: string }) => void) => {
      const listener = (_event: unknown, payload: any) => callback(payload);
      ipcRenderer.on("chat:done", listener);
      return () => ipcRenderer.removeListener("chat:done", listener);
    },
    onError: (callback: (payload: { requestId: string; message: string }) => void) => {
      const listener = (_event: unknown, payload: any) => callback(payload);
      ipcRenderer.on("chat:error", listener);
      return () => ipcRenderer.removeListener("chat:error", listener);
    },
  },
});
