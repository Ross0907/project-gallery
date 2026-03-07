import { useState, useRef, useEffect, useCallback } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Crop, Lock, Unlock, RotateCcw } from "lucide-react";

interface CropResizeDialogProps {
  open: boolean;
  onClose: () => void;
  imageUrl: string;
  onSave: (blob: Blob) => void;
  saving?: boolean;
}

export default function CropResizeDialog({ open, onClose, imageUrl, onSave, saving }: CropResizeDialogProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const imgRef = useRef<HTMLImageElement | null>(null);
  const [naturalW, setNaturalW] = useState(0);
  const [naturalH, setNaturalH] = useState(0);
  const [targetW, setTargetW] = useState("");
  const [targetH, setTargetH] = useState("");
  const [lockAspect, setLockAspect] = useState(true);
  const [aspectRatio, setAspectRatio] = useState(1);

  // Crop selection (in natural image coords)
  const [cropEnabled, setCropEnabled] = useState(false);
  const [cropStart, setCropStart] = useState<{ x: number; y: number } | null>(null);
  const [cropEnd, setCropEnd] = useState<{ x: number; y: number } | null>(null);
  const [dragging, setDragging] = useState(false);
  const previewRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open || !imageUrl) return;
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => {
      imgRef.current = img;
      setNaturalW(img.naturalWidth);
      setNaturalH(img.naturalHeight);
      setTargetW(String(img.naturalWidth));
      setTargetH(String(img.naturalHeight));
      setAspectRatio(img.naturalWidth / img.naturalHeight);
      setCropStart(null);
      setCropEnd(null);
      setCropEnabled(false);
    };
    img.src = imageUrl;
  }, [open, imageUrl]);

  const handleWidthChange = (val: string) => {
    setTargetW(val);
    if (lockAspect && val) {
      const w = parseInt(val, 10);
      if (!isNaN(w)) setTargetH(String(Math.round(w / aspectRatio)));
    }
  };

  const handleHeightChange = (val: string) => {
    setTargetH(val);
    if (lockAspect && val) {
      const h = parseInt(val, 10);
      if (!isNaN(h)) setTargetW(String(Math.round(h * aspectRatio)));
    }
  };

  const getDisplayScale = useCallback(() => {
    if (!previewRef.current || !naturalW) return 1;
    const rect = previewRef.current.getBoundingClientRect();
    const scaleX = rect.width / naturalW;
    const scaleY = rect.height / naturalH;
    return Math.min(scaleX, scaleY, 1);
  }, [naturalW, naturalH]);

  const toNaturalCoords = useCallback((clientX: number, clientY: number) => {
    if (!previewRef.current || !naturalW) return { x: 0, y: 0 };
    const rect = previewRef.current.getBoundingClientRect();
    const scale = getDisplayScale();
    const displayW = naturalW * scale;
    const displayH = naturalH * scale;
    const offsetX = (rect.width - displayW) / 2;
    const offsetY = (rect.height - displayH) / 2;
    const x = Math.max(0, Math.min(naturalW, (clientX - rect.left - offsetX) / scale));
    const y = Math.max(0, Math.min(naturalH, (clientY - rect.top - offsetY) / scale));
    return { x, y };
  }, [naturalW, naturalH, getDisplayScale]);

  const handleMouseDown = (e: React.MouseEvent) => {
    if (!cropEnabled) return;
    const coords = toNaturalCoords(e.clientX, e.clientY);
    setCropStart(coords);
    setCropEnd(coords);
    setDragging(true);
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!dragging || !cropEnabled) return;
    setCropEnd(toNaturalCoords(e.clientX, e.clientY));
  };

  const handleMouseUp = () => setDragging(false);

  const getCropRect = () => {
    if (!cropStart || !cropEnd) return null;
    const x = Math.min(cropStart.x, cropEnd.x);
    const y = Math.min(cropStart.y, cropEnd.y);
    const w = Math.abs(cropEnd.x - cropStart.x);
    const h = Math.abs(cropEnd.y - cropStart.y);
    if (w < 5 || h < 5) return null;
    return { x, y, w, h };
  };

  const applyCrop = () => {
    const rect = getCropRect();
    if (!rect) return;
    setNaturalW(Math.round(rect.w));
    setNaturalH(Math.round(rect.h));
    setTargetW(String(Math.round(rect.w)));
    setTargetH(String(Math.round(rect.h)));
    setAspectRatio(rect.w / rect.h);

    // Draw cropped portion to a temp canvas, then update imgRef
    const canvas = document.createElement("canvas");
    canvas.width = Math.round(rect.w);
    canvas.height = Math.round(rect.h);
    const ctx = canvas.getContext("2d");
    if (ctx && imgRef.current) {
      ctx.drawImage(imgRef.current, rect.x, rect.y, rect.w, rect.h, 0, 0, rect.w, rect.h);
      const newImg = new Image();
      newImg.onload = () => {
        imgRef.current = newImg;
        setCropStart(null);
        setCropEnd(null);
        setCropEnabled(false);
      };
      newImg.src = canvas.toDataURL("image/png");
    }
  };

  const resetImage = () => {
    if (!imageUrl) return;
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => {
      imgRef.current = img;
      setNaturalW(img.naturalWidth);
      setNaturalH(img.naturalHeight);
      setTargetW(String(img.naturalWidth));
      setTargetH(String(img.naturalHeight));
      setAspectRatio(img.naturalWidth / img.naturalHeight);
      setCropStart(null);
      setCropEnd(null);
      setCropEnabled(false);
    };
    img.src = imageUrl;
  };

  const handleSave = () => {
    const w = parseInt(targetW, 10);
    const h = parseInt(targetH, 10);
    if (!w || !h || !imgRef.current) return;

    const canvas = document.createElement("canvas");
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.drawImage(imgRef.current, 0, 0, w, h);
    canvas.toBlob((blob) => {
      if (blob) onSave(blob);
    }, "image/png");
  };

  const cropRect = getCropRect();
  const scale = getDisplayScale();

  // Common presets
  const presets = [
    { label: "1:1", w: Math.min(naturalW, naturalH), h: Math.min(naturalW, naturalH) },
    { label: "16:9", w: naturalW, h: Math.round(naturalW / (16 / 9)) },
    { label: "4:3", w: naturalW, h: Math.round(naturalW / (4 / 3)) },
    { label: "Original", w: naturalW, h: naturalH },
  ];

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Crop className="w-5 h-5" />
            Crop & Resize
          </DialogTitle>
        </DialogHeader>

        {/* Preview */}
        <div
          ref={previewRef}
          className={`relative bg-muted rounded-lg overflow-hidden flex items-center justify-center min-h-[200px] max-h-[400px] ${cropEnabled ? "cursor-crosshair" : ""}`}
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onMouseLeave={handleMouseUp}
        >
          {imgRef.current && (
            <img
              src={imgRef.current.src}
              alt="Preview"
              className="max-w-full max-h-[400px] object-contain select-none"
              draggable={false}
            />
          )}
          {/* Crop overlay */}
          {cropEnabled && cropRect && (
            <>
              <div className="absolute inset-0 bg-black/40 pointer-events-none" />
              <div
                className="absolute border-2 border-primary bg-transparent pointer-events-none"
                style={{
                  left: `calc(50% - ${(naturalW * scale) / 2}px + ${cropRect.x * scale}px)`,
                  top: `calc(50% - ${(naturalH * scale) / 2}px + ${cropRect.y * scale}px)`,
                  width: cropRect.w * scale,
                  height: cropRect.h * scale,
                }}
              />
              {/* Clear area inside crop */}
              <div
                className="absolute pointer-events-none overflow-hidden"
                style={{
                  left: `calc(50% - ${(naturalW * scale) / 2}px + ${cropRect.x * scale}px)`,
                  top: `calc(50% - ${(naturalH * scale) / 2}px + ${cropRect.y * scale}px)`,
                  width: cropRect.w * scale,
                  height: cropRect.h * scale,
                }}
              >
                <img
                  src={imgRef.current?.src}
                  alt=""
                  className="select-none"
                  draggable={false}
                  style={{
                    position: "absolute",
                    width: naturalW * scale,
                    height: naturalH * scale,
                    left: -cropRect.x * scale,
                    top: -cropRect.y * scale,
                  }}
                />
              </div>
            </>
          )}
        </div>

        {/* Crop info */}
        {cropEnabled && cropRect && (
          <div className="flex items-center gap-2">
            <span className="text-xs text-muted-foreground">
              Selection: {Math.round(cropRect.w)} × {Math.round(cropRect.h)}
            </span>
            <Button size="sm" onClick={applyCrop} className="gap-1">
              <Crop className="w-3.5 h-3.5" /> Apply Crop
            </Button>
          </div>
        )}

        {/* Controls */}
        <div className="space-y-3">
          <div className="flex items-center gap-3 flex-wrap">
            <Button
              size="sm"
              variant={cropEnabled ? "default" : "outline"}
              onClick={() => { setCropEnabled(!cropEnabled); setCropStart(null); setCropEnd(null); }}
              className="gap-1.5"
            >
              <Crop className="w-3.5 h-3.5" />
              {cropEnabled ? "Cancel Crop" : "Crop"}
            </Button>
            <Button size="sm" variant="outline" onClick={resetImage} className="gap-1.5">
              <RotateCcw className="w-3.5 h-3.5" /> Reset
            </Button>
            {presets.map((p) => (
              <Button
                key={p.label}
                size="sm"
                variant="ghost"
                onClick={() => {
                  setTargetW(String(p.w));
                  setTargetH(String(p.h));
                  setAspectRatio(p.w / p.h);
                }}
                className="text-xs"
              >
                {p.label}
              </Button>
            ))}
          </div>

          <div className="flex items-end gap-3">
            <div className="space-y-1">
              <Label className="text-xs">Width (px)</Label>
              <Input
                type="number"
                min={1}
                value={targetW}
                onChange={(e) => handleWidthChange(e.target.value)}
                className="w-28 h-9"
              />
            </div>
            <button
              onClick={() => setLockAspect(!lockAspect)}
              className="h-9 w-9 flex items-center justify-center rounded-md border border-border text-muted-foreground hover:text-foreground transition-colors"
              title={lockAspect ? "Unlock aspect ratio" : "Lock aspect ratio"}
            >
              {lockAspect ? <Lock className="w-4 h-4" /> : <Unlock className="w-4 h-4" />}
            </button>
            <div className="space-y-1">
              <Label className="text-xs">Height (px)</Label>
              <Input
                type="number"
                min={1}
                value={targetH}
                onChange={(e) => handleHeightChange(e.target.value)}
                className="w-28 h-9"
              />
            </div>
            <span className="text-xs text-muted-foreground pb-2">
              Original: {naturalW} × {naturalH}
            </span>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button onClick={handleSave} disabled={saving}>
            {saving ? "Saving..." : "Save & Update"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
