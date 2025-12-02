import { createLazyFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";
import { CloudAlert } from "lucide-react";
import { BooksResponse } from "@/lib/pocketbase-types";
import { useGetBooks, useSearchBooks, useGetUploadLimitReached } from "@/lib/api/queries";
import { useDeleteBook, useDownloadBook } from "@/lib/api/mutations";
import { useState } from "react";
import { BooksTable } from "@/components/booksTable/BooksTable";

export const Route = createLazyFileRoute("/_app/library")({
  component: LibraryPage,
});

function LibraryPage() {
  const navigate = useNavigate();
  const limit = 20;

  const [currentPage, setCurrentPage] = useState(1);
  const [searchQuery, setSearchQuery] = useState("");

  const { data: booksData } = useGetBooks(currentPage, limit);
  const { data: searchResults, isFetching: isSearching } = useSearchBooks(searchQuery);
  const { data: uploadLimitReached } = useGetUploadLimitReached();

  const deleteBookMutation = useDeleteBook();
  const downloadBookMutation = useDownloadBook();

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

  const displayBooks = searchQuery != "" || isSearching ? searchResults || [] : booksData?.items || [];
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
      onDeleteBook={handleDeleteBook}
      onDownloadBook={handleDownloadBook}
      onReadBook={handleReadBook}
      uploadLimitReached={uploadLimitReached}
    />
  );
}
