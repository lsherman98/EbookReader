import { FileUpload } from "@/components/FileUpload";
import { createLazyFileRoute } from "@tanstack/react-router";
import { useState } from "react";

export const Route = createLazyFileRoute("/_app/upload")({
  component: Index,
});

function Index() {
  const [uploads, setUploads] = useState<FileUploadObj[]>([]);

  const handleUpload = () => {
    console.log("Uploading files:", uploads);
  };

  return (
    <div className="h-full w-full relative">
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
