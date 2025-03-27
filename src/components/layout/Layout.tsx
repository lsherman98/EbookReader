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
      <SidebarInset>
        <header className="sticky top-0 flex shrink-0 items-center gap-2 border-b bg-background p-4 h-[50px]"></header>
        <div className="ml-14 flex flex-1 flex-col">
          <main className="flex h-full w-full">{children}</main>
          <Toaster />
        </div>
      </SidebarInset>
    </SidebarProvider>
  );
}
