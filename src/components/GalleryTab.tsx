import { useState, useRef, useCallback, useEffect } from "react";
import { Upload, ExternalLink, Trash2, ImageIcon, X, ZoomIn, Pencil, Check, ArrowUpDown, GripVertical, ArrowUp, ArrowDown, ChevronLeft, ChevronRight, RefreshCw } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

interface GalleryItem {
  id: string;
  title: string;
  description: string | null;
  storage_path: string;
  public_url: string;
  file_name: string;
  file_size: number | null;
  created_at: string;
  sort_order: number;
}

function AdminLightbox({
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
    <div className="fixed inset-0 bg-black/95 z-50 flex flex-col" onClick={onClose}>
      <button
        className="absolute top-5 right-5 text-white/60 hover:text-white transition-colors z-10"
        onClick={onClose}
      >
        <X className="w-7 h-7" />
      </button>

      <div className="flex-1 flex items-center justify-center px-16 pt-6 pb-2 min-h-0">
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

        {hasNext && (
          <button
            className="absolute right-4 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-white/70 hover:text-white transition-colors z-10"
            onClick={(e) => { e.stopPropagation(); onNavigate(currentIndex + 1); }}
          >
            <ChevronRight className="w-6 h-6" />
          </button>
        )}
      </div>

      <div className="shrink-0 px-6 py-4 flex flex-col items-center gap-1 text-center" onClick={(e) => e.stopPropagation()}>
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

export default function GalleryTab() {
  const [dragging, setDragging] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [customTitle, setCustomTitle] = useState("");
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editDesc, setEditDesc] = useState("");
  const [deleteTarget, setDeleteTarget] = useState<GalleryItem | null>(null);
  const [reorderMode, setReorderMode] = useState(false);
  const [reorderItems, setReorderItems] = useState<GalleryItem[]>([]);
  const [dragIdx, setDragIdx] = useState<number | null>(null);
  const [dragOverIdx, setDragOverIdx] = useState<number | null>(null);
  const [replacingId, setReplacingId] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const replaceInputRef = useRef<HTMLInputElement>(null);
  const queryClient = useQueryClient();

  const { data: items = [], isLoading } = useQuery({
    queryKey: ["gallery-items"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("gallery_items")
        .select("id, title, description, storage_path, public_url, file_name, file_size, created_at, sort_order")
        .order("sort_order", { ascending: true });
      if (error) throw error;
      return data as GalleryItem[];
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (item: GalleryItem) => {
      await supabase.storage.from("gallery-images").remove([item.storage_path]);
      const { error } = await supabase.from("gallery_items").delete().eq("id", item.id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["gallery-items"] });
      toast.success("Image deleted");
    },
    onError: () => toast.error("Failed to delete image"),
  });

  const updateDescMutation = useMutation({
    mutationFn: async ({ id, description }: { id: string; description: string }) => {
      const { error } = await supabase.from("gallery_items").update({ description }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["gallery-items"] });
      queryClient.invalidateQueries({ queryKey: ["gallery-items-public"] });
      toast.success("Description updated");
      setEditingId(null);
    },
    onError: () => toast.error("Failed to update description"),
  });

  const saveOrderMutation = useMutation({
    mutationFn: async (orderedItems: GalleryItem[]) => {
      const updates = orderedItems.map((item, index) =>
        supabase.from("gallery_items").update({ sort_order: index + 1 }).eq("id", item.id)
      );
      const results = await Promise.all(updates);
      const failed = results.find((r) => r.error);
      if (failed?.error) throw failed.error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["gallery-items"] });
      queryClient.invalidateQueries({ queryKey: ["gallery-items-public"] });
      toast.success("Order saved!");
      setReorderMode(false);
    },
    onError: () => toast.error("Failed to save order"),
  });

  const replaceImage = async (item: GalleryItem, file: File) => {
    if (!file.type.startsWith("image/")) {
      toast.error("Please upload an image file");
      return;
    }
    if (file.size > 10 * 1024 * 1024) {
      toast.error("File too large. Maximum size is 10MB");
      return;
    }

    setReplacingId(item.id);
    try {
      // Remove old file
      await supabase.storage.from("gallery-images").remove([item.storage_path]);

      // Upload new file
      const ext = file.name.split(".").pop();
      const fileName = `${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;
      const { error: uploadError } = await supabase.storage
        .from("gallery-images")
        .upload(fileName, file, { contentType: file.type });
      if (uploadError) throw uploadError;

      const { data: urlData } = supabase.storage.from("gallery-images").getPublicUrl(fileName);

      const { error: dbError } = await supabase.from("gallery_items").update({
        storage_path: fileName,
        public_url: urlData.publicUrl,
        file_name: file.name,
        file_size: file.size,
      }).eq("id", item.id);
      if (dbError) throw dbError;

      queryClient.invalidateQueries({ queryKey: ["gallery-items"] });
      queryClient.invalidateQueries({ queryKey: ["gallery-items-public"] });
      toast.success("Image replaced successfully!");
    } catch (err) {
      console.error(err);
      toast.error("Failed to replace image");
    } finally {
      setReplacingId(null);
    }
  };

  const uploadFile = async (file: File, title: string) => {
    if (!file.type.startsWith("image/")) {
      toast.error("Please upload an image file");
      return;
    }
    if (file.size > 10 * 1024 * 1024) {
      toast.error("File too large. Maximum size is 10MB");
      return;
    }

    setUploading(true);
    try {
      const ext = file.name.split(".").pop();
      const fileName = `${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;
      const { error: uploadError } = await supabase.storage
        .from("gallery-images")
        .upload(fileName, file, { contentType: file.type });
      if (uploadError) throw uploadError;

      const { data: urlData } = supabase.storage.from("gallery-images").getPublicUrl(fileName);
      const { data: { user } } = await supabase.auth.getUser();
      const { error: dbError } = await supabase.from("gallery_items").insert({
        title: title || file.name.replace(/\.[^/.]+$/, ""),
        storage_path: fileName,
        public_url: urlData.publicUrl,
        file_name: file.name,
        file_size: file.size,
        user_id: user?.id,
        sort_order: 0,
      });
      if (dbError) throw dbError;

      queryClient.invalidateQueries({ queryKey: ["gallery-items"] });
      toast.success("Image uploaded successfully!");
      setCustomTitle("");
    } catch (err) {
      console.error(err);
      toast.error("Upload failed");
    } finally {
      setUploading(false);
    }
  };

  const handleFiles = (files: FileList | null) => {
    if (!files || files.length === 0) return;
    uploadFile(files[0], customTitle);
  };

  const onDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setDragging(false);
      handleFiles(e.dataTransfer.files);
    },
    [customTitle]
  );

  const startEditing = (item: GalleryItem) => {
    setEditingId(item.id);
    setEditDesc(item.description || "");
  };

  const enterReorderMode = () => {
    setReorderItems([...items]);
    setReorderMode(true);
  };

  const cancelReorder = () => {
    setReorderMode(false);
    setReorderItems([]);
    setDragIdx(null);
    setDragOverIdx(null);
  };

  const moveItem = (from: number, to: number) => {
    if (to < 0 || to >= reorderItems.length) return;
    const updated = [...reorderItems];
    const [moved] = updated.splice(from, 1);
    updated.splice(to, 0, moved);
    setReorderItems(updated);
  };

  const handleDragStart = (index: number) => setDragIdx(index);
  const handleDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault();
    setDragOverIdx(index);
  };
  const handleDragEnd = () => {
    if (dragIdx !== null && dragOverIdx !== null && dragIdx !== dragOverIdx) {
      moveItem(dragIdx, dragOverIdx);
    }
    setDragIdx(null);
    setDragOverIdx(null);
  };

  const displayItems = reorderMode ? reorderItems : items;

  // Hidden input for replace
  const handleReplaceFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    const item = items.find((i) => i.id === replacingId);
    if (file && item) replaceImage(item, file);
    e.target.value = "";
  };

  const triggerReplace = (item: GalleryItem) => {
    setReplacingId(item.id);
    setTimeout(() => replaceInputRef.current?.click(), 0);
  };

  return (
    <div className="space-y-8">
      {/* Hidden replace input */}
      <input
        ref={replaceInputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={handleReplaceFile}
      />

      {/* Upload Zone */}
      {!reorderMode && (
        <div className="space-y-3">
          <Input
            placeholder="Image title (optional)"
            value={customTitle}
            onChange={(e) => setCustomTitle(e.target.value)}
            className="bg-input border-border text-foreground placeholder:text-muted-foreground max-w-sm"
          />
          <div
            className={`upload-zone rounded-xl p-10 text-center cursor-pointer ${dragging ? "dragging" : ""}`}
            onDrop={onDrop}
            onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
            onDragLeave={() => setDragging(false)}
            onClick={() => fileInputRef.current?.click()}
          >
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(e) => handleFiles(e.target.files)}
            />
            <div className="flex flex-col items-center gap-3">
              <div className="w-14 h-14 rounded-full bg-primary/10 flex items-center justify-center">
                {uploading ? (
                  <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                ) : (
                  <Upload className="w-6 h-6 text-primary" />
                )}
              </div>
              <div>
                <p className="text-foreground font-medium">
                  {uploading ? "Uploading..." : "Drop an image here or click to browse"}
                </p>
                <p className="text-muted-foreground text-sm mt-1">PNG, JPG, GIF, WEBP, SVG supported</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Reorder Controls */}
      {items.length > 1 && (
        <div className="flex items-center gap-2">
          {reorderMode ? (
            <>
              <Button size="sm" onClick={() => saveOrderMutation.mutate(reorderItems)} disabled={saveOrderMutation.isPending} className="gap-2">
                <Check className="w-4 h-4" />
                {saveOrderMutation.isPending ? "Saving..." : "Save Order"}
              </Button>
              <Button size="sm" variant="outline" onClick={cancelReorder} className="gap-2">
                <X className="w-4 h-4" />
                Cancel
              </Button>
              <span className="text-muted-foreground text-xs ml-2">
                Drag tiles or use arrows to reorder.
              </span>
            </>
          ) : (
            <Button size="sm" variant="outline" onClick={enterReorderMode} className="gap-2">
              <ArrowUpDown className="w-4 h-4" />
              Rearrange
            </Button>
          )}
        </div>
      )}

      {/* Gallery Grid — matches public view layout */}
      {isLoading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="h-48 rounded-xl bg-secondary animate-pulse" />
          ))}
        </div>
      ) : displayItems.length === 0 ? (
        <div className="text-center py-20 text-muted-foreground">
          <ImageIcon className="w-12 h-12 mx-auto mb-3 opacity-30" />
          <p>No images uploaded yet</p>
        </div>
      ) : (
        <div className="columns-1 sm:columns-2 md:columns-3 lg:columns-4 xl:columns-5 gap-3 space-y-3">
          {displayItems.map((item, index) => (
            <div
              key={item.id}
              className={`surface rounded-xl overflow-hidden group relative transition-all duration-200 break-inside-avoid ${
                reorderMode
                  ? "ring-2 ring-primary/20 cursor-grab active:cursor-grabbing"
                  : "card-hover"
              } ${dragOverIdx === index && reorderMode ? "ring-2 ring-primary scale-[1.02]" : ""}`}
              draggable={reorderMode}
              onDragStart={() => reorderMode && handleDragStart(index)}
              onDragOver={(e) => reorderMode && handleDragOver(e, index)}
              onDragEnd={() => reorderMode && handleDragEnd()}
            >
              {/* Reorder overlay */}
              {reorderMode && (
                <div className="absolute top-2 left-2 right-2 z-10 flex items-center justify-between">
                  <div className="bg-background/80 backdrop-blur-sm rounded-md px-2 py-1 flex items-center gap-1">
                    <GripVertical className="w-4 h-4 text-muted-foreground" />
                    <span className="text-xs font-medium text-foreground">#{index + 1}</span>
                  </div>
                  <div className="flex gap-1">
                    <button
                      onClick={(e) => { e.stopPropagation(); moveItem(index, index - 1); }}
                      disabled={index === 0}
                      className="w-7 h-7 rounded-md bg-background/80 backdrop-blur-sm flex items-center justify-center text-muted-foreground hover:text-foreground disabled:opacity-30 transition-colors"
                    >
                      <ArrowUp className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={(e) => { e.stopPropagation(); moveItem(index, index + 1); }}
                      disabled={index === displayItems.length - 1}
                      className="w-7 h-7 rounded-md bg-background/80 backdrop-blur-sm flex items-center justify-center text-muted-foreground hover:text-foreground disabled:opacity-30 transition-colors"
                    >
                      <ArrowDown className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              )}

              {/* Image — click to zoom */}
              <div
                className="overflow-hidden cursor-pointer relative"
                onClick={() => !reorderMode && setLightboxIndex(index)}
              >
                <img
                  src={item.public_url}
                  alt={item.title}
                  className="w-full h-auto block transition-transform duration-300 group-hover:scale-105"
                />
                {!reorderMode && (
                  <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors duration-200 flex items-center justify-center pointer-events-none">
                    <ZoomIn className="w-8 h-8 text-white opacity-0 group-hover:opacity-100 transition-opacity duration-200" />
                  </div>
                )}
              </div>

              {/* Info */}
              <div className="px-3 py-2.5">
                <p className="text-foreground font-medium text-sm truncate">{item.title}</p>

                {!reorderMode && (
                  <>
                    {editingId === item.id ? (
                      <div className="mt-1.5 flex gap-1.5" onClick={(e) => e.stopPropagation()}>
                        <Textarea
                          value={editDesc}
                          onChange={(e) => setEditDesc(e.target.value)}
                          placeholder="Add a description..."
                          className="text-xs min-h-[60px] bg-input border-border"
                        />
                        <button
                          onClick={() => updateDescMutation.mutate({ id: item.id, description: editDesc })}
                          className="shrink-0 text-primary hover:text-primary/80 transition-colors"
                        >
                          <Check className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => setEditingId(null)}
                          className="shrink-0 text-muted-foreground hover:text-foreground transition-colors"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                    ) : (
                      <div className="flex items-start gap-1 mt-0.5">
                        <p className="text-muted-foreground text-xs flex-1 line-clamp-2">
                          {item.description || <span className="italic opacity-50">No description</span>}
                        </p>
                        <button
                          onClick={(e) => { e.stopPropagation(); startEditing(item); }}
                          className="shrink-0 text-muted-foreground hover:text-foreground transition-colors mt-0.5"
                        >
                          <Pencil className="w-3 h-3" />
                        </button>
                      </div>
                    )}

                    <div className="flex items-center gap-2 mt-2" onClick={(e) => e.stopPropagation()}>
                      <a
                        href={item.public_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-1.5 text-primary hover:text-primary/80 text-xs font-medium transition-colors"
                      >
                        <ExternalLink className="w-3.5 h-3.5" />
                        Open
                      </a>
                      <button
                        onClick={() => triggerReplace(item)}
                        className="flex items-center gap-1 text-muted-foreground hover:text-foreground text-xs transition-colors"
                        disabled={replacingId === item.id}
                      >
                        <RefreshCw className={`w-3.5 h-3.5 ${replacingId === item.id ? "animate-spin" : ""}`} />
                        Replace
                      </button>
                      <button
                        onClick={() => setDeleteTarget(item)}
                        className="ml-auto text-muted-foreground hover:text-destructive transition-colors"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Lightbox with navigation */}
      {lightboxIndex !== null && (
        <AdminLightbox
          items={displayItems}
          currentIndex={lightboxIndex}
          onClose={() => setLightboxIndex(null)}
          onNavigate={setLightboxIndex}
        />
      )}

      {/* Delete Confirmation */}
      <AlertDialog open={!!deleteTarget} onOpenChange={(open) => !open && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete image?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete <span className="font-medium text-foreground">"{deleteTarget?.title}"</span> and remove it from storage.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() => {
                if (deleteTarget) deleteMutation.mutate(deleteTarget);
                setDeleteTarget(null);
              }}
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
