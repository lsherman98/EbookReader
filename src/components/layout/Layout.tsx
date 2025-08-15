import type { PropsWithChildren } from "react";

import { AppSidebar } from "../sidebar/Sidebar";
import { SidebarInset, SidebarProvider } from "../ui/sidebar";
import { useLocation } from "@tanstack/react-router";
import { Toaster } from "../ui/toaster";

export default function Layout({ children }: PropsWithChildren) {
  const location = useLocation();
  const sidebarWidth = location.pathname.startsWith("/reader") ? "33%" : "0";

  return (
    <SidebarProvider
      style={
        {
          "--sidebar-width": sidebarWidth,
        } as React.CSSProperties
      }
    >
      <AppSidebar />
      <SidebarInset
        className=""
        style={{
          width: `calc(100% - ${sidebarWidth})`,
          marginLeft: sidebarWidth === "0" ? "56px" : sidebarWidth,
        }}
      >
        <header className="sticky top-0 z-5 h-[50px] flex items-center shrink-0 gap-2 border-b bg-background p-4"></header>
        <div className="flex flex-col h-[calc(100vh-50px)]">
          <main className="h-full overflow-y-auto">{children}</main>
          <Toaster />
        </div>
      </SidebarInset>
    </SidebarProvider>
  );
}
