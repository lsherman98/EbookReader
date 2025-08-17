import { AlertTriangle, Crown } from "lucide-react";
import { TableCell, TableFooter, TableRow } from "../ui/table";
import { Button } from "../ui/button";
import {
  Pagination,
  PaginationContent,
  PaginationEllipsis,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "../ui/pagination";
import { Link } from "@tanstack/react-router";

interface BooksTableFooterProps {
  currentCount: number;
  totalCount: number;
  currentPage: number;
  totalPages: number;
  onPageChange: (page: number) => void;
  getPageNumbers: () => (number | string)[];
  uploadLimitReached?: boolean;
}

export function BooksTableFooter({
  currentCount,
  totalCount,
  currentPage,
  totalPages,
  onPageChange,
  getPageNumbers,
  uploadLimitReached,
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
              {uploadLimitReached ? (
                <div className="flex items-center gap-4">
                  <div className="text-sm text-muted-foreground flex items-center gap-2 whitespace-nowrap">
                    <AlertTriangle className="h-4 w-4 text-orange-500" />
                    Upload limit reached
                  </div>
                  <Link to="/subscription">
                    <Button variant="outline" size="sm" className="gap-2">
                      <Crown className="h-4 w-4" />
                      Upgrade
                    </Button>
                  </Link>
                </div>
              ) : (
                <Link to="/upload">
                  <Button variant={"outline"}>Upload More Files</Button>
                </Link>
              )}
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
