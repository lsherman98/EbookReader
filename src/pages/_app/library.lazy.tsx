import { createLazyFileRoute, Link } from "@tanstack/react-router";
import { useGetFiles } from "@/lib/api/queries";
import { Card, CardContent, CardFooter, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { BookIcon, FileIcon, MoreVertical, DownloadIcon, PencilIcon, TrashIcon, CloudAlert } from "lucide-react";
import { FilesResponse } from "@/lib/pocketbase-types";
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
  const { data } = useGetFiles();

  const createCoverImageUrl = (file: FilesResponse) => {
    return `${import.meta.env.VITE_BASE_URL}/api/files/${file.collectionId}/${file.id}/${file.cover_image}`;
  };

  if (data?.totalItems === 0) {
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
    <div className="h-full overflow-auto">
      <div className="grid grid-cols-1 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4 p-4">
        {data?.items.map((file: FilesResponse) => (
          <Card key={file.id}>
            <CardHeader className="p-0 h-48 flex items-center justify-center">
              {file.cover_image ? (
                <img
                  src={createCoverImageUrl(file)}
                  alt={file.title}
                  className="object-cover h-full w-full"
                  style={{ objectFit: "contain" }}
                />
              ) : file.type === "epub" || file.type === "mobi" ? (
                <BookIcon className="h-16 w-16 text-muted-foreground" />
              ) : (
                <FileIcon className="h-16 w-16 text-muted-foreground" />
              )}
            </CardHeader>
            <CardContent className="pt-3 px-3 pb-0">
              <div className="space-y-1">
                <h3 className="font-semibold text-sm line-clamp-1">{file.title}</h3>
                {file.author && <p className="text-xs text-muted-foreground line-clamp-1">{file.author}</p>}
                <span className="inline-block text-xs font-medium uppercase tracking-wider bg-secondary text-secondary-foreground rounded-sm px-2 py-0.5">
                  {file.type}
                </span>
              </div>
            </CardContent>
            <CardFooter className="flex justify-end p-2">
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon" className="h-8 w-8">
                    <MoreVertical className="h-4 w-4" />
                    <span className="sr-only">Open menu</span>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem>
                    <DownloadIcon className="mr-2 h-4 w-4" />
                    Download
                  </DropdownMenuItem>
                  <Dialog>
                    <DialogTrigger asChild>
                      <DropdownMenuItem onSelect={(e) => e.preventDefault()}>
                        <PencilIcon className="mr-2 h-4 w-4" />
                        Edit
                      </DropdownMenuItem>
                    </DialogTrigger>
                    <DialogContent>
                      <DialogHeader>
                        <DialogTitle>Edit File</DialogTitle>
                      </DialogHeader>
                      <form>
                        <div className="grid gap-4 py-4">
                          <div className="space-y-2">
                            <Label htmlFor="title">Title</Label>
                            <Input id="title" required />
                          </div>
                          <div className="space-y-2">
                            <Label htmlFor="author">Author</Label>
                            <Input id="author" />
                          </div>
                        </div>
                      </form>
                      <DialogFooter>
                        <Button type="button" variant="outline">
                          Cancel
                        </Button>
                        <Button type="submit">Save Changes</Button>
                      </DialogFooter>
                    </DialogContent>
                  </Dialog>
                  <DropdownMenuSeparator />
                  <Dialog>
                    <DialogTrigger asChild>
                      <DropdownMenuItem onSelect={(e) => e.preventDefault()}>
                        <TrashIcon className="mr-2 h-4 w-4" />
                        Delete
                      </DropdownMenuItem>
                    </DialogTrigger>
                    <DialogContent>
                      <DialogHeader>
                        <DialogTitle>Confirm Deletion</DialogTitle>
                        <DialogDescription>
                          Are you sure you want to delete ""? This action cannot be undone.
                        </DialogDescription>
                      </DialogHeader>
                      <DialogFooter>
                        <Button variant="outline">Cancel</Button>
                        <Button variant="destructive">Delete</Button>
                      </DialogFooter>
                    </DialogContent>
                  </Dialog>
                </DropdownMenuContent>
              </DropdownMenu>
            </CardFooter>
          </Card>
        ))}
      </div>
      <div className="fixed bottom-0 left-0 right-0 bg-background border-t border-border p-4">
        <div className="flex justify-end items-center gap-4">
          <p className="text-sm text-muted-foreground">
            Showing {data?.items.length} of {data?.totalItems} files
          </p>
          <Link to="/upload">
            <Button>Upload More Files</Button>
          </Link>
        </div>
      </div>
    </div>
  );
}
