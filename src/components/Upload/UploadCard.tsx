import { Card } from "../ui/card";

export function UploadCard({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return (
    <Card className={`w-full mx-0 relative ${className}`}>
      <div className="flex items-center w-full">{children}</div>
    </Card>
  );
}
