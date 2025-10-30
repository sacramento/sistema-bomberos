
'use client';

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { useToast } from '@/hooks/use-toast';
import { useEffect, useRef, useState } from 'react';
import jsQR from 'jsqr';

export default function QrScannerDialog({
  children,
  onScan,
}: {
  children: React.ReactNode;
  onScan: (data: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const [hasCameraPermission, setHasCameraPermission] = useState(true);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const { toast } = useToast();

  useEffect(() => {
    if (open) {
      const getCameraPermission = async () => {
        try {
          const mediaStream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } });
          setStream(mediaStream);
          setHasCameraPermission(true);
          if (videoRef.current) {
            videoRef.current.srcObject = mediaStream;
          }
        } catch (error) {
          console.error('Error accessing camera:', error);
          setHasCameraPermission(false);
          toast({
            variant: 'destructive',
            title: 'Acceso a la Cámara Denegado',
            description: 'Por favor, habilite el permiso de cámara en su navegador.',
          });
        }
      };
      getCameraPermission();
    } else {
      // Cleanup when dialog closes
      if (stream) {
        stream.getTracks().forEach(track => track.stop());
        setStream(null);
      }
    }

    return () => {
      if (stream) {
        stream.getTracks().forEach(track => track.stop());
      }
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  useEffect(() => {
    let animationFrameId: number;

    const scan = () => {
      if (videoRef.current && videoRef.current.readyState === videoRef.current.HAVE_ENOUGH_DATA && canvasRef.current) {
        const video = videoRef.current;
        const canvas = canvasRef.current;
        const context = canvas.getContext('2d');

        if (context) {
          canvas.height = video.videoHeight;
          canvas.width = video.videoWidth;
          context.drawImage(video, 0, 0, canvas.width, canvas.height);
          const imageData = context.getImageData(0, 0, canvas.width, canvas.height);
          const code = jsQR(imageData.data, imageData.width, imageData.height, {
            inversionAttempts: 'dontInvert',
          });

          if (code) {
            onScan(code.data);
            setOpen(false); // Close dialog on successful scan
          }
        }
      }
      animationFrameId = requestAnimationFrame(scan);
    };

    if (open && hasCameraPermission) {
      animationFrameId = requestAnimationFrame(scan);
    }

    return () => {
      cancelAnimationFrame(animationFrameId);
    };
  }, [open, hasCameraPermission, onScan]);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{children}</DialogTrigger>
      <DialogContent className="sm:max-w-md p-0">
        <DialogHeader className="p-6 pb-0">
          <DialogTitle className="font-headline">Escanear Código QR</DialogTitle>
          <DialogDescription>Apunte la cámara al código QR del ítem.</DialogDescription>
        </DialogHeader>
        <div className="p-0 rounded-lg bg-black overflow-hidden">
          <video ref={videoRef} className="w-full h-full object-cover" autoPlay muted playsInline />
          {!hasCameraPermission && (
            <div className="absolute inset-0 flex items-center justify-center bg-black/80">
              <Alert variant="destructive" className="m-4">
                <AlertTitle>Cámara No Disponible</AlertTitle>
                <AlertDescription>
                  Habilite los permisos de cámara para escanear.
                </AlertDescription>
              </Alert>
            </div>
          )}
          <canvas ref={canvasRef} style={{ display: 'none' }} />
        </div>
        <DialogFooter className="p-6 pt-4">
            <Button variant="outline" onClick={() => setOpen(false)} className="w-full">Cancelar</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
