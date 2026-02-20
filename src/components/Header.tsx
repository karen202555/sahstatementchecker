import { FileSpreadsheet } from "lucide-react";

const Header = () => {
  return (
    <header className="border-b border-border bg-card">
      <div className="container mx-auto flex items-center gap-3 px-6 py-2">
        <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary text-primary-foreground">
          <FileSpreadsheet className="h-5 w-5" />
        </div>
        <span className="text-lg font-semibold text-foreground">Statement Sense
        </span>
      </div>
    </header>);
};

export default Header;