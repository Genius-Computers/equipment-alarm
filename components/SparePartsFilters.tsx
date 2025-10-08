import { Input } from "@/components/ui/input";
import { Search } from "lucide-react";

interface SparePartsFiltersProps {
  searchTerm: string;
  onSearchChange: (value: string) => void;
}

export default function SparePartsFilters({
  searchTerm,
  onSearchChange,
}: SparePartsFiltersProps) {
  return (
    <div className="flex flex-col md:flex-row gap-4">
      <div className="relative flex-1">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Search spare parts..."
          value={searchTerm}
          onChange={(e) => onSearchChange(e.target.value)}
          className="pl-10"
        />
      </div>
    </div>
  );
}


