import { CardDescription, CardTitle } from "../ui/card";

export function UploadMetadata({ fileName, fileSize }: { fileName: string; fileSize: number }) {
  return (
    <div className="flex-shrink-0 mr-4 w-[25%]">
      <CardTitle className="text-sm truncate">{fileName}</CardTitle>
      <CardDescription className="text-xs">{(fileSize / (1024 * 1024)).toFixed(2)} MB</CardDescription>
    </div>
  );
}
