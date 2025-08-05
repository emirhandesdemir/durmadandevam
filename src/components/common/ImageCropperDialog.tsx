"use client";

import { useState, useRef, useEffect } from "react";
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
import { CropIcon, Loader2, RectangleHorizontal, Square } from "lucide-react";
import { cn } from "@/lib/utils";


interface ImageCropperDialogProps {
  isOpen: boolean;
  setIsOpen: (isOpen: boolean) => void;
  imageSrc: string | null;
  aspectRatio?: number;
  onCropComplete: (croppedImageUrl: string) => void;
  circularCrop?: boolean;
}

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
  
  const format = circularCrop ? 'image/png' : 'image/jpeg';

  return new Promise((resolve) => {
    resolve(canvas.toDataURL(format, quality));
  });
}

const ASPECT_RATIOS = [
    { name: '16:9', value: 16/9, icon: RectangleHorizontal },
    { name: '4:3', value: 4/3, icon: RectangleHorizontal },
    { name: 'Kare', value: 1, icon: Square },
    { name: 'Serbest', value: undefined, icon: CropIcon },
];

export default function ImageCropperDialog({
  isOpen,
  setIsOpen,
  imageSrc,
  aspectRatio: initialAspectRatio,
  onCropComplete,
  circularCrop = false,
}: ImageCropperDialogProps) {
  const { toast } = useToast();
  const [crop, setCrop] = useState<Crop>();
  const [completedCrop, setCompletedCrop] = useState<PixelCrop>();
  const [isCropping, setIsCropping] = useState(false);
  const [aspect, setAspect] = useState<number | undefined>(initialAspectRatio);
  const imgRef = useRef<HTMLImageElement>(null);

  useEffect(() => {
    if (isOpen) {
        setAspect(initialAspectRatio);
    }
  }, [initialAspectRatio, isOpen]);


  function onImageLoad(e: React.SyntheticEvent<HTMLImageElement>) {
    const { width, height } = e.currentTarget;
    const newCrop = centerCrop(
      makeAspectCrop(
        {
          unit: "%",
          width: 90,
        },
        aspect || width / height,
        width,
        height
      ),
      width,
      height
    );
    setCrop(newCrop);
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
        const quality = 0.92;
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
  
  const handleAspectChange = (newAspect: number | undefined) => {
    setAspect(newAspect);
    if (imgRef.current) {
        const { width, height } = imgRef.current;
        const newCrop = centerCrop(
            makeAspectCrop(
                { unit: '%', width: 90 },
                newAspect || width / height,
                width,
                height
            ),
            width,
            height
        );
        setCrop(newCrop);
    }
  };

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
        <div className="flex flex-col justify-center items-center p-4 bg-muted/50 rounded-lg">
          {imageSrc && (
            <ReactCrop
              crop={crop}
              onChange={(_, percentCrop) => setCrop(percentCrop)}
              onComplete={(c) => setCompletedCrop(c)}
              aspect={aspect}
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
          {!circularCrop && (
            <div className="flex justify-center gap-2 mt-4 flex-wrap">
                {ASPECT_RATIOS.map(item => {
                    const Icon = item.icon;
                    return (
                        <Button 
                            key={item.name} 
                            variant={aspect === item.value ? 'secondary' : 'ghost'}
                            size="sm"
                            onClick={() => handleAspectChange(item.value)}
                        >
                            <Icon className="h-4 w-4 mr-2" />
                            {item.name}
                        </Button>
                    );
                })}
            </div>
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
