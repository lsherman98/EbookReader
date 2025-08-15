import { useState } from "react";
import { Sidebar, SidebarContent, SidebarGroup, SidebarGroupContent, SidebarHeader } from "../ui/sidebar";
import { Button } from "../ui/button";
import { Link } from "@tanstack/react-router";
import { CloudAlert } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../ui/tabs";
import { SidebarChat } from "./SidebarChat";
import { SidebarHighlights } from "./SidebarHighlights";
import { QueryObserver, useQueryClient } from "@tanstack/react-query";
import { BooksResponse } from "@/lib/pocketbase-types";
import { ExpandChapters } from "@/lib/types";

export function MainSidebar({ hidden }: { hidden?: boolean }) {
  const [bookId, setBookId] = useState<string>();
  const queryClient = useQueryClient();

  const observer = new QueryObserver(queryClient, {
    queryKey: ["book"],
    enabled: false,
  });

  observer.subscribe((result) => {
    if (result.isError) return;
    if (result.isSuccess) {
      const data = result.data as BooksResponse<ExpandChapters>;
      setBookId(data.id);
    } else {
      setBookId(undefined);
    }
  });

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
      <Tabs defaultValue="chat" className="w-full h-full max-h-[94vh]">
        <SidebarHeader className="gap-3.5 border-b p-4 h-[50px] justify-center flex-row w-full items-center">
          <TabsList>
            <TabsTrigger value="chat">Chat</TabsTrigger>
            <TabsTrigger value="highlights">Highlights</TabsTrigger>
          </TabsList>
        </SidebarHeader>
        <SidebarContent className="h-full overflow-hidden pb-14">
          <TabsContent value="chat" className="h-full mt-0">
            <SidebarChat bookId={bookId} />
          </TabsContent>
          <TabsContent value="highlights" className="h-full">
            <SidebarHighlights bookId={bookId} />
          </TabsContent>
        </SidebarContent>
      </Tabs>
    </Sidebar>
  );
}
