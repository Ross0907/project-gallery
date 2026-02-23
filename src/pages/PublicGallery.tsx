import { useState, useEffect, useCallback } from "react";
import { X, ExternalLink, ImageIcon, ChevronLeft, ChevronRight } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";

interface GalleryItem {
  id: string;
  title: string;
  description: string | null;
  public_url: string;
  file_name: string;
  file_size: number | null;
  created_at: string;
}

function Lightbox({
  items,
  currentIndex,
  onClose,
  onNavigate,
}: {
  items: GalleryItem[];
  currentIndex: number;
  onClose: () => void;
  onNavigate: (index: number) => void;
}) {
  const item = items[currentIndex];
  const hasPrev = currentIndex > 0;
  const hasNext = currentIndex < items.length - 1;

  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
      if (e.key === "ArrowLeft" && hasPrev) onNavigate(currentIndex - 1);
      if (e.key === "ArrowRight" && hasNext) onNavigate(currentIndex + 1);
    },
    [currentIndex, hasPrev, hasNext, onClose, onNavigate]
  );

  useEffect(() => {
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [handleKeyDown]);

  return (
    <div
      className="fixed inset-0 bg-black/95 z-50 flex flex-col"
      onClick={onClose}
    >
      {/* Close */}
      <button
        className="absolute top-5 right-5 text-white/60 hover:text-white transition-colors z-10"
        onClick={onClose}
      >
        <X className="w-7 h-7" />
      </button>

      {/* Image area */}
      <div className="flex-1 flex items-center justify-center px-16 pt-6 pb-2 min-h-0">
        {/* Prev */}
        {hasPrev && (
          <button
            className="absolute left-4 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-white/70 hover:text-white transition-colors z-10"
            onClick={(e) => { e.stopPropagation(); onNavigate(currentIndex - 1); }}
          >
            <ChevronLeft className="w-6 h-6" />
          </button>
        )}

        <img
          src={item.public_url}
          alt={item.title}
          className="max-w-full max-h-[70vh] object-contain rounded-lg shadow-2xl"
          onClick={(e) => e.stopPropagation()}
        />

        {/* Next */}
        {hasNext && (
          <button
            className="absolute right-4 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-white/70 hover:text-white transition-colors z-10"
            onClick={(e) => { e.stopPropagation(); onNavigate(currentIndex + 1); }}
          >
            <ChevronRight className="w-6 h-6" />
          </button>
        )}
      </div>

      {/* Info bar at bottom — never overlaps image */}
      <div
        className="shrink-0 px-6 py-4 flex flex-col items-center gap-1 text-center"
        onClick={(e) => e.stopPropagation()}
      >
        <p className="text-white font-medium text-sm">{item.title}</p>
        {item.description && (
          <p className="text-white/60 text-xs max-w-lg">{item.description}</p>
        )}
        <div className="flex items-center gap-4 mt-2">
          <span className="text-white/40 text-xs">
            {currentIndex + 1} / {items.length}
          </span>
          <a
            href={item.public_url}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1.5 text-primary text-xs font-medium hover:text-primary/80 transition-colors"
          >
            <ExternalLink className="w-3.5 h-3.5" />
            Open image
          </a>
        </div>
      </div>
    </div>
  );
}

export default function PublicGallery() {
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);

  const { data: items = [], isLoading } = useQuery({
    queryKey: ["gallery-items-public"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("gallery_items")
        .select("id, title, description, public_url, file_name, file_size, created_at, sort_order")
        .order("sort_order", { ascending: true });
      if (error) throw error;
      return data as GalleryItem[];
    },
  });

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-[1600px] mx-auto px-4 py-16">
        <div className="mb-12">
          <h1 className="text-3xl font-semibold tracking-tight text-foreground">
            Project Gallery
          </h1>
          <p className="text-muted-foreground text-sm mt-1">
            Selected work and project documentation.
          </p>
        </div>

        {isLoading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {[...Array(8)].map((_, i) => (
              <div key={i} className="h-48 rounded-xl bg-secondary animate-pulse" />
            ))}
          </div>
        ) : items.length === 0 ? (
          <div className="text-center py-24 text-muted-foreground">
            <ImageIcon className="w-14 h-14 mx-auto mb-4 opacity-20" />
            <p className="text-lg">No images yet</p>
          </div>
        ) : (
          <>
            <div className="columns-1 sm:columns-2 md:columns-3 lg:columns-4 xl:columns-5 gap-3 space-y-3">
              {items.map((item, index) => (
                <div
                  key={item.id}
                  className="surface rounded-xl overflow-hidden card-hover group cursor-pointer break-inside-avoid"
                  onClick={() => setLightboxIndex(index)}
                >
                  <div className="overflow-hidden">
                    <img
                      src={item.public_url}
                      alt={item.title}
                      className="w-full h-auto block transition-transform duration-300 group-hover:scale-105"
                    />
                  </div>
                  <div className="px-3 py-2.5">
                    <p className="text-foreground font-medium text-sm truncate">{item.title}</p>
                    {item.description && (
                      <p className="text-muted-foreground text-xs mt-0.5 line-clamp-2">{item.description}</p>
                    )}
                  </div>
                </div>
              ))}
            </div>
            <p className="text-muted-foreground text-xs mt-8">
              Click any image to enlarge — use arrow keys or buttons to navigate.
            </p>
          </>
        )}
      </div>

      {lightboxIndex !== null && (
        <Lightbox
          items={items}
          currentIndex={lightboxIndex}
          onClose={() => setLightboxIndex(null)}
          onNavigate={setLightboxIndex}
        />
      )}
    </div>
  );
}
