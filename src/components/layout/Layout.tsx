import type { PropsWithChildren } from "react";

import { AppSidebar } from "./Sidebar";
import { SidebarInset, SidebarProvider } from "../ui/sidebar";

export default function Layout({ children }: PropsWithChildren) {
    return (
        <SidebarProvider
            style={
                {
                    "--sidebar-width": "33%",
                } as React.CSSProperties
            }
        >
            <AppSidebar />
            <SidebarInset>
                <header className="sticky top-0 flex shrink-0 items-center gap-2 border-b bg-background p-4 h-[50px]">
                </header>
                <div className="flex flex-1 flex-col gap-4 p-4">
                    <main>{children}</main>
                </div>
            </SidebarInset>
        </SidebarProvider>
    );
}
