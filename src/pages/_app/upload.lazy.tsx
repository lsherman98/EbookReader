import { FileUpload } from "@/components/FileUpload";
import { useUploadBook } from "@/lib/api/mutations";
import { createLazyFileRoute } from "@tanstack/react-router";
import { useState } from "react";

export const Route = createLazyFileRoute("/_app/upload")({
  component: Index,
});

function Index() {
  const [uploads, setUploads] = useState<FileUploadObj[]>([]);
  const uploadFilesMutation = useUploadBook();

  const handleUpload = () => {
    uploads.forEach((upload) => {
      if (upload.status === "pending") {
        setUploads((prev) => prev.map((u) => (u.file.name === upload.file.name ? { ...u, status: "uploading" } : u)));
        uploadFilesMutation.mutateAsync(upload).then(() => {
          setUploads((prev) =>
            prev.map((u) => {
              if (u.file.name === upload.file.name) {
                return { ...u, status: "success" };
              }
              return u;
            }),
          );
        }).catch((error: Error) => {
          setUploads((prev) =>
            prev.map((u) => {
              if (u.file.name === upload.file.name) {
                return { ...u, status: "error", error: error.message };
              }
              return u;
            }),
          );
        });
      }
    });
  };

  return (
    <div className="h-full">
      <FileUpload uploads={uploads} setUploads={setUploads} handleUpload={handleUpload} />
    </div>
  );
}

export type FileUploadObj = {
  file: File;
  status: "pending" | "success" | "error" | "uploading";
  error?: string;
  cover?: File;
  coverPreview?: string;
};
