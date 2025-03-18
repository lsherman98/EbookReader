import { Link, useRouterState } from "@tanstack/react-router";
import { GearIcon, RocketIcon } from "@radix-ui/react-icons";
import { MENU_ENTRIES } from "@/config/menu";
import { cn } from "@/lib/utils";
import UserMenu from "./UserMenu";
import {
    Sidebar,
    SidebarContent,
    SidebarFooter,
    SidebarGroup,
    SidebarGroupContent,
    SidebarHeader,
    SidebarMenu,
    SidebarMenuButton,
    SidebarMenuItem,
} from "../ui/sidebar";
import { Tooltip, TooltipContent, TooltipTrigger } from "../ui/tooltip";

const MainNavigation: React.FC = () => {
    const { resolvedLocation } = useRouterState();

    return (
        <>
            <aside className="fixed inset-y-0 left-0 z-10 hidden w-14 flex-col border-r bg-background sm:flex">
                <nav className="flex flex-col items-center gap-4 px-2 sm:py-4">
                    <Link
                        to="/"
                        className={cn(
                            "group flex h-9 w-9 shrink-0 items-center justify-center gap-2 rounded-full bg-primary text-lg font-semibold text-primary-foreground md:h-8 md:w-8 md:text-base"
                        )}
                    >
                        <RocketIcon className="h-4 w-4 transition-all group-hover:scale-110" />
                        <span className="sr-only">Pocket SaaS</span>
                    </Link>

                    {MENU_ENTRIES.map((entry) => (
                        <Tooltip key={entry.href} delayDuration={0}>
                            <TooltipTrigger asChild>
                                <Link
                                    to={entry.href}
                                    className={cn(
                                        "flex h-9 w-9 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:text-foreground md:h-8 md:w-8",
                                        resolvedLocation.href === entry.href &&
                                            "bg-accent text-accent-foreground"
                                    )}
                                >
                                    <entry.icon className="h-5 w-5" />
                                    <span className="sr-only">
                                        {entry.label}
                                    </span>
                                </Link>
                            </TooltipTrigger>
                            <TooltipContent side="right">
                                {entry.label}
                            </TooltipContent>
                        </Tooltip>
                    ))}
                </nav>
                <nav className="mt-auto flex flex-col items-center gap-4 px-2 sm:py-4">
                    <Tooltip delayDuration={0}>
                        <TooltipTrigger asChild>
                            <Link
                                href="#"
                                className="flex h-9 w-9 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:text-foreground md:h-8 md:w-8"
                            >
                                <GearIcon className="h-5 w-5" />
                                <span className="sr-only">Settings</span>
                            </Link>
                        </TooltipTrigger>
                        <TooltipContent side="right">Settings</TooltipContent>
                    </Tooltip>
                    <UserMenu />
                </nav>
            </aside>

            <Sidebar
                collapsible="none"
                className="!w-[calc(var(--sidebar-width-icon)_+_1px)] border-r"
            >
                <SidebarHeader>
                    <SidebarMenu>
                        <SidebarMenuItem>
                            <SidebarMenuButton size="lg" asChild>
                                <Link to="/">
                                    <RocketIcon />
                                </Link>
                            </SidebarMenuButton>
                        </SidebarMenuItem>
                    </SidebarMenu>
                </SidebarHeader>
                <SidebarContent>
                    <SidebarGroup>
                        <SidebarGroupContent>
                            <SidebarMenu>
                                {MENU_ENTRIES.map((item) => (
                                    <SidebarMenuItem key={item.label}>
                                        <SidebarMenuButton
                                            tooltip={{
                                                children: item.label,
                                                hidden: false,
                                            }}
                                            isActive={
                                                resolvedLocation.href ===
                                                item.label
                                            }
                                        >
                                            <Link
                                                to={item.href}
                                                className={cn(
                                                    "",
                                                    resolvedLocation.href ===
                                                        item.href && ""
                                                )}
                                            >
                                                <item.icon />
                                            </Link>
                                        </SidebarMenuButton>
                                    </SidebarMenuItem>
                                ))}
                            </SidebarMenu>
                        </SidebarGroupContent>
                    </SidebarGroup> 
                </SidebarContent>
                <SidebarFooter>
                    <SidebarMenuButton size="lg" asChild>
                        <Link to="/">
                            <GearIcon />
                        </Link>
                    </SidebarMenuButton>
                    <UserMenu />
                </SidebarFooter>
            </Sidebar>
        </>
    );
};

export default MainNavigation;
