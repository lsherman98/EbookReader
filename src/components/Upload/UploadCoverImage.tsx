import { ImageIcon } from "lucide-react";

export function UploadCoverImage({
  coverPreview,
  uploadFileName,
  isEditable = false,
  onCoverChange,
}: {
  coverPreview?: string;
  uploadFileName?: string;
  isEditable?: boolean;
  onCoverChange?: (file: File) => void;
}) {
  return (
    <div className="p-2 border-r flex flex-col items-center justify-center min-w-[100px]">
      {coverPreview ? (
        <div className={`relative ${isEditable ? "group" : ""}`}>
          <img
            src={coverPreview}
            alt="Cover Preview"
            className={`h-24 w-24 object-cover rounded-md ${!isEditable ? "opacity-60" : ""}`}
          />
          {isEditable && (
            <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 rounded-md flex items-center justify-center transition-opacity">
              <label htmlFor={`cover-${uploadFileName}`} className="cursor-pointer text-white text-xs">
                Change
              </label>
            </div>
          )}
        </div>
      ) : (
        <div
          className={`h-24 w-24 border-2 border-dashed rounded-md flex flex-col items-center justify-center ${!isEditable ? "opacity-60" : "hover:bg-muted/50 transition-colors"}`}
        >
          <ImageIcon className="h-6 w-6 text-muted-foreground" />
          <span className="text-xs text-muted-foreground mt-1">Cover</span>
          {isEditable && (
            <label htmlFor={`cover-${uploadFileName}`} className="absolute inset-0 cursor-pointer"></label>
          )}
        </div>
      )}
      {isEditable && uploadFileName && onCoverChange && (
        <input
          id={`cover-${uploadFileName}`}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file && onCoverChange) {
              onCoverChange(file);
            }
          }}
        />
      )}
    </div>
  );
}
