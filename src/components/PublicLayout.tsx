import PublicNav from "./PublicNav";

const PublicLayout = ({ children }: { children: React.ReactNode }) => (
  <div className="min-h-screen flex flex-col bg-background">
    <PublicNav />
    <main className="flex-1 mx-auto w-full max-w-[1100px] px-4 md:px-6 py-10">
      {children}
    </main>
  </div>
);

export default PublicLayout;
