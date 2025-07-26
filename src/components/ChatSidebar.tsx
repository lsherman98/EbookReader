import { useAddChat, useUpdateChat } from "@/lib/api/mutations";
import { useGetBooks, useGetChats } from "@/lib/api/queries";
import { ChatsRecord } from "@/lib/pocketbase-types";
import { useCallback, useEffect, useState } from "react";
import { Sidebar, SidebarContent, SidebarGroup, SidebarGroupContent, SidebarHeader } from "./ui/sidebar";
import { Popover, PopoverContent, PopoverTrigger } from "./ui/popover";
import { Button } from "./ui/button";
import { MessageCircleDashed, SquarePen } from "lucide-react";
import { ChatList } from "./ChatList";
import { Input } from "./ui/input";
import { ChatSideBarContent } from "./ChatSideBarContent";
import { Link } from "@tanstack/react-router";
import { CloudAlert } from "lucide-react";

export function ChatSidebar({ hidden }: { hidden?: boolean }) {
  const [selectedChat, setSelectedChat] = useState<ChatsRecord>();
  const [isEditingTitle, setIsEditingTitle] = useState(false);
  const [chatTitle, setChatTitle] = useState(selectedChat?.title || "");
  const [bookId, setBookId] = useState<string>();
  const [chatWithChapter] = useState(false);

  const { data: bookData, isPending: isBooksPending } = useGetBooks();
  const { data: chatsData, isPending: isChatsPending } = useGetChats(bookId);

  const addChatMutation = useAddChat();
  const updateChatMutation = useUpdateChat();

  const addChat = useCallback(async () => {
    const newChat = bookId && (await addChatMutation.mutateAsync(bookId));
    if (newChat) {
      setSelectedChat(newChat);
      setIsEditingTitle(true);
    }
  }, [addChatMutation, bookId]);

  useEffect(() => {
    if (!isBooksPending && bookData?.items.length) {
      setBookId(bookData.items[0].id);
    } else {
      setBookId(undefined);
    }
  }, [bookData, isBooksPending]);

  useEffect(() => {
    if (!isChatsPending && chatsData?.length && !selectedChat) {
      setSelectedChat(chatsData[0]);
    }
  }, [isChatsPending, chatsData, selectedChat, addChat]);

  useEffect(() => {
    if (selectedChat) {
      setChatTitle(selectedChat.title);
    }
  }, [selectedChat]);

  const handleTitleChange = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedChat) return;
    setIsEditingTitle(false);

    if (chatTitle === selectedChat.title) return;
    updateChatMutation.mutate({ chatId: selectedChat.id, title: chatTitle });
  };

  if (isBooksPending) {
    return (
      <Sidebar collapsible="none" className={`${hidden ? "hidden" : ""} flex-1 md:flex ml-14`}>
        <SidebarHeader className="gap-3.5 border-b p-4 h-[50px] justify-between flex-row w-full items-center">
          Loading...
        </SidebarHeader>
        <SidebarContent>
          <SidebarGroup className="px-0 h-full">
            <SidebarGroupContent className="h-full">Loading...</SidebarGroupContent>
          </SidebarGroup>
        </SidebarContent>
      </Sidebar>
    );
  }

  if (!bookId) {
    return (
      <Sidebar collapsible="none" className={`${hidden ? "hidden" : ""} flex-1 md:flex ml-14`}>
        <SidebarHeader className="gap-3.5 border-b p-4 h-[50px] justify-between flex-row w-full items-center"></SidebarHeader>
        <SidebarContent>
          <SidebarGroup className="px-0 h-full">
            <SidebarGroupContent className="h-full flex flex-col items-center justify-center">
              <CloudAlert className="h-12 w-12 text-muted-foreground mb-2" />
              <p className="text-md text-muted-foreground text-center">
                No book selected. Please upload a book to start chatting!
              </p>
              <Link to="/upload" className="mt-4">
                <Button>Upload Book</Button>
              </Link>
            </SidebarGroupContent>
          </SidebarGroup>
        </SidebarContent>
      </Sidebar>
    );
  }

  return (
    <Sidebar collapsible="none" className={`${hidden ? "hidden" : ""} flex-1 md:flex ml-14`}>
      <SidebarHeader className="gap-3.5 border-b p-4 h-[50px] justify-between flex-row w-full items-center">
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
        <div className="flex-1 flex items-center justify-center relative group">
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
      </SidebarHeader>
      <SidebarContent>
        <SidebarGroup className="px-0 h-full">
          <SidebarGroupContent className="h-full">
            <ChatSideBarContent
              selectedChatId={selectedChat?.id}
              selectedBookId={bookId}
              selectedChapterId={chatWithChapter ? selectedChat?.id : undefined}
            />
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
    </Sidebar>
  );
}
