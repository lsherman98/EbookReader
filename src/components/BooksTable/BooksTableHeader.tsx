import { TableHead, TableHeader, TableRow } from "../ui/table";

export function BooksTableHeader() {
  return (
    <TableHeader>
      <TableRow>
        <TableHead className="w-36 text-center">Cover</TableHead>
        <TableHead className="w-1/4">Title</TableHead>
        <TableHead className="w-1/6">Author</TableHead>
        <TableHead className="w-1/6">Uploaded</TableHead>
        <TableHead className="w-48 text-center">Actions</TableHead>
      </TableRow>
    </TableHeader>
  );
}
