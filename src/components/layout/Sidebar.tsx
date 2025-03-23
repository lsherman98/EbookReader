import * as React from "react";

import { Sidebar, SidebarContent, SidebarGroup, SidebarGroupContent, SidebarHeader } from "@/components/ui/sidebar";
import MainNavigation from "./MainNavigation";
import { NestedSideBarContent } from "../NestedSideBarContent";
import { MessageCircleDashed, SquarePen } from "lucide-react";
import { Button } from "../ui/button";
import { useAddChat, useUpdateChat } from "@/lib/api/mutations";
import { useEffect, useState } from "react";
import { Popover, PopoverContent, PopoverTrigger } from "../ui/popover";
import { ChatList } from "../ChatList";
import { useGetChats } from "@/lib/api/queries";
import { Input } from "../ui/input";
import { ChatsRecord } from "@/lib/pocketbase-types";

export function AppSidebar({ ...props }: React.ComponentProps<typeof Sidebar>) {
  const [selectedChat, setSelectedChat] = useState<ChatsRecord>();
  const [isEditingTitle, setIsEditingTitle] = useState(false);
  const [chatTitle, setChatTitle] = useState(selectedChat?.title || "");

  const { data: chatsData, isPending: isChatsPending } = useGetChats();

  const addChatMutation = useAddChat();
  const updateChatMutation = useUpdateChat();

  const addChat = async () => {
    const newChat = await addChatMutation.mutateAsync("93259vt13kfeme2");
    if (newChat) {
      setSelectedChat(newChat);
      setIsEditingTitle(true);
    }
  };

  useEffect(() => {
    if (!isChatsPending && chatsData?.length && !selectedChat) {
      setSelectedChat(chatsData[0]);
    }
  }, [isChatsPending, chatsData, selectedChat]);

  useEffect(() => {
    if (selectedChat) {
      setChatTitle(selectedChat.title);
    }
  }, [selectedChat]);

  const handleTitleChange = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedChat) return;

    setIsEditingTitle(false);
    updateChatMutation.mutate({ id: selectedChat.id, title: chatTitle });
  };

  return (
    <Sidebar collapsible="icon" className="overflow-hidden [&>[data-sidebar=sidebar]]:flex-row" {...props}>
      <MainNavigation />
      <Sidebar collapsible="none" className="hidden flex-1 md:flex">
        <SidebarHeader className="gap-3.5 border-b p-4 h-[50px] justify-between flex-row w-full items-center">
          <Popover>
            <PopoverTrigger asChild>
              <Button variant={"ghost"} size={"icon"}>
                <MessageCircleDashed />
              </Button>
            </PopoverTrigger>
            <PopoverContent align="start" className="w-48 p-0 py-2 max-h-[300px] overflow-y-auto">
              <ChatList
                chats={chatsData || []}
                selectedChatId={selectedChat?.id}
                setSelectedChat={setSelectedChat}
                isCollapsed={false}
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

          <Button variant={"ghost"} size={"icon"} onClick={addChat}>
            <SquarePen />
          </Button>
        </SidebarHeader>
        <SidebarContent>
          <SidebarGroup className="px-0 h-full">
            <SidebarGroupContent className="h-full">
              <NestedSideBarContent selectedChatId={selectedChat?.id} />
            </SidebarGroupContent>
          </SidebarGroup>
        </SidebarContent>
      </Sidebar>
    </Sidebar>
  );
}
