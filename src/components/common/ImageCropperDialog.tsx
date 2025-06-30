"use client";

import { useState, useRef } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import ReactCrop, {
  centerCrop,
  makeAspectCrop,
  type Crop,
  type PixelCrop,
} from "react-image-crop";
import "react-image-crop/dist/ReactCrop.css";
import { useToast } from "@/hooks/use-toast";
import { Loader2 } from "lucide-react";

interface ImageCropperDialogProps {
  isOpen: boolean;
  setIsOpen: (isOpen: boolean) => void;
  imageSrc: string | null;
  aspectRatio: number;
  onCropComplete: (croppedImageUrl: string) => void;
  circularCrop?: boolean;
}

/**
 * Creates a cropped image from a source image and a crop object.
 * Handles both rectangular and circular crops.
 */
function getCroppedImg(
  image: HTMLImageElement,
  crop: PixelCrop,
  quality: number,
  circularCrop: boolean = false
): Promise<string> {
  const canvas = document.createElement("canvas");
  const scaleX = image.naturalWidth / image.width;
  const scaleY = image.naturalHeight / image.height;
  
  canvas.width = crop.width;
  canvas.height = crop.height;

  const ctx = canvas.getContext("2d");

  if (!ctx) {
    return Promise.reject(new Error("Canvas context is not available"));
  }

  const pixelRatio = window.devicePixelRatio || 1;
  canvas.width = crop.width * pixelRatio;
  canvas.height = crop.height * pixelRatio;
  ctx.setTransform(pixelRatio, 0, 0, pixelRatio, 0, 0);
  ctx.imageSmoothingQuality = "high";
  
  // If circular, clip the canvas to a circle
  if (circularCrop) {
    ctx.beginPath();
    ctx.arc(crop.width / 2, crop.height / 2, crop.width / 2, 0, Math.PI * 2, true);
    ctx.closePath();
    ctx.clip();
  }

  ctx.drawImage(
    image,
    crop.x * scaleX,
    crop.y * scaleY,
    crop.width * scaleX,
    crop.height * scaleY,
    0,
    0,
    crop.width,
    crop.height
  );
  
  // For circular crops, it's better to return a PNG to support transparency.
  const format = circularCrop ? 'image/png' : 'image/jpeg';

  return new Promise((resolve) => {
    resolve(canvas.toDataURL(format, quality));
  });
}


export default function ImageCropperDialog({
  isOpen,
  setIsOpen,
  imageSrc,
  aspectRatio,
  onCropComplete,
  circularCrop = false,
}: ImageCropperDialogProps) {
  const { toast } = useToast();
  const [crop, setCrop] = useState<Crop>();
  const [completedCrop, setCompletedCrop] = useState<PixelCrop>();
  const [isCropping, setIsCropping] = useState(false);
  const imgRef = useRef<HTMLImageElement>(null);

  function onImageLoad(e: React.SyntheticEvent<HTMLImageElement>) {
    const { width, height } = e.currentTarget;
    const crop = centerCrop(
      makeAspectCrop(
        {
          unit: "%",
          width: 90,
        },
        aspectRatio,
        width,
        height
      ),
      width,
      height
    );
    setCrop(crop);
  }

  async function handleCrop() {
    if (!completedCrop || !imgRef.current) {
        toast({
            variant: "destructive",
            description: "Lütfen kırpılacak bir alan seçin.",
        });
        return;
    }
    
    setIsCropping(true);
    try {
        const quality = 0.9;
        const croppedImageUrl = await getCroppedImg(imgRef.current, completedCrop, quality, circularCrop);
        onCropComplete(croppedImageUrl);
        setIsOpen(false);
    } catch (error) {
        console.error("Resim kırpılırken hata:", error);
        toast({
            variant: "destructive",
            description: "Resim kırpılırken bir hata oluştu.",
        });
    } finally {
        setIsCropping(false);
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={(open) => {
        if(!open) {
            setIsOpen(false);
            setCrop(undefined);
            setCompletedCrop(undefined);
        }
    }}>
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>Resmi Kırp ve Ayarla</DialogTitle>
          <DialogDescription>
            Resminizin görünmesini istediğiniz alanını seçin ve sürükleyerek ayarlayın.
          </DialogDescription>
        </DialogHeader>
        <div className="flex justify-center items-center p-4 bg-muted/50 rounded-lg">
          {imageSrc && (
            <ReactCrop
              crop={crop}
              onChange={(_, percentCrop) => setCrop(percentCrop)}
              onComplete={(c) => setCompletedCrop(c)}
              aspect={aspectRatio || undefined}
              circularCrop={circularCrop}
              className="max-h-[60vh]"
            >
              <img
                ref={imgRef}
                alt="Crop me"
                src={imageSrc}
                onLoad={onImageLoad}
              />
            </ReactCrop>
          )}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => setIsOpen(false)}>
            İptal
          </Button>
          <Button onClick={handleCrop} disabled={isCropping}>
            {isCropping && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Onayla ve Kırp
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
