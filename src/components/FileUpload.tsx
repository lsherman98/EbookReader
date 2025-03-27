import { Dropzone, DropZoneArea, DropzoneTrigger, useDropzone } from "@/components/ui/dropzone";
import { toast } from "@/hooks/use-toast";
import { CloudUploadIcon, ImageIcon, Trash, TriangleAlert } from "lucide-react";
import { Card, CardDescription, CardFooter, CardTitle } from "./ui/card";
import { Input } from "./ui/input";
import { FileUploadObj } from "@/pages/_app/upload.lazy";
import { Button } from "./ui/button";

export function FileUpload({
  uploads,
  setUploads,
  handleUpload,
}: {
  uploads: FileUploadObj[];
  setUploads: React.Dispatch<React.SetStateAction<FileUploadObj[]>>;
  handleUpload: () => void;
}) {
  const allowedMimeTypes = [
    "text/plain",
    "application/pdf",
    "application/x-mobipocket-ebook",
    "application/epub+zip",
    "text/html",
    "application/xml",
    "text/xml",
  ];

  const validateFile = (file: File): { valid: boolean; error?: string } => {
    if (file.size > 50 * 1024 * 1024) {
      return { valid: false, error: "File size is too large. Max file size is 50MB." };
    }

    if (!allowedMimeTypes.includes(file.type)) {
      return {
        valid: false,
        error: "Invalid file type. Allowed file types are .txt, .pdf, .mobi, .epub, .html, .xml.",
      };
    }

    if (uploads.some((upload) => upload.file.name === file.name)) {
      return { valid: false, error: "File is already staged for upload." };
    }

    return { valid: true };
  };

  const handleTitleChange = (upload: FileUploadObj) => (e: React.ChangeEvent<HTMLInputElement>) => {
    setUploads((prev) => prev.map((u) => (u.file.name === upload.file.name ? { ...u, title: e.target.value } : u)));
  };

  const handleAuthorChange = (upload: FileUploadObj) => (e: React.ChangeEvent<HTMLInputElement>) => {
    setUploads((prev) => prev.map((u) => (u.file.name === upload.file.name ? { ...u, author: e.target.value } : u)));
  };

  const dropzone = useDropzone({
    onDropFile: async (file: File) => {
      const { valid, error } = validateFile(file);

      if (!valid) {
        toast({
          title: file.name,
          description: error,
          type: "foreground",
          variant: "destructive",
        });

        return {
          status: "error",
          error: error,
        };
      }

      setUploads((prev) => [
        ...prev,
        {
          file,
          status: "pending",
        },
      ]);

      return {
        status: "success",
        result: file,
      };
    },
  });

  return (
    <div className="flex flex-col h-full w-full relative pt-4">
      <Dropzone {...dropzone}>
        <div className="h-full w-full px-4 mb-4">
          <DropZoneArea className="h-full w-full overflow-y-auto pt-0">
            {uploads.length === 0 && (
              <DropzoneTrigger className="flex h-full w-full flex-col items-center justify-center bg-transparent text-center text-sm">
                <div className="items-center justify-center flex flex-col gap-2">
                  <CloudUploadIcon className="size-8" />
                  <p className="font-semibold">Upload files</p>
                  <p className="text-sm text-muted-foreground">Click here or drag and drop to upload</p>
                  <p className="text-xs text-muted-foreground">
                    Allowed file types: .txt, .pdf, .mobi, .epub, .html, .xml. Max file size: 50MB.
                  </p>
                </div>
              </DropzoneTrigger>
            )}
            {uploads.length > 0 && (
              <div className="flex flex-col h-full gap-3 w-full pt-2 px-0">
                {uploads.map((upload) => {
                  if (upload.status === "pending") {
                    return (
                      <Card key={upload.file.name} className="w-full mx-0 relative">
                        <button
                          onClick={() => setUploads((prev) => prev.filter((u) => u.file.name !== upload.file.name))}
                          className="absolute top-2 right-2 text-red-500 p-1 rounded-full hover:bg-red-50 transition-colors flex-shrink-0 z-10"
                        >
                          <Trash className="h-4 w-4" />
                        </button>
                        <div className="flex items-center w-full">
                          {/* Cover Image Area */}
                          <div className="p-2 border-r flex flex-col items-center justify-center min-w-[100px]">
                            {upload.coverPreview ? (
                              <div className="relative group">
                                <img
                                  src={upload.coverPreview}
                                  alt="Cover Preview"
                                  className="h-24 w-24 object-cover rounded-md"
                                />
                                <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 rounded-md flex items-center justify-center transition-opacity">
                                  <label
                                    htmlFor={`cover-${upload.file.name}`}
                                    className="cursor-pointer text-white text-xs"
                                  >
                                    Change
                                  </label>
                                </div>
                              </div>
                            ) : (
                              <label
                                htmlFor={`cover-${upload.file.name}`}
                                className="h-24 w-24 border-2 border-dashed rounded-md flex flex-col items-center justify-center cursor-pointer hover:bg-muted/50 transition-colors"
                              >
                                <ImageIcon className="h-6 w-6 text-muted-foreground" />
                                <span className="text-xs text-muted-foreground mt-1">Cover</span>
                              </label>
                            )}
                            <input
                              id={`cover-${upload.file.name}`}
                              type="file"
                              accept="image/*"
                              className="hidden"
                              onChange={(e) => {
                                const file = e.target.files?.[0];
                                if (file) {
                                  const reader = new FileReader();
                                  reader.onload = () => {
                                    setUploads((prev) =>
                                      prev.map((u) =>
                                        u.file.name === upload.file.name
                                          ? { ...u, cover: file, coverPreview: reader.result as string }
                                          : u,
                                      ),
                                    );
                                  };
                                  reader.readAsDataURL(file);
                                }
                              }}
                            />
                          </div>
                          <div className="flex-1 flex flex-col p-3">
                            <div className="flex items-center justify-between w-full">
                              {/* Left side: Title and Description */}
                              <div className="flex-shrink-0 mr-4 w-[25%]">
                                <CardTitle className="text-sm truncate">{upload.file.name}</CardTitle>
                                <CardDescription className="text-xs">
                                  {(upload.file.size / (1024 * 1024)).toFixed(2)} MB
                                </CardDescription>
                              </div>
                              <div className="flex-1 pr-12 flex flex-row gap-3 items-center min-w-[180px]">
                                <div className="flex-1">
                                  <label className="text-xs font-medium mb-1 block">Title</label>
                                  <Input
                                    placeholder="Book title"
                                    value={upload.title}
                                    onChange={handleTitleChange(upload)}
                                    className="h-7 text-sm"
                                  />
                                </div>
                                <div className="flex-1">
                                  <label className="text-xs font-medium mb-1 block">Author</label>
                                  <Input
                                    placeholder="Author name"
                                    value={upload.author}
                                    onChange={handleAuthorChange(upload)}
                                    className="h-7 text-sm"
                                  />
                                </div>
                              </div>
                            </div>
                            <CardFooter className="p-0 pt-2 flex items-center mt-auto">
                              {upload.title && upload.author ? (
                                <div className="text-xs text-green-500 font-medium">Ready to upload!</div>
                              ) : (
                                <div className="flex items-center text-xs text-yellow-500 font-medium gap-1">
                                  <TriangleAlert className="h-3 w-3" />
                                  {!upload.title ? "Adding a title is recommended" : "Adding an author is recommended"}
                                </div>
                              )}
                            </CardFooter>
                          </div>
                        </div>
                      </Card>
                    );
                  }
                })}
              </div>
            )}
          </DropZoneArea>
        </div>
      </Dropzone>
      {uploads.length > 0 && (
        <div className="border-t bg-background p-4 flex items-center justify-end gap-2">
          <Button
            variant={"ghost"}
            onClick={() => {
              const input = document.createElement("input");
              input.type = "file";
              input.multiple = true;
              input.accept = allowedMimeTypes.join(",");
              input.onchange = (e) => {
                const files = (e.target as HTMLInputElement).files;
                if (files) {
                  Array.from(files).forEach((file) => {
                    const { valid, error } = validateFile(file);
                    if (!valid) {
                      toast({
                        title: file.name,
                        description: error,
                        type: "foreground",
                        variant: "destructive",
                      });
                    } else {
                      setUploads((prev) => [
                        ...prev,
                        {
                          file,
                          status: "pending",
                        },
                      ]);
                    }
                  });
                }
              };
              input.click();
            }}
          >
            Add Files
          </Button>
          <Button onClick={handleUpload} className="bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-all">
            Start Upload
          </Button>
        </div>
      )}
    </div>
  );
}
