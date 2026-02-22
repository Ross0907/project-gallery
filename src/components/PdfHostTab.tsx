import { useState, useRef, useCallback } from "react";
import { Upload, Link, Trash2, FileText, Copy, Check, ExternalLink } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Input } from "@/components/ui/input";
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

interface HostedPdf {
  id: string;
  title: string;
  storage_path: string;
  public_url: string;
  file_name: string;
  file_size: number | null;
  created_at: string;
}

function CopyButton({ url }: { url: string }) {
  const [copied, setCopied] = useState(false);

  const copy = async () => {
    await navigator.clipboard.writeText(url);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
    toast.success("Link copied to clipboard!");
  };

  return (
    <button
      onClick={copy}
      className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors"
      title="Copy link"
    >
      {copied ? (
        <Check className="w-3.5 h-3.5 text-primary" />
      ) : (
        <Copy className="w-3.5 h-3.5" />
      )}
      {copied ? "Copied!" : "Copy link"}
    </button>
  );
}

export default function PdfHostTab() {
  const [dragging, setDragging] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [customTitle, setCustomTitle] = useState("");
  const [deleteTarget, setDeleteTarget] = useState<HostedPdf | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const queryClient = useQueryClient();

  const { data: pdfs = [], isLoading } = useQuery({
    queryKey: ["hosted-pdfs"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("hosted_pdfs")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data as HostedPdf[];
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (pdf: HostedPdf) => {
      await supabase.storage.from("hosted-pdfs").remove([pdf.storage_path]);
      const { error } = await supabase.from("hosted_pdfs").delete().eq("id", pdf.id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["hosted-pdfs"] });
      toast.success("PDF deleted");
    },
    onError: () => toast.error("Failed to delete PDF"),
  });

  const uploadFile = async (file: File, title: string) => {
    if (file.type !== "application/pdf") {
      toast.error("Please upload a PDF file");
      return;
    }
    const MAX_PDF_SIZE = 50 * 1024 * 1024; // 50MB
    if (file.size > MAX_PDF_SIZE) {
      toast.error("File too large. Maximum size is 50MB");
      return;
    }

    setUploading(true);
    try {
      const fileName = `${Date.now()}-${Math.random().toString(36).slice(2)}.pdf`;

      const { error: uploadError } = await supabase.storage
        .from("hosted-pdfs")
        .upload(fileName, file, { contentType: "application/pdf" });

      if (uploadError) throw uploadError;

      const { data: urlData } = supabase.storage
        .from("hosted-pdfs")
        .getPublicUrl(fileName);

      const { data: { user } } = await supabase.auth.getUser();
      const { error: dbError } = await supabase.from("hosted_pdfs").insert({
        title: title || file.name.replace(/\.pdf$/i, ""),
        storage_path: fileName,
        public_url: urlData.publicUrl,
        file_name: file.name,
        file_size: file.size,
        user_id: user?.id,
      });

      if (dbError) throw dbError;

      queryClient.invalidateQueries({ queryKey: ["hosted-pdfs"] });
      toast.success("PDF hosted successfully!");
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

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  };

  return (
    <div className="space-y-8">
      {/* Upload Zone */}
      <div className="space-y-3">
        <Input
          placeholder="PDF title (optional)"
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
            accept="application/pdf"
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
                {uploading ? "Uploading PDF..." : "Drop a PDF here or click to browse"}
              </p>
              <p className="text-muted-foreground text-sm mt-1">
                The link will open the PDF directly in the browser
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Info Banner */}
      <div className="flex items-start gap-3 p-4 rounded-lg bg-primary/10 border border-primary/20">
        <Link className="w-4 h-4 text-primary mt-0.5 shrink-0" />
        <p className="text-sm text-primary/90">
          Hosted PDFs get a permanent public URL. Recipients can open the link in any browser — it renders the PDF directly without needing to download it.
        </p>
      </div>

      {/* PDF List */}
      {isLoading ? (
        <div className="space-y-3">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="h-20 rounded-xl bg-secondary animate-pulse" />
          ))}
        </div>
      ) : pdfs.length === 0 ? (
        <div className="text-center py-20 text-muted-foreground">
          <FileText className="w-12 h-12 mx-auto mb-3 opacity-30" />
          <p>No PDFs hosted yet</p>
        </div>
      ) : (
        <div className="space-y-3">
          {pdfs.map((pdf) => (
            <div
              key={pdf.id}
              className="surface rounded-xl p-4 card-hover group"
            >
              <div className="flex items-start gap-4">
                {/* Icon */}
                <div className="w-10 h-10 rounded-lg bg-destructive/10 border border-destructive/20 flex items-center justify-center shrink-0">
                  <FileText className="w-5 h-5 text-destructive" />
                </div>

                {/* Info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className="text-foreground font-medium truncate">{pdf.title}</p>
                    {pdf.file_size && (
                      <span className="text-muted-foreground text-xs bg-secondary px-2 py-0.5 rounded-full">
                        {formatSize(pdf.file_size)}
                      </span>
                    )}
                  </div>
                  <p className="text-muted-foreground text-xs mt-0.5">{pdf.file_name}</p>

                  {/* URL */}
                  <div className="flex items-center gap-2 mt-2 flex-wrap">
                    <code className="text-primary text-xs bg-primary/10 px-2 py-1 rounded truncate max-w-xs">
                      {pdf.public_url}
                    </code>
                    <CopyButton url={pdf.public_url} />
                    <a
                      href={pdf.public_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors"
                    >
                      <ExternalLink className="w-3.5 h-3.5" />
                      Open
                    </a>
                  </div>
                </div>

                {/* Right side */}
                <div className="flex flex-col items-end gap-2 shrink-0">
                  <span className="text-muted-foreground text-xs">{formatDate(pdf.created_at)}</span>
                  <button
                    onClick={() => setDeleteTarget(pdf)}
                    className="text-muted-foreground hover:text-destructive transition-colors"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Delete Confirmation */}
      <AlertDialog open={!!deleteTarget} onOpenChange={(open) => !open && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete PDF?</AlertDialogTitle>
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
