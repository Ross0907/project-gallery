import { useState } from "react";
import { Images, FileText, LogOut } from "lucide-react";
import GalleryTab from "@/components/GalleryTab";
import PdfHostTab from "@/components/PdfHostTab";
import { useAuth } from "@/hooks/useAuth";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";

type Tab = "gallery" | "pdf";

const tabs: { id: Tab; label: string; icon: React.ComponentType<{ className?: string }> }[] = [
  { id: "gallery", label: "Gallery", icon: Images },
  { id: "pdf", label: "PDF Host", icon: FileText },
];

export default function Admin() {
  const [activeTab, setActiveTab] = useState<Tab>("gallery");
  const { user, signOut } = useAuth();
  const navigate = useNavigate();

  const handleSignOut = async () => {
    await signOut();
    navigate("/login");
  };

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border sticky top-0 z-40 bg-background/80 backdrop-blur-sm">
        <div className="max-w-[1600px] mx-auto px-4 py-4 flex items-center gap-6">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-primary/20 flex items-center justify-center">
              <Images className="w-4 h-4 text-primary" />
            </div>
            <span className="text-foreground font-semibold text-lg">Admin</span>
          </div>

          <nav className="flex items-center gap-1 ml-4">
            {tabs.map((tab) => {
              const Icon = tab.icon;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all duration-150 ${
                    activeTab === tab.id
                      ? "bg-primary text-primary-foreground shadow-sm"
                      : "text-muted-foreground hover:text-foreground hover:bg-accent"
                  }`}
                >
                  <Icon className="w-4 h-4" />
                  {tab.label}
                </button>
              );
            })}
          </nav>

          <div className="ml-auto flex items-center gap-3">
            <span className="text-muted-foreground text-sm hidden sm:block">{user?.email}</span>
            <Button variant="ghost" size="sm" onClick={handleSignOut} className="gap-2 text-muted-foreground hover:text-foreground">
              <LogOut className="w-4 h-4" />
              Sign out
            </Button>
          </div>
        </div>
      </header>

      <main className="max-w-[1600px] mx-auto px-4 py-8">
        <div className="mb-8">
          {activeTab === "gallery" ? (
            <>
              <h1 className="text-3xl font-bold text-foreground">
                Gallery <span className="text-gradient">Manager</span>
              </h1>
              <p className="text-muted-foreground mt-1.5">
                Upload images — copy the raw link to share in your resume or portfolio.
              </p>
            </>
          ) : (
            <>
              <h1 className="text-3xl font-bold text-foreground">
                PDF <span className="text-gradient">Host</span>
              </h1>
              <p className="text-muted-foreground mt-1.5">
                Upload a PDF and share the link — recipients open it directly in their browser.
              </p>
            </>
          )}
        </div>
        {activeTab === "gallery" ? <GalleryTab /> : <PdfHostTab />}
      </main>
    </div>
  );
}
