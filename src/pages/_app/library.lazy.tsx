import { createLazyFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";
import { CloudAlert } from "lucide-react";
import { BooksResponse } from "@/lib/pocketbase-types";
import { useGetBooks, useSearchBooks, useGetUploadLimitReached } from "@/lib/api/queries";
import { useDeleteBook, useDownloadBook } from "@/lib/api/mutations";
import { useState } from "react";
import { BooksTable } from "@/components/BooksTable/BooksTable";

export const Route = createLazyFileRoute("/_app/library")({
  component: LibraryPage,
});

function LibraryPage() {
  const [currentPage, setCurrentPage] = useState(1);
  const [searchQuery, setSearchQuery] = useState("");

  const limit = 20;

  const { data: booksData } = useGetBooks(currentPage, limit);
  const { data: searchResults } = useSearchBooks(searchQuery);
  const { data: uploadLimitReached } = useGetUploadLimitReached();
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

  const displayBooks = searchQuery ? searchResults || [] : booksData?.items || [];
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
      uploadLimitReached={uploadLimitReached}
    />
  );
}
