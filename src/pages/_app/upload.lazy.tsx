import { FileUpload } from "@/components/FileUpload";
import { useUploadFiles } from "@/lib/api/mutations";
import { createLazyFileRoute } from "@tanstack/react-router";
import { useState } from "react";

export const Route = createLazyFileRoute("/_app/upload")({
  component: Index,
});

function Index() {
  const [uploads, setUploads] = useState<FileUploadObj[]>([]);
  const uploadFilesMutation = useUploadFiles();

  const handleUpload = () => {
    uploads.forEach((upload) => {
      if (upload.status === "pending") {
        uploadFilesMutation.mutate(upload);
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
  title?: string;
  author?: string;
  cover?: File;
  coverPreview?: string;
};
