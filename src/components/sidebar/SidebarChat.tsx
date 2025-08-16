import { MessageCircleDashed, SquarePen } from "lucide-react";
import { Button } from "../ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "../ui/popover";
import { ChatList } from "./ChatList";
import { Input } from "../ui/input";
import { SidebarGroup, SidebarGroupContent } from "../ui/sidebar";
import { Switch } from "../ui/switch";
import { useAddChat, useUpdateChat } from "@/lib/api/mutations";
import { SidebarChatContent } from "./SidebarChatContent";
import { useCallback, useEffect, useState } from "react";
import { useGetChats } from "@/lib/api/queries";
import { ChatsRecord } from "@/lib/pocketbase-types";

export function SidebarChat({ bookId }: { bookId: string }) {
  const updateChatMutation = useUpdateChat();
  const addChatMutation = useAddChat();
  const { data: chatsData, isPending: isChatsPending } = useGetChats(bookId);

  const [selectedChat, setSelectedChat] = useState<ChatsRecord>();
  const [isEditingTitle, setIsEditingTitle] = useState(false);
  const [chatTitle, setChatTitle] = useState(selectedChat?.title || "");
  const [chatWithChapter, setChatWithChapter] = useState(false);

  const handleTitleChange = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedChat) return;
    setIsEditingTitle(false);

    if (chatTitle === selectedChat.title) return;
    updateChatMutation.mutate({ chatId: selectedChat.id, title: chatTitle });
  };

  const addChat = useCallback(async () => {
    const newChat = bookId && (await addChatMutation.mutateAsync(bookId));
    if (newChat) {
      setSelectedChat(newChat);
      setIsEditingTitle(true);
    }
  }, [addChatMutation, bookId]);

  useEffect(() => {
    if (!isChatsPending && chatsData?.length && !selectedChat) {
      setSelectedChat(chatsData[0]);
    }
  }, [isChatsPending, chatsData, selectedChat, addChat]);

  useEffect(() => {
    if (selectedChat) setChatTitle(selectedChat.title);
  }, [selectedChat]);

  return (
    <div className="h-full">
      <div className="flex items-center justify-between p-4 border-b h-[42px]">
        <Popover>
          <PopoverTrigger asChild>
            <Button variant={"ghost"} size={"icon"} disabled={!bookId}>
              <MessageCircleDashed />
            </Button>
          </PopoverTrigger>
          <PopoverContent
            align="start"
            alignOffset={-6}
            sideOffset={12}
            className="w-72 p-0 py-2 max-h-[500px] overflow-y-auto"
          >
            <ChatList
              chats={chatsData || []}
              selectedChatId={selectedChat?.id}
              setSelectedChat={setSelectedChat}
              isCollapsed={false}
              bookId={bookId}
            />
          </PopoverContent>
        </Popover>
        <div className="flex-1 flex items-center justify-center relative group h-full">
          {isEditingTitle ? (
            <form onSubmit={handleTitleChange} className="w-full max-w-xs">
              <Input
                value={chatTitle}
                onChange={(e) => setChatTitle(e.target.value)}
                autoFocus
                className="h-8 text-center"
                onBlur={handleTitleChange}
              />
            </form>
          ) : (
            <div className="flex items-center">
              <span className="text-sm font-medium truncate max-w-[200px]" onClick={() => setIsEditingTitle(true)}>
                {chatTitle}
              </span>
            </div>
          )}
        </div>
        <Button variant={"ghost"} size={"icon"} onClick={addChat} disabled={!bookId}>
          <SquarePen />
        </Button>
      </div>
      <div className="flex items-center justify-between px-4 py-2 border-b">
        <span className="text-xs font-medium text-muted-foreground">Context</span>
        <div className="flex items-center space-x-2">
          <span className={`text-xs ${!chatWithChapter ? "font-medium" : "text-muted-foreground"}`}>Book</span>
          <Switch checked={chatWithChapter} onCheckedChange={setChatWithChapter} disabled={!bookId} />
          <span className={`text-xs ${chatWithChapter ? "font-medium" : "text-muted-foreground"}`}>Chapter</span>
        </div>
      </div>
      <div className="h-[calc(100%-79px)]">
        <SidebarGroup className="px-0 h-full">
          <SidebarGroupContent className="h-full">
            <SidebarChatContent
              selectedChatId={selectedChat?.id}
              selectedBookId={bookId}
              selectedChapterId={chatWithChapter ? selectedChat?.id : undefined}
            />
          </SidebarGroupContent>
        </SidebarGroup>
      </div>
    </div>
  );
}
