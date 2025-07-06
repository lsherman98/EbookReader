import * as React from "react";

import { Sidebar } from "@/components/ui/sidebar";
import MainNavigation from "./MainNavigation";

import { ChatSidebar } from "../ChatSidebar";
import { useLocation } from "@tanstack/react-router";

export function AppSidebar({ ...props }: React.ComponentProps<typeof Sidebar>) {
  const location = useLocation();

  return (
    <Sidebar collapsible="icon" className="overflow-hidden [&>[data-sidebar=sidebar]]:flex-row" {...props}>
      <MainNavigation />
      <ChatSidebar hidden={!location.pathname.startsWith("/reader")} />
    </Sidebar>
  );
}
