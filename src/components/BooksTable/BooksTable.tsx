import { BooksResponse } from "@/lib/pocketbase-types";
import { Search } from "lucide-react";
import { Input } from "../ui/input";
import { Table, TableBody } from "../ui/table";
import { BooksTableHeader } from "./BooksTableHeader";
import { BookRow } from "./BooksTableRow";
import { BooksTableFooter } from "./BooksTableFooter";

interface BooksTableProps {
  books: BooksResponse[];
  searchQuery: string;
  onSearchChange: (query: string) => void;
  currentPage: number;
  totalPages: number;
  totalItems: number;
  onPageChange: (page: number) => void;
  getPageNumbers: () => (number | string)[];
  onDeleteBook: (bookId: string) => void;
  onDownloadBook: (bookId: string) => void;
  onReadBook: (book: BooksResponse) => void;
  uploadLimitReached?: boolean;
}

export function BooksTable({
  books,
  searchQuery,
  onSearchChange,
  currentPage,
  totalPages,
  totalItems,
  onPageChange,
  getPageNumbers,
  onDeleteBook,
  onDownloadBook,
  onReadBook,
  uploadLimitReached,
}: BooksTableProps) {
  return (
    <div className="flex flex-col h-full">
      <div className="flex-shrink-0 border-b">
        <div className="p-2 flex items-center justify-center">
          <div className="relative w-96">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search books..."
              className="w-full pl-10"
              value={searchQuery}
              onChange={(e) => onSearchChange(e.target.value)}
            />
          </div>
        </div>
        <Table>
          <BooksTableHeader />
        </Table>
      </div>
      <div className="flex-grow overflow-y-auto">
        <Table>
          <TableBody>
            {books.map((book) => (
              <BookRow
                key={book.id}
                book={book}
                onDelete={onDeleteBook}
                onDownload={onDownloadBook}
                onRead={onReadBook}
              />
            ))}
          </TableBody>
        </Table>
      </div>
      <div className="flex-shrink-0 border-t">
        <Table>
          <BooksTableFooter
            currentCount={books.length}
            totalCount={totalItems}
            currentPage={currentPage}
            totalPages={totalPages}
            onPageChange={onPageChange}
            getPageNumbers={getPageNumbers}
            uploadLimitReached={uploadLimitReached}
          />
        </Table>
      </div>
    </div>
  );
}
