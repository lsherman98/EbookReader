import { cn } from "@/lib/utils/utils";
import { Button } from "@/components/ui/button";
import { ChatsRecord } from "@/lib/pocketbase-types";
import { Trash2 } from "lucide-react";
import { useDeleteChat } from "@/lib/api/mutations";
import { useEffect } from "react";

interface ChatListProps {
  isCollapsed: boolean;
  chats: ChatsRecord[];
  onClick?: () => void;
  selectedChatId?: string;
  setSelectedChat: (chat: ChatsRecord) => void;
}

export function ChatList({ chats, selectedChatId, setSelectedChat, isCollapsed }: ChatListProps) {
  const deleteChatMutation = useDeleteChat();

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleString(undefined, {
      month: "short",
      day: "numeric",
      hour: "numeric",
      minute: "2-digit",
    });
  };

  useEffect(() => {
    if (chats.length > 0 && !selectedChatId) {
      setSelectedChat(chats[0]);
    }
  }, [chats, selectedChatId, setSelectedChat]);

  return (
    <div
      data-collapsed={isCollapsed}
      className="relative group flex flex-col h-full bg-muted/10 dark:bg-muted/20 gap-4 p-2 data-[collapsed=true]:p-2 "
    >
      <nav className="grid gap-3 group-[[data-collapsed=true]]:justify-center group-[[data-collapsed=true]]:px-2">
        {chats.map((chat, index) => (
          <div key={index} className="relative group/item">
            <Button
              variant={chat.id === selectedChatId ? "secondary" : "ghost"}
              size={"default"}
              onClick={() => setSelectedChat(chat)}
              className="w-full justify-start py-6 px-4 hover:bg-accent/80"
            >
              <div className="flex flex-col w-full truncate text-left">
                <span className={cn("truncate", chat.id === selectedChatId ? "font-medium" : "font-normal")}>
                  {chat.title}
                </span>
                <span className="text-xs text-muted-foreground truncate">
                  {chat.created && formatDate(chat.updated || chat.created)}
                </span>
              </div>
            </Button>
            {chat.id !== selectedChatId && (
              <Button
                variant="ghost"
                size="icon"
                className="absolute right-2 top-1/2 -translate-y-1/2 opacity-0 group-hover/item:opacity-80 transition-opacity hover:bg-transparent"
                onClick={(e) => {
                  e.stopPropagation();
                  deleteChatMutation.mutate({ chatId: chat.id });
                }}
                aria-label="Delete chat"
              >
                <Trash2 className="h-4 w-4 text-muted-foreground group-hover/item:hover:text-destructive transition-colors" />
              </Button>
            )}
          </div>
        ))}
      </nav>
    </div>
  );
}
