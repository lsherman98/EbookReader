import type { PropsWithChildren } from "react";

import { AppSidebar } from "./Sidebar";
import { SidebarInset, SidebarProvider } from "../ui/sidebar";
import { useLocation } from "@tanstack/react-router";
import { Toaster } from "../ui/toaster";

export default function Layout({ children }: PropsWithChildren) {
  const location = useLocation();
  const sidebarWidth = location.pathname === "/reader" ? "33%" : "0";

  return (
    <SidebarProvider
      style={
        {
          "--sidebar-width": sidebarWidth,
        } as React.CSSProperties
      }
    >
      <AppSidebar />
      <SidebarInset className="ml-14">
        <header className="sticky top-0 z-5 h-[50px] flex items-center shrink-0 gap-2 border-b bg-background p-4"></header>
        <div className="flex flex-col h-[calc(100%-50px)]">
          <main className="h-full">{children}</main>
          <Toaster />
        </div>
      </SidebarInset>
    </SidebarProvider>
  );
}
