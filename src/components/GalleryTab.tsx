import { useState, useRef, useCallback } from "react";
import { Upload, ExternalLink, Trash2, ImageIcon, X, ZoomIn, Pencil, Check } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
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
}

export default function GalleryTab() {
  const [dragging, setDragging] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [customTitle, setCustomTitle] = useState("");
  const [lightboxUrl, setLightboxUrl] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editDesc, setEditDesc] = useState("");
  const [deleteTarget, setDeleteTarget] = useState<GalleryItem | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const queryClient = useQueryClient();

  const { data: items = [], isLoading } = useQuery({
    queryKey: ["gallery-items"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("gallery_items")
        .select("*")
        .order("created_at", { ascending: false });
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
      const { error } = await supabase
        .from("gallery_items")
        .update({ description })
        .eq("id", id);
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

  const uploadFile = async (file: File, title: string) => {
    if (!file.type.startsWith("image/")) {
      toast.error("Please upload an image file");
      return;
    }
    const MAX_FILE_SIZE = 10 * 1024 * 1024;
    if (file.size > MAX_FILE_SIZE) {
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

      const { data: urlData } = supabase.storage
        .from("gallery-images")
        .getPublicUrl(fileName);

      const { data: { user } } = await supabase.auth.getUser();
      const { error: dbError } = await supabase.from("gallery_items").insert({
        title: title || file.name.replace(/\.[^/.]+$/, ""),
        storage_path: fileName,
        public_url: urlData.publicUrl,
        file_name: file.name,
        file_size: file.size,
        user_id: user?.id,
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

  const formatSize = (bytes: number | null) => {
    if (!bytes) return "";
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const startEditing = (item: GalleryItem) => {
    setEditingId(item.id);
    setEditDesc(item.description || "");
  };

  return (
    <div className="space-y-8">
      {/* Upload Zone */}
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

      {/* Gallery Grid */}
      {isLoading ? (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="aspect-square rounded-xl bg-secondary animate-pulse" />
          ))}
        </div>
      ) : items.length === 0 ? (
        <div className="text-center py-20 text-muted-foreground">
          <ImageIcon className="w-12 h-12 mx-auto mb-3 opacity-30" />
          <p>No images uploaded yet</p>
        </div>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {items.map((item) => (
            <div
              key={item.id}
              className="surface rounded-xl overflow-hidden card-hover group relative"
            >
              <div
                className="relative cursor-pointer overflow-hidden flex items-center justify-center p-2"
                onClick={() => setLightboxUrl(item.public_url)}
              >
                <img
                  src={item.public_url}
                  alt={item.title}
                  className="max-w-full max-h-72 object-contain transition-transform duration-300 group-hover:scale-105"
                />
                <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors duration-200 flex items-center justify-center">
                  <ZoomIn className="w-8 h-8 text-white opacity-0 group-hover:opacity-100 transition-opacity duration-200" />
                </div>
              </div>

              <div className="p-3 bg-card">
                <p className="text-foreground font-medium text-sm truncate">{item.title}</p>

                {/* Description edit */}
                {editingId === item.id ? (
                  <div className="mt-1.5 flex gap-1.5">
                    <Textarea
                      value={editDesc}
                      onChange={(e) => setEditDesc(e.target.value)}
                      placeholder="Add a description..."
                      className="text-xs min-h-[60px] bg-input border-border"
                      onClick={(e) => e.stopPropagation()}
                    />
                    <button
                      onClick={(e) => { e.stopPropagation(); updateDescMutation.mutate({ id: item.id, description: editDesc }); }}
                      className="shrink-0 text-primary hover:text-primary/80 transition-colors"
                    >
                      <Check className="w-4 h-4" />
                    </button>
                    <button
                      onClick={(e) => { e.stopPropagation(); setEditingId(null); }}
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

                {item.file_size && (
                  <p className="text-muted-foreground text-xs mt-1">{formatSize(item.file_size)}</p>
                )}
                <div className="flex items-center gap-2 mt-2">
                  <a
                    href={item.public_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-1.5 text-primary hover:text-primary/80 text-xs font-medium transition-colors"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <ExternalLink className="w-3.5 h-3.5" />
                    Open Raw
                  </a>
                  <button
                    onClick={(e) => { e.stopPropagation(); setDeleteTarget(item); }}
                    className="ml-auto text-muted-foreground hover:text-destructive transition-colors"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {items.length > 0 && (
        <p className="text-muted-foreground text-sm">
          Each "Open Raw" link opens a clean, image-only page suitable for sharing or embedding.
        </p>
      )}

      {/* Lightbox */}
      {lightboxUrl && (
        <div
          className="fixed inset-0 bg-black/90 z-50 flex items-center justify-center p-4"
          onClick={() => setLightboxUrl(null)}
        >
          <button
            className="absolute top-4 right-4 text-white/70 hover:text-white transition-colors"
            onClick={() => setLightboxUrl(null)}
          >
            <X className="w-8 h-8" />
          </button>
          <img
            src={lightboxUrl}
            alt=""
            className="max-w-full max-h-full object-contain rounded-lg"
            onClick={(e) => e.stopPropagation()}
          />
          <a
            href={lightboxUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="absolute bottom-6 left-1/2 -translate-x-1/2 flex items-center gap-2 bg-primary text-primary-foreground px-4 py-2 rounded-lg text-sm font-medium hover:bg-primary/90 transition-colors"
            onClick={(e) => e.stopPropagation()}
          >
            <ExternalLink className="w-4 h-4" />
            Open Raw Image
          </a>
        </div>
      )}

      {/* Delete Confirmation */}
      <AlertDialog open={!!deleteTarget} onOpenChange={(open) => !open && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete image?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete <span className="font-medium text-foreground">"{deleteTarget?.title}"</span> and remove it from storage. This action cannot be undone.
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
