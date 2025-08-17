import { LinkProps } from "@tanstack/react-router";
import { BookOpenText, CloudUpload, Crown, LibraryBig, LucideProps } from "lucide-react";

export interface MenuEntry {
  icon: React.ForwardRefExoticComponent<LucideProps & React.RefAttributes<SVGSVGElement>>;
  label: string;
  href: LinkProps["to"];
}

export const MENU_ENTRIES: MenuEntry[] = [
  {
    icon: LibraryBig,
    label: "Library",
    href: "/library",
  },
  {
    icon: BookOpenText,
    label: "Reader",
    href: "/reader/{-$bookId}",
  },
  {
    icon: CloudUpload,
    label: "Upload",
    href: "/upload",
  },
  {
    icon: Crown,
    label: "Upgrade",
    href: "/subscription",
  },
];
