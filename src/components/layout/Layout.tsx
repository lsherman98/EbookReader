import type { PropsWithChildren } from "react";

import { AppSidebar } from "./Sidebar";
import { SidebarInset, SidebarProvider, SidebarTrigger } from "../ui/sidebar";
import { Separator } from "../ui/separator";

export default function Layout({ children }: PropsWithChildren) {
    return (
        <SidebarProvider
            style={
                {
                    "--sidebar-width": "1200px",
                } as React.CSSProperties
            }
        >
            <AppSidebar />
            <SidebarInset>
                <header className="sticky top-0 flex shrink-0 items-center gap-2 border-b bg-background p-4">
                    <SidebarTrigger className="-ml-1" />
                    <Separator orientation="vertical" className="mr-2 h-4" />
                </header>
                <div className="flex flex-1 flex-col gap-4 p-4">
                    <main>{children}</main>
                </div>
            </SidebarInset>
        </SidebarProvider>
    );
}
