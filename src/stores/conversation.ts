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
  createConversation: (title?: string) => Promise<Conversation>;
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
    try {
      const conversations = await window.electron.db.getConversations();
      set({ conversations, isLoading: false });
    } catch (error) {
      const message = error instanceof Error ? error.message : "加载会话失败";
      set({ error: message, isLoading: false });
    }
  },

  // 创建新会话
  createConversation: async (title?: string) => {
    set({ isLoading: true, error: null });
    try {
      const conversation = await window.electron.db.createConversation(title);
      set((state) => ({
        conversations: [conversation, ...state.conversations],
        currentConversationId: conversation.id,
        messages: [],
        isLoading: false,
      }));
      return conversation;
    } catch (error) {
      const message = error instanceof Error ? error.message : "创建会话失败";
      set({ error: message, isLoading: false });
      throw error;
    }
  },

  // 删除会话
  deleteConversation: async (id: string) => {
    set({ isLoading: true, error: null });
    try {
      await window.electron.db.deleteConversation(id);
      const { currentConversationId, conversations } = get();

      // 更新会话列表
      const newConversations = conversations.filter((c) => c.id !== id);

      // 如果删除的是当前会话，切换到第一个会话或清空
      let newCurrentId = currentConversationId;
      let newMessages: Message[] = get().messages;

      if (currentConversationId === id) {
        newCurrentId = newConversations.length > 0 ? newConversations[0].id : null;
        newMessages = [];

        // 如果有新的当前会话，加载其消息
        if (newCurrentId) {
          const messages = await window.electron.db.getMessages(newCurrentId);
          newMessages = messages;
        }
      }

      set({
        conversations: newConversations,
        currentConversationId: newCurrentId,
        messages: newMessages,
        isLoading: false,
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : "删除会话失败";
      set({ error: message, isLoading: false });
    }
  },

  // 更新会话
  updateConversation: async (id, updates) => {
    try {
      const updated = await window.electron.db.updateConversation(id, updates);
      if (updated) {
        set((state) => ({
          conversations: state.conversations.map((c) => (c.id === id ? updated : c)),
        }));
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : "更新会话失败";
      set({ error: message });
    }
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
    try {
      const messages = await window.electron.db.getMessages(conversationId);
      set({ messages, isLoading: false });
    } catch (error) {
      const message = error instanceof Error ? error.message : "加载消息失败";
      set({ error: message, isLoading: false });
    }
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
