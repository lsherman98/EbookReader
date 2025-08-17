import { Dropzone, DropZoneArea, DropzoneTrigger, useDropzone } from "@/components/ui/dropzone";
import { toast } from "@/hooks/use-toast";
import {
  CloudUploadIcon,
  Trash,
  CheckCircle,
  Loader2,
  FileClock,
  CloudAlert,
  AlertTriangle,
  Crown,
} from "lucide-react";
import { CardFooter } from "../ui/card";
import { FileUploadObj } from "@/pages/_app/upload.lazy";
import { Button } from "../ui/button";
import { Link } from "@tanstack/react-router";
import { useGetUploadLimitReached } from "@/lib/api/queries";
import { UploadCard } from "./UploadCard";
import { UploadCoverImage } from "./UploadCoverImage";
import { UploadMetadata } from "./UploadMetadata";

export function FileUpload({
  uploads,
  setUploads,
  handleUpload,
  disabled = false,
}: {
  uploads: FileUploadObj[];
  setUploads: React.Dispatch<React.SetStateAction<FileUploadObj[]>>;
  handleUpload: () => void;
  disabled?: boolean;
}) {
  const { data: uploadLimitReached } = useGetUploadLimitReached();

  const allowedMimeTypes = ["application/epub+zip"];

  const validateFile = (file: File): { valid: boolean; error?: string } => {
    if (file.size > 20 * 1024 * 1024) {
      return { valid: false, error: "File size is too large. Max file size is 10MB." };
    }

    if (!allowedMimeTypes.includes(file.type)) {
      return {
        valid: false,
        error: "Invalid file type. Only .epub files are supported at this time.",
      };
    }

    if (uploads.some((upload) => upload.file.name === file.name)) {
      return { valid: false, error: "File is already staged for upload." };
    }

    return { valid: true };
  };

  const dropzone = useDropzone({
    onDropFile: async (file: File) => {
      if (disabled) {
        toast({
          title: "Upload limit reached",
          description: "You've reached your upload limit. Please upgrade to continue uploading.",
          type: "foreground",
          variant: "destructive",
        });
        return {
          status: "error",
          error: "Upload limit reached",
        };
      }

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

  const handleRemoveUpload = (fileName: string) => {
    setUploads((prev) => prev.filter((upload) => upload.file.name !== fileName));
  };

  return (
    <div className="h-full w-full">
      <Dropzone {...dropzone}>
        <div className="h-full w-full max-h-[calc(100vh-114px)] p-2">
          <DropZoneArea className="h-full w-full">
            {uploads.length === 0 && (
              <DropzoneTrigger className="flex h-full w-full flex-col items-center justify-center bg-transparent text-center text-sm">
                <div className="items-center justify-center flex flex-col gap-2">
                  <CloudUploadIcon className="size-8" />
                  <p className="font-semibold">Upload files</p>
                  <p className="text-sm text-muted-foreground">Click here or drag and drop to upload</p>
                  <p className="text-xs text-muted-foreground">
                    Only .epub files are supported at this time. Max file size is 10MB.
                  </p>
                </div>
              </DropzoneTrigger>
            )}
            {uploads.length > 0 && (
              <div className="flex flex-col h-full gap-3 w-full overflow-y-auto ">
                {uploads.map((upload) => {
                  if (upload.status === "pending") {
                    return (
                      <UploadCard key={upload.file.name}>
                        <UploadCoverImage
                          coverPreview={upload.coverPreview}
                          uploadFileName={upload.file.name}
                          isEditable={true}
                          onCoverChange={(file) => {
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
                          }}
                        />
                        <div className="flex-1 flex flex-col p-3 relative">
                          <div className="flex items-center justify-between w-full">
                            <UploadMetadata fileName={upload.file.name} fileSize={upload.file.size} />
                          </div>
                          <CardFooter className="p-0 pt-2 flex items-center mt-auto">
                            <div className="flex items-center text-xs text-yellow-500 font-medium gap-1">
                              <FileClock className="h-4 w-4" />
                              Ready to upload
                            </div>
                          </CardFooter>
                          <button
                            onClick={() => handleRemoveUpload(upload.file.name)}
                            className="absolute top-0 right-4 text-muted-foreground hover:text-red-500 transition-colors"
                          >
                            <Trash className="h-4 w-4" />
                          </button>
                        </div>
                      </UploadCard>
                    );
                  } else if (upload.status === "uploading") {
                    return (
                      <UploadCard key={upload.file.name} className="bg-muted/20 opacity-80">
                        <UploadCoverImage coverPreview={upload.coverPreview} />
                        <div className="flex-1 flex flex-col p-3">
                          <div className="flex items-center justify-between w-full">
                            <UploadMetadata fileName={upload.file.name} fileSize={upload.file.size} />
                          </div>
                          <CardFooter className="p-0 pt-2 flex items-center mt-auto">
                            <div className="flex items-center text-xs text-blue-500 font-medium gap-1">
                              <Loader2 className="h-4 w-4 animate-spin" />
                              Uploading...
                            </div>
                          </CardFooter>
                        </div>
                      </UploadCard>
                    );
                  } else if (upload.status === "success") {
                    return (
                      <UploadCard key={upload.file.name} className="bg-muted/20 opacity-80">
                        <UploadCoverImage coverPreview={upload.coverPreview} />
                        <div className="flex-1 flex flex-col p-3">
                          <div className="flex items-center justify-between w-full">
                            <UploadMetadata fileName={upload.file.name} fileSize={upload.file.size} />
                          </div>
                          <CardFooter className="p-0 pt-2 flex items-center mt-auto">
                            <div className="flex items-center text-xs text-green-500 font-medium gap-1">
                              <CheckCircle className="h-4 w-4" />
                              Upload complete
                            </div>
                          </CardFooter>
                        </div>
                      </UploadCard>
                    );
                  } else if (upload.status === "error") {
                    return (
                      <UploadCard key={upload.file.name} className="bg-muted/20 opacity-80">
                        <UploadCoverImage coverPreview={upload.coverPreview} />
                        <div className="flex-1 flex flex-col p-3">
                          <div className="flex items-center justify-between w-full">
                            <UploadMetadata fileName={upload.file.name} fileSize={upload.file.size} />
                          </div>
                          <CardFooter className="p-0 pt-2 flex items-center mt-auto">
                            <div className="flex items-center text-xs text-red-500 font-medium gap-1">
                              <CloudAlert className="h-4 w-4" />
                              Something went wrong.
                            </div>
                          </CardFooter>
                        </div>
                      </UploadCard>
                    );
                  }
                })}
              </div>
            )}
          </DropZoneArea>
        </div>
        <div className="fixed bottom-0 left-0 right-0 bg-background border-t border-border p-4">
          <div className="flex justify-end items-center gap-4">
            <input
              type="file"
              multiple
              accept={allowedMimeTypes.join(",")}
              disabled={disabled}
              onChange={(e) => {
                if (disabled) return;
                const files = e.target.files;
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
              }}
              className="hidden"
              id="file-upload-input"
            />
            {uploadLimitReached && (
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
            )}
            <Button
              variant={"ghost"}
              disabled={disabled}
              onClick={() => {
                if (disabled) return;
                const fileInput = document.getElementById("file-upload-input") as HTMLInputElement;
                fileInput.click();
              }}
            >
              Add Files
            </Button>
            <Button
              onClick={handleUpload}
              disabled={disabled || uploads.filter((u) => u.status === "pending").length === 0}
              className="bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-all disabled:opacity-50"
            >
              Start Upload
            </Button>
          </div>
        </div>
      </Dropzone>
    </div>
  );
}
