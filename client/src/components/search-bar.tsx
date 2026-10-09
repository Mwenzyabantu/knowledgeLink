import { useState } from "react";
import { Search } from "lucide-react";
import { Input } from "@/components/ui/input";

export function SearchBar() {
  const [query, setQuery] = useState("");

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    console.log("Searching for:", query);
  };

  return (
    <form onSubmit={handleSearch} className="relative w-full max-w-md">
      <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
      <Input
        type="search"
        placeholder="Search your knowledge..."
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        className="pl-9 rounded-full"
        data-testid="input-search"
      />
    </form>
  );
}
