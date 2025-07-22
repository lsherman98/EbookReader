import { LinkProps } from "@tanstack/react-router";
import { BookOpenText, CloudUpload, LibraryBig, LucideProps } from "lucide-react";

export interface MenuEntry {
  icon: React.ForwardRefExoticComponent<LucideProps & React.RefAttributes<SVGSVGElement>>;
  label: string;
  href: LinkProps["to"];
}

export const MENU_ENTRIES: MenuEntry[] = [
  {
    icon: LibraryBig,
    label: "Libary",
    href: "/library",
  },
  {
    icon: BookOpenText,
    label: "Reader",
    href: "/reader/$bookId",
  },
  {
    icon: CloudUpload,
    label: "Upload",
    href: "/upload",
  },
];
