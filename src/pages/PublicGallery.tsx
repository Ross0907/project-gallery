import { useState, useEffect, useCallback, useRef } from "react";
import { X, ExternalLink, ImageIcon, ChevronLeft, ChevronRight, ZoomIn, ZoomOut, RotateCcw } from "lucide-react";
import MasonryGrid from "@/components/MasonryGrid";
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
  const [zoom, setZoom] = useState(1);
  const imgRef = useRef<HTMLDivElement>(null);
  const lastDistRef = useRef<number | null>(null);

  // Reset zoom on image change
  useEffect(() => { setZoom(1); }, [currentIndex]);

  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
      if (e.key === "ArrowLeft" && hasPrev) onNavigate(currentIndex - 1);
      if (e.key === "ArrowRight" && hasNext) onNavigate(currentIndex + 1);
      if (e.key === "+" || e.key === "=") setZoom((z) => Math.min(z + 0.25, 4));
      if (e.key === "-") setZoom((z) => Math.max(z - 0.25, 0.5));
    },
    [currentIndex, hasPrev, hasNext, onClose, onNavigate]
  );

  useEffect(() => {
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [handleKeyDown]);

  // Pinch-to-zoom
  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    if (e.touches.length === 2) {
      const dx = e.touches[0].clientX - e.touches[1].clientX;
      const dy = e.touches[0].clientY - e.touches[1].clientY;
      lastDistRef.current = Math.hypot(dx, dy);
    }
  }, []);

  const handleTouchMove = useCallback((e: React.TouchEvent) => {
    if (e.touches.length === 2 && lastDistRef.current !== null) {
      e.preventDefault();
      const dx = e.touches[0].clientX - e.touches[1].clientX;
      const dy = e.touches[0].clientY - e.touches[1].clientY;
      const dist = Math.hypot(dx, dy);
      const scale = dist / lastDistRef.current;
      setZoom((z) => Math.min(Math.max(z * scale, 0.5), 4));
      lastDistRef.current = dist;
    }
  }, []);

  const handleTouchEnd = useCallback(() => {
    lastDistRef.current = null;
  }, []);

  // Mouse wheel zoom
  const handleWheel = useCallback((e: React.WheelEvent) => {
    e.stopPropagation();
    const delta = e.deltaY > 0 ? -0.1 : 0.1;
    setZoom((z) => Math.min(Math.max(z + delta, 0.5), 4));
  }, []);

  return (
    <div
      className="fixed inset-0 bg-black/95 z-50 flex flex-col"
      onClick={onClose}
    >
      {/* Close */}
      <button
        className="absolute top-3 right-3 sm:top-5 sm:right-5 text-white/60 hover:text-white transition-colors z-10"
        onClick={onClose}
      >
        <X className="w-6 h-6 sm:w-7 sm:h-7" />
      </button>

      {/* Image area */}
      <div
        className="flex-1 flex items-center justify-center px-10 sm:px-16 pt-4 sm:pt-6 pb-2 min-h-0 overflow-auto touch-none"
        ref={imgRef}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        onWheel={handleWheel}
      >
        {/* Prev */}
        {hasPrev && (
          <button
            className="absolute left-2 sm:left-4 top-1/2 -translate-y-1/2 w-9 h-9 sm:w-10 sm:h-10 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-white/70 hover:text-white transition-colors z-10"
            onClick={(e) => { e.stopPropagation(); onNavigate(currentIndex - 1); }}
          >
            <ChevronLeft className="w-5 h-5 sm:w-6 sm:h-6" />
          </button>
        )}

        <img
          src={item.public_url}
          alt={item.title}
          className="max-w-full max-h-[70vh] object-contain rounded-lg shadow-2xl transition-transform duration-200 select-none"
          style={{ transform: `scale(${zoom})` }}
          draggable={false}
          onClick={(e) => e.stopPropagation()}
        />

        {/* Next */}
        {hasNext && (
          <button
            className="absolute right-2 sm:right-4 top-1/2 -translate-y-1/2 w-9 h-9 sm:w-10 sm:h-10 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-white/70 hover:text-white transition-colors z-10"
            onClick={(e) => { e.stopPropagation(); onNavigate(currentIndex + 1); }}
          >
            <ChevronRight className="w-5 h-5 sm:w-6 sm:h-6" />
          </button>
        )}
      </div>

      {/* Zoom controls */}
      <div className="absolute bottom-28 sm:bottom-24 right-3 sm:right-6 flex flex-col gap-2 z-10">
        <button
          className="w-9 h-9 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-white/70 hover:text-white transition-colors"
          onClick={(e) => { e.stopPropagation(); setZoom((z) => Math.min(z + 0.25, 4)); }}
          title="Zoom in (+)"
        >
          <ZoomIn className="w-4 h-4" />
        </button>
        <button
          className="w-9 h-9 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-white/70 hover:text-white transition-colors"
          onClick={(e) => { e.stopPropagation(); setZoom((z) => Math.max(z - 0.25, 0.5)); }}
          title="Zoom out (-)"
        >
          <ZoomOut className="w-4 h-4" />
        </button>
        {zoom !== 1 && (
          <button
            className="w-9 h-9 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-white/70 hover:text-white transition-colors"
            onClick={(e) => { e.stopPropagation(); setZoom(1); }}
            title="Reset zoom"
          >
            <RotateCcw className="w-3.5 h-3.5" />
          </button>
        )}
        {zoom !== 1 && (
          <span className="text-white/50 text-[10px] text-center">{Math.round(zoom * 100)}%</span>
        )}
      </div>

      {/* Info bar at bottom */}
      <div
        className="shrink-0 px-4 sm:px-6 py-3 sm:py-4 flex flex-col items-center gap-1 text-center"
        onClick={(e) => e.stopPropagation()}
      >
        <p className="text-white font-medium text-xs sm:text-sm">{item.title}</p>
        {item.description && (
          <p className="text-white/60 text-[10px] sm:text-xs max-w-lg">{item.description}</p>
        )}
        <div className="flex items-center gap-4 mt-1 sm:mt-2">
          <span className="text-white/40 text-[10px] sm:text-xs">
            {currentIndex + 1} / {items.length}
          </span>
          <a
            href={item.public_url}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1.5 text-primary text-[10px] sm:text-xs font-medium hover:text-primary/80 transition-colors"
          >
            <ExternalLink className="w-3 h-3 sm:w-3.5 sm:h-3.5" />
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
    <div className="min-h-screen bg-background overflow-x-hidden">
      <div className="w-full px-3 sm:px-4 md:px-6 py-8 sm:py-12 md:py-16">
        <div className="mb-6 sm:mb-8 md:mb-12">
          <h1 className="text-2xl sm:text-3xl font-semibold tracking-tight text-foreground">
            Project Gallery
          </h1>
          <p className="text-muted-foreground text-xs sm:text-sm mt-1">
            Selected work and project documentation.
          </p>
        </div>

        {isLoading ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
            {[...Array(10)].map((_, i) => (
              <div key={i} className="h-32 sm:h-48 rounded-xl bg-secondary animate-pulse" />
            ))}
          </div>
        ) : items.length === 0 ? (
          <div className="text-center py-24 text-muted-foreground">
            <ImageIcon className="w-14 h-14 mx-auto mb-4 opacity-20" />
            <p className="text-lg">No images yet</p>
          </div>
        ) : (
          <>
            <MasonryGrid
              itemCount={items.length}
              renderItem={(index) => {
                const item = items[index];
                return (
                  <div
                    key={item.id}
                    className="surface rounded-xl overflow-hidden card-hover group cursor-pointer"
                    onClick={() => setLightboxIndex(index)}
                  >
                    <div className="overflow-hidden">
                      <img
                        src={item.public_url}
                        alt={item.title}
                        className="w-full h-auto block transition-transform duration-300 group-hover:scale-105"
                      />
                    </div>
                    <div className="px-2 sm:px-3 py-2 sm:py-2.5">
                      <p className="text-foreground font-medium text-xs sm:text-sm truncate">{item.title}</p>
                      {item.description && (
                        <p className="text-muted-foreground text-[10px] sm:text-xs mt-0.5 line-clamp-2">{item.description}</p>
                      )}
                    </div>
                  </div>
                );
              }}
            />
            <p className="text-muted-foreground text-[10px] sm:text-xs mt-6 sm:mt-8">
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
