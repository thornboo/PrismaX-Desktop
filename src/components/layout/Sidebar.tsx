import { useEffect, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import {
  MessageSquare,
  Settings,
  Plus,
  ChevronLeft,
  ChevronRight,
  FolderOpen,
  Bot,
  Puzzle,
  Trash2,
  Pin,
  MoreHorizontal,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useConversationStore } from "@/stores";

export function Sidebar() {
  const [collapsed, setCollapsed] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();

  const {
    conversations,
    currentConversationId,
    loadConversations,
    createConversation,
    deleteConversation,
    updateConversation,
    selectConversation,
  } = useConversationStore();

  // 加载会话列表
  useEffect(() => {
    loadConversations();
  }, [loadConversations]);

  // 检查当前路径是否匹配
  const isActive = (path: string) => {
    if (path === "/") {
      return location.pathname === "/";
    }
    return location.pathname.startsWith(path);
  };

  // 创建新会话
  const handleNewConversation = async () => {
    try {
      await createConversation();
      // 导航到聊天页面
      if (location.pathname !== "/") {
        navigate("/");
      }
    } catch (error) {
      console.error("创建会话失败:", error);
    }
  };

  // 选择会话
  const handleSelectConversation = async (id: string) => {
    await selectConversation(id);
    // 导航到聊天页面
    if (location.pathname !== "/") {
      navigate("/");
    }
  };

  // 删除会话
  const handleDeleteConversation = async (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    if (confirm("确定要删除这个会话吗？")) {
      await deleteConversation(id);
    }
  };

  // 置顶/取消置顶
  const handleTogglePin = async (e: React.MouseEvent, id: string, pinned: boolean) => {
    e.stopPropagation();
    await updateConversation(id, { pinned: !pinned });
  };

  // 按时间分组会话
  const groupedConversations = groupConversationsByDate(conversations);

  return (
    <aside
      className={cn(
        "flex flex-col border-r border-border bg-muted/30 transition-all duration-300",
        collapsed ? "w-16" : "w-64",
      )}
    >
      {/* 顶部区域 */}
      <div className="flex items-center justify-between p-4 border-b border-border">
        {!collapsed && <span className="font-semibold text-lg">PrismaX</span>}
        <button
          onClick={() => setCollapsed(!collapsed)}
          className="p-2 rounded-md hover:bg-accent transition-colors"
        >
          {collapsed ? <ChevronRight size={18} /> : <ChevronLeft size={18} />}
        </button>
      </div>

      {/* 新建会话按钮 */}
      <div className="p-2">
        <button
          onClick={handleNewConversation}
          className={cn(
            "flex items-center gap-2 w-full p-3 rounded-lg",
            "bg-primary text-primary-foreground hover:bg-primary/90 transition-colors",
            collapsed && "justify-center",
          )}
        >
          <Plus size={18} />
          {!collapsed && <span>新建会话</span>}
        </button>
      </div>

      {/* 会话列表 */}
      <div className="flex-1 overflow-y-auto p-2">
        {conversations.length === 0 ? (
          <div className={cn("text-center text-muted-foreground py-8", collapsed && "hidden")}>
            <MessageSquare className="mx-auto mb-2 opacity-50" size={24} />
            <p className="text-sm">暂无会话</p>
          </div>
        ) : (
          <div className="space-y-4">
            {Object.entries(groupedConversations).map(([group, items]) => (
              <div key={group}>
                {!collapsed && (
                  <div className="px-2 py-1 text-xs text-muted-foreground font-medium">{group}</div>
                )}
                <div className="space-y-1">
                  {items.map((conversation) => (
                    <div
                      key={conversation.id}
                      onClick={() => handleSelectConversation(conversation.id)}
                      className={cn(
                        "group flex items-center gap-2 p-3 rounded-lg cursor-pointer transition-colors",
                        currentConversationId === conversation.id
                          ? "bg-accent"
                          : "hover:bg-accent/50",
                        collapsed && "justify-center",
                      )}
                    >
                      {conversation.pinned ? (
                        <Pin size={18} className="text-primary shrink-0" />
                      ) : (
                        <MessageSquare size={18} className="shrink-0" />
                      )}
                      {!collapsed && (
                        <>
                          <span className="flex-1 truncate text-sm">{conversation.title}</span>
                          <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                            <button
                              onClick={(e) =>
                                handleTogglePin(e, conversation.id, conversation.pinned)
                              }
                              className="p-1 rounded hover:bg-background/50"
                              title={conversation.pinned ? "取消置顶" : "置顶"}
                            >
                              <Pin size={14} />
                            </button>
                            <button
                              onClick={(e) => handleDeleteConversation(e, conversation.id)}
                              className="p-1 rounded hover:bg-destructive/20 text-destructive"
                              title="删除"
                            >
                              <Trash2 size={14} />
                            </button>
                          </div>
                        </>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* 快捷导航 */}
      <div className="p-2 border-t border-border space-y-1">
        <Link
          to="/knowledge"
          className={cn(
            "flex items-center gap-2 p-3 rounded-lg transition-colors",
            isActive("/knowledge") ? "bg-accent" : "hover:bg-accent",
            collapsed && "justify-center",
          )}
        >
          <FolderOpen size={18} />
          {!collapsed && <span>知识库</span>}
        </Link>
        <Link
          to="/assistants"
          className={cn(
            "flex items-center gap-2 p-3 rounded-lg transition-colors",
            isActive("/assistants") ? "bg-accent" : "hover:bg-accent",
            collapsed && "justify-center",
          )}
        >
          <Bot size={18} />
          {!collapsed && <span>助手</span>}
        </Link>
        <Link
          to="/plugins"
          className={cn(
            "flex items-center gap-2 p-3 rounded-lg transition-colors",
            isActive("/plugins") ? "bg-accent" : "hover:bg-accent",
            collapsed && "justify-center",
          )}
        >
          <Puzzle size={18} />
          {!collapsed && <span>插件</span>}
        </Link>
      </div>

      {/* 底部导航 */}
      <div className="p-2 border-t border-border">
        <Link
          to="/settings"
          className={cn(
            "flex items-center gap-2 p-3 rounded-lg transition-colors",
            isActive("/settings") ? "bg-accent" : "hover:bg-accent",
            collapsed && "justify-center",
          )}
        >
          <Settings size={18} />
          {!collapsed && <span>设置</span>}
        </Link>
      </div>
    </aside>
  );
}

/**
 * 按日期分组会话
 */
function groupConversationsByDate(
  conversations: Array<{ id: string; title: string; pinned: boolean; updatedAt: string }>,
): Record<string, typeof conversations> {
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const yesterday = new Date(today.getTime() - 24 * 60 * 60 * 1000);
  const lastWeek = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000);

  const groups: Record<string, typeof conversations> = {};

  // 先处理置顶的
  const pinned = conversations.filter((c) => c.pinned);
  if (pinned.length > 0) {
    groups["置顶"] = pinned;
  }

  // 再按时间分组
  const unpinned = conversations.filter((c) => !c.pinned);

  for (const conversation of unpinned) {
    const date = new Date(conversation.updatedAt);
    let group: string;

    if (date >= today) {
      group = "今天";
    } else if (date >= yesterday) {
      group = "昨天";
    } else if (date >= lastWeek) {
      group = "最近 7 天";
    } else {
      group = "更早";
    }

    if (!groups[group]) {
      groups[group] = [];
    }
    groups[group].push(conversation);
  }

  return groups;
}
