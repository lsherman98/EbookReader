import type { PropsWithChildren } from "react";

import { AppSidebar } from "./Sidebar";
import { SidebarInset, SidebarProvider } from "../ui/sidebar";
import { useLocation } from "@tanstack/react-router";

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
        <div className="flex flex-1 flex-col gap-4 p-4">
          <main>{children}</main>
        </div>
      </SidebarInset>
    </SidebarProvider>
  );
}
