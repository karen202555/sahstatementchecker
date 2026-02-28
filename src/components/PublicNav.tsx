import { Link, useLocation } from "react-router-dom";
import { FileSpreadsheet } from "lucide-react";
import { Button } from "@/components/ui/button";

const links = [
  { to: "/", label: "Home" },
  { to: "/features", label: "Features" },
  { to: "/beta", label: "Beta Program" },
  { to: "/about", label: "About" },
];

const PublicNav = () => {
  const { pathname } = useLocation();

  return (
    <header className="border-b border-border bg-card h-14">
      <div className="mx-auto max-w-[1100px] flex items-center justify-between h-full px-4 md:px-6">
        <Link to="/" className="flex items-center gap-2.5 hover:opacity-80 transition-opacity">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-primary-foreground">
            <FileSpreadsheet className="h-4 w-4" />
          </div>
          <span className="text-sm font-semibold text-foreground hidden sm:inline">Statement Checker</span>
        </Link>

        <nav className="flex items-center gap-1">
          {links.map((l) => (
            <Link
              key={l.to}
              to={l.to}
              className={`text-sm px-2.5 py-1.5 rounded-md transition-colors ${
                pathname === l.to
                  ? "text-primary font-semibold"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              {l.label}
            </Link>
          ))}
          <Button asChild size="sm" className="ml-2 h-9">
            <Link to="/auth">Sign In</Link>
          </Button>
        </nav>
      </div>
    </header>
  );
};

export default PublicNav;
