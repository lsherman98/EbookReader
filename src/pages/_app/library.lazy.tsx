import { createLazyFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";
import { Book, BookImage, CloudAlert, Download, MoreHorizontal, Trash } from "lucide-react";
import { BooksResponse } from "@/lib/pocketbase-types";
import { useGetBooks } from "@/lib/api/queries";
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

export const Route = createLazyFileRoute("/_app/library")({
  component: LibraryPage,
});

function LibraryPage() {
  const [currentPage, setCurrentPage] = useState(1);
  const limit = 10;

  const { data: booksData } = useGetBooks(currentPage, limit);
  const deleteBookMutation = useDeleteBook();
  const downloadBookMutation = useDownloadBook();
  const navigate = useNavigate();

  const totalPages = booksData ? Math.ceil(booksData.totalItems / limit) : 0;

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

  const handleDeleteBook = async (bookId: string) => {
    await deleteBookMutation.mutateAsync(bookId);
  };

  const handleDownloadBook = async (bookId: string) => {
    await downloadBookMutation.mutateAsync(bookId);
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

  if (booksData?.totalItems === 0) {
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
    <div className="h-full flex flex-col">
      <div className="flex flex-col flex-grow overflow-auto">
        <div className="min-h-0 flex-grow">
          <Table className="h-full">
            <TableHeader className="sticky top-0 bg-background z-5">
              <TableRow>
                <TableHead className="w-36 text-center">Cover</TableHead>
                <TableHead className="w-1/4">Title</TableHead>
                <TableHead className="w-1/6">Author</TableHead>
                <TableHead className="w-24 text-center">Progress</TableHead>
                <TableHead className="w-1/6">Uploaded</TableHead>
                <TableHead className="w-48 text-center">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {booksData?.items.map((book) => (
                <TableRow key={book.id}>
                  <TableCell className="w-36 text-center">
                    {book.cover_image ? (
                      <img
                        src={createCoverImageUrl(book)}
                        alt={book.title}
                        className="w-24 h-32 object-cover mx-auto"
                      />
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
                  <TableCell className="w-24 text-center align-middle">{book.reading_progress}</TableCell>
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
                            <DropdownMenuItem
                              onClick={() => {
                                navigate({ to: `/reader/${book.id}` });
                              }}
                            >
                              <Book className="mr-2 h-4 w-4" />
                              <span>Read</span>
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem onClick={() => handleDownloadBook(book.id)}>
                              <Download className="mr-2 h-4 w-4" />
                              <span>Download</span>
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem
                              onClick={() => handleDeleteBook(book.id)}
                              className="text-destructive focus:text-destructive"
                            >
                              <Trash className="mr-2 h-4 w-4" />
                              <span>Delete</span>
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
        <div className="mt-auto">
          <Table>
            <TableFooter>
              <TableRow>
                <TableCell colSpan={7}>
                  <div className="flex justify-between items-center gap-4">
                    <div className="text-sm text-muted-foreground whitespace-nowrap">
                      Showing {booksData?.items.length || 0} of {booksData?.totalItems || 0}
                    </div>
                    <div className="flex items-center gap-4">
                      <Link to="/upload">
                        <Button variant={"outline"}>Upload More Files</Button>
                      </Link>
                      <Pagination>
                        <PaginationContent>
                          <PaginationItem>
                            <PaginationPrevious
                              onClick={() => handlePageChange(currentPage - 1)}
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
                                  onClick={() => handlePageChange(page as number)}
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
                              onClick={() => handlePageChange(currentPage + 1)}
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
          </Table>
        </div>
      </div>
    </div>
  );
}
