/**
 * 会话状态管理
 *
 * 使用 Zustand 管理会话列表和当前选中的会话
 */

import { create } from "zustand";
import type { Conversation, Message } from "@/types/electron.d";

interface ConversationState {
  // 状态
  conversations: Conversation[];
  currentConversationId: string | null;
  messages: Message[];
  isLoading: boolean;
  error: string | null;

  // 操作
  loadConversations: () => Promise<void>;
  createConversation: (title?: string) => Promise<Conversation | null>;
  deleteConversation: (id: string) => Promise<void>;
  updateConversation: (id: string, updates: { title?: string; pinned?: boolean }) => Promise<void>;
  selectConversation: (id: string | null) => Promise<void>;
  loadMessages: (conversationId: string) => Promise<void>;
  addMessage: (message: Message) => void;
  updateMessage: (id: string, content: string) => void;
  clearError: () => void;
}

export const useConversationStore = create<ConversationState>((set, get) => ({
  // 初始状态
  conversations: [],
  currentConversationId: null,
  messages: [],
  isLoading: false,
  error: null,

  // 加载会话列表
  loadConversations: async () => {
    set({ isLoading: true, error: null });
    const res = await window.electron.db.getConversations();
    if (!res.success) {
      set({ error: res.error, isLoading: false });
      return;
    }
    set({ conversations: res.data, isLoading: false });
  },

  // 创建新会话
  createConversation: async (title?: string) => {
    set({ isLoading: true, error: null });
    const res = await window.electron.db.createConversation(title);
    if (!res.success) {
      set({ error: res.error, isLoading: false });
      return null;
    }

    const conversation = res.data;
    set((state) => ({
      conversations: [conversation, ...state.conversations],
      currentConversationId: conversation.id,
      messages: [],
      isLoading: false,
    }));
    return conversation;
  },

  // 删除会话
  deleteConversation: async (id: string) => {
    set({ isLoading: true, error: null });
    const deleteRes = await window.electron.db.deleteConversation(id);
    if (!deleteRes.success) {
      set({ error: deleteRes.error, isLoading: false });
      return;
    }

    const { currentConversationId, conversations } = get();
    const newConversations = conversations.filter((c) => c.id !== id);

    let newCurrentId = currentConversationId;
    let newMessages: Message[] = get().messages;

    if (currentConversationId === id) {
      newCurrentId = newConversations.length > 0 ? newConversations[0].id : null;
      newMessages = [];

      if (newCurrentId) {
        const messagesRes = await window.electron.db.getMessages(newCurrentId);
        if (messagesRes.success) {
          newMessages = messagesRes.data;
        } else {
          set({ error: messagesRes.error });
        }
      }
    }

    set({
      conversations: newConversations,
      currentConversationId: newCurrentId,
      messages: newMessages,
      isLoading: false,
    });
  },

  // 更新会话
  updateConversation: async (id, updates) => {
    const res = await window.electron.db.updateConversation(id, updates);
    if (!res.success) {
      set({ error: res.error });
      return;
    }
    const updated = res.data;
    set((state) => ({
      conversations: state.conversations.map((c) => (c.id === id ? updated : c)),
    }));
  },

  // 选择会话
  selectConversation: async (id) => {
    if (id === get().currentConversationId) return;

    set({ currentConversationId: id, messages: [] });

    if (id) {
      await get().loadMessages(id);
    }
  },

  // 加载消息
  loadMessages: async (conversationId) => {
    set({ isLoading: true, error: null });
    const res = await window.electron.db.getMessages(conversationId);
    if (!res.success) {
      set({ error: res.error, isLoading: false });
      return;
    }
    set({ messages: res.data, isLoading: false });
  },

  // 添加消息（本地）
  addMessage: (message) => {
    set((state) => ({
      messages: [...state.messages, message],
    }));
  },

  // 更新消息内容（用于流式响应）
  updateMessage: (id, content) => {
    set((state) => ({
      messages: state.messages.map((m) => (m.id === id ? { ...m, content } : m)),
    }));
  },

  // 清除错误
  clearError: () => {
    set({ error: null });
  },
}));
