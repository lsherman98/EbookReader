import { createLazyFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";
import { Book, BookImage, CloudAlert, Download, MoreHorizontal, Search, Trash } from "lucide-react";
import { BooksResponse } from "@/lib/pocketbase-types";
import { useGetBooks, useSearchBooks } from "@/lib/api/queries";
import { useDeleteBook, useDownloadBook } from "@/lib/api/mutations";
import { Table, TableBody, TableCell, TableFooter, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
  PaginationEllipsis,
} from "@/components/ui/pagination";
import { useState } from "react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";

export const Route = createLazyFileRoute("/_app/library")({
  component: LibraryPage,
});

interface BookRowProps {
  book: BooksResponse;
  onDelete: (bookId: string) => void;
  onDownload: (bookId: string) => void;
  onRead: (book: BooksResponse) => void;
}

function BookRow({ book, onDelete, onDownload, onRead }: BookRowProps) {
  const createCoverImageUrl = (file: BooksResponse) => {
    return `${import.meta.env.VITE_BASE_URL}/api/files/${file.collectionId}/${file.id}/${file.cover_image}`;
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return new Intl.DateTimeFormat("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    }).format(date);
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
      <TableCell className="w-1/6 align-middle">{formatDate(book.created)}</TableCell>
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

function BooksTableHeader() {
  return (
    <TableHeader>
      <TableRow>
        <TableHead className="w-36 text-center">Cover</TableHead>
        <TableHead className="w-1/4">Title</TableHead>
        <TableHead className="w-1/6">Author</TableHead>
        <TableHead className="w-1/6">Uploaded</TableHead>
        <TableHead className="w-48 text-center">Actions</TableHead>
      </TableRow>
    </TableHeader>
  );
}

interface BooksTableFooterProps {
  currentCount: number;
  totalCount: number;
  currentPage: number;
  totalPages: number;
  onPageChange: (page: number) => void;
  getPageNumbers: () => (number | string)[];
}

function BooksTableFooter({
  currentCount,
  totalCount,
  currentPage,
  totalPages,
  onPageChange,
  getPageNumbers,
}: BooksTableFooterProps) {
  return (
    <TableFooter>
      <TableRow>
        <TableCell colSpan={5}>
          <div className="flex justify-between items-center gap-4">
            <div className="text-sm text-muted-foreground whitespace-nowrap">
              Showing {currentCount} of {totalCount}
            </div>
            <div className="flex items-center gap-4">
              <Link to="/upload">
                <Button variant={"outline"}>Upload More Files</Button>
              </Link>
              <Pagination>
                <PaginationContent>
                  <PaginationItem>
                    <PaginationPrevious
                      onClick={() => onPageChange(currentPage - 1)}
                      className={currentPage === 1 ? "pointer-events-none opacity-50" : "cursor-pointer"}
                    />
                  </PaginationItem>
                  {getPageNumbers().map((page, index) =>
                    page === "..." ? (
                      <PaginationItem key={`ellipsis-${index}`}>
                        <PaginationEllipsis />
                      </PaginationItem>
                    ) : (
                      <PaginationItem key={`page-${page}`}>
                        <PaginationLink
                          onClick={() => onPageChange(page as number)}
                          isActive={currentPage === page}
                          className="cursor-pointer"
                        >
                          {page}
                        </PaginationLink>
                      </PaginationItem>
                    ),
                  )}
                  <PaginationItem>
                    <PaginationNext
                      onClick={() => onPageChange(currentPage + 1)}
                      className={
                        currentPage === totalPages || totalPages === 0
                          ? "pointer-events-none opacity-50"
                          : "cursor-pointer"
                      }
                    />
                  </PaginationItem>
                </PaginationContent>
              </Pagination>
            </div>
          </div>
        </TableCell>
      </TableRow>
    </TableFooter>
  );
}

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
}

function BooksTable({
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
          />
        </Table>
      </div>
    </div>
  );
}

function LibraryPage() {
  const [currentPage, setCurrentPage] = useState(1);
  const [searchQuery, setSearchQuery] = useState("");

  const limit = 50;

  const { data: booksData } = useGetBooks(currentPage, limit);
  const { data: searchResults } = useSearchBooks(searchQuery);
  const deleteBookMutation = useDeleteBook();
  const downloadBookMutation = useDownloadBook();
  const navigate = useNavigate();

  const totalPages = booksData ? Math.ceil(booksData.totalItems / limit) : 0;

  const handleDeleteBook = async (bookId: string) => {
    await deleteBookMutation.mutateAsync(bookId);
  };

  const handleDownloadBook = async (bookId: string) => {
    await downloadBookMutation.mutateAsync(bookId);
  };

  const handleReadBook = (book: BooksResponse) => {
    navigate({
      to: `/reader/${book.id}`,
      search: { chapter: book.current_chapter || book.chapters?.[0] },
    });
  };

  const handlePageChange = (page: number) => {
    if (page >= 1 && page <= totalPages) {
      setCurrentPage(page);
    }
  };

  const getPageNumbers = () => {
    const pageNumbers = [];
    const maxPagesToShow = 5;

    if (totalPages <= maxPagesToShow) {
      for (let i = 1; i <= totalPages; i++) {
        pageNumbers.push(i);
      }
    } else {
      pageNumbers.push(1);

      let startPage = Math.max(2, currentPage - 1);
      let endPage = Math.min(totalPages - 1, currentPage + 1);

      if (currentPage <= 3) {
        startPage = 2;
        endPage = Math.min(4, totalPages - 1);
      }

      if (currentPage >= totalPages - 2) {
        startPage = Math.max(2, totalPages - 3);
        endPage = totalPages - 1;
      }

      if (startPage > 2) {
        pageNumbers.push("...");
      }

      for (let i = startPage; i <= endPage; i++) {
        pageNumbers.push(i);
      }

      if (endPage < totalPages - 1) {
        pageNumbers.push("...");
      }

      if (totalPages > 1) {
        pageNumbers.push(totalPages);
      }
    }

    return pageNumbers;
  };

  const displayBooks = searchResults?.length ? searchResults : booksData?.items || [];
  const totalItemsCount = booksData?.totalItems || 0;

  if (totalItemsCount === 0) {
    return (
      <div className="h-full flex items-center justify-center">
        <div className="flex flex-col items-center justify-center space-y-4">
          <CloudAlert className="h-16 w-16 text-muted-foreground" />
          <p className="text-lg text-muted-foreground text-center">
            No files found. Start by uploading your first file!
          </p>
          <Link to="/upload">
            <Button>Upload Files</Button>
          </Link>
        </div>
      </div>
    );
  }

  return (
    <BooksTable
      books={displayBooks}
      searchQuery={searchQuery}
      onSearchChange={setSearchQuery}
      currentPage={currentPage}
      totalPages={totalPages}
      totalItems={totalItemsCount}
      onPageChange={handlePageChange}
      getPageNumbers={getPageNumbers}
      onDeleteBook={handleDeleteBook}
      onDownloadBook={handleDownloadBook}
      onReadBook={handleReadBook}
    />
  );
}
