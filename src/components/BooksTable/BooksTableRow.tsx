import { BooksResponse } from "@/lib/pocketbase-types";
import { TableCell, TableRow } from "../ui/table";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "../ui/dropdown-menu";
import { Button } from "../ui/button";
import { Book, BookImage, Download, MoreHorizontal, Trash } from "lucide-react";
import { formatBookRowDate } from "@/lib/utils/formatting";

interface BookRowProps {
  book: BooksResponse;
  onDelete: (bookId: string) => void;
  onDownload: (bookId: string) => void;
  onRead: (book: BooksResponse) => void;
}

export function BookRow({ book, onDelete, onDownload, onRead }: BookRowProps) {
  const createCoverImageUrl = (file: BooksResponse) => {
    return `${import.meta.env.VITE_BASE_URL}/api/files/${file.collectionId}/${file.id}/${file.cover_image}`;
  };

  return (
    <TableRow key={book.id}>
      <TableCell className="w-36 text-center">
        {book.cover_image ? (
          <img src={createCoverImageUrl(book)} alt={book.title} className="w-24 h-32 object-cover mx-auto" />
        ) : (
          <div className="w-24 h-32 border flex flex-col items-center justify-center p-2 mx-auto">
            <BookImage className="h-12 w-12 text-muted-foreground" />
            <div className="mt-2" />
            <span className="text-sm text-muted-foreground">No Cover</span>
          </div>
        )}
      </TableCell>
      <TableCell className="w-1/4 align-middle font-bold">{book.title}</TableCell>
      <TableCell className="w-1/6 align-middle">{book.author}</TableCell>
      <TableCell className="w-1/6 align-middle">{formatBookRowDate(book.created)}</TableCell>
      <TableCell className="w-48">
        <div className="flex justify-center">
          <div className="relative">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon">
                  <MoreHorizontal className="h-4 w-4" />
                  <span className="sr-only">Actions</span>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={() => onRead(book)}>
                  <Book className="mr-2 h-4 w-4" />
                  <span>Read</span>
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => onDownload(book.id)}>
                  <Download className="mr-2 h-4 w-4" />
                  <span>Download</span>
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => onDelete(book.id)} className="text-destructive focus:text-destructive">
                  <Trash className="mr-2 h-4 w-4" />
                  <span>Delete</span>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </TableCell>
    </TableRow>
  );
}
