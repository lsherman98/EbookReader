import { MENU_ENTRIES } from "@/config/menu";
import { cn } from "@/lib/utils/utils";
import UserMenu from "./UserMenu";
import { Tooltip, TooltipContent, TooltipTrigger } from "../ui/tooltip";
import { Link, useRouterState } from "@tanstack/react-router";

const MainNavigation: React.FC = () => {
  const { resolvedLocation } = useRouterState();

  return (
    <>
      <aside className="fixed inset-y-0 left-0 z-10 hidden w-14 flex-col border-r bg-background sm:flex">
        <nav className="flex flex-col items-center gap-4 px-2 sm:py-4">
          {MENU_ENTRIES.map((entry) => (
            <Tooltip key={entry.href} delayDuration={0}>
              <TooltipTrigger asChild>
                <Link
                  to={entry.href}
                  className={cn(
                    "flex h-9 w-9 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:text-foreground md:h-8 md:w-8",
                    resolvedLocation?.href === entry.href && "bg-accent text-accent-foreground",
                  )}
                >
                  <entry.icon className="h-5 w-5" />
                  <span className="sr-only">{entry.label}</span>
                </Link>
              </TooltipTrigger>
              <TooltipContent side="right">{entry.label}</TooltipContent>
            </Tooltip>
          ))}
        </nav>
        <nav className="mt-auto flex flex-col items-center gap-4 px-2 sm:py-4">
          <UserMenu />
        </nav>
      </aside>
    </>
  );
};

export default MainNavigation;
