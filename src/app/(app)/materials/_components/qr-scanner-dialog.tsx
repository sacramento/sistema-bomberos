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

export default function QrScannerDialog({
  children,
  onScan,
}: {
  children: React.ReactNode;
  onScan: (data: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const [hasCameraPermission, setHasCameraPermission] = useState(true);
  const { toast } = useToast();
  const scannerRef = useRef<any>(null);
  const elementId = "barcode-reader-materials";

  useEffect(() => {
    let html5QrCode: any = null;

    if (open) {
      const startScanner = async () => {
        try {
          const { Html5Qrcode } = await import('html5-qrcode');
          html5QrCode = new Html5Qrcode(elementId);
          scannerRef.current = html5QrCode;
          
          await html5QrCode.start(
            { facingMode: "environment" },
            {
              fps: 10,
              qrbox: { width: 250, height: 250 },
            },
            (decodedText: string) => {
              onScan(decodedText);
              setOpen(false);
            },
            () => {} 
          );
          setHasCameraPermission(true);
        } catch (err) {
          console.error("Scanner start error:", err);
          setHasCameraPermission(false);
          toast({
            variant: 'destructive',
            title: 'Error de Cámara',
            description: 'No se pudo acceder a la cámara. Verifique los permisos.',
          });
        }
      };

      startScanner();
    }

    return () => {
      if (html5QrCode && html5QrCode.isScanning) {
        html5QrCode.stop().then(() => {
            html5QrCode.clear();
        }).catch((err: any) => console.error("Cleanup error", err));
      }
    };
  }, [open, onScan, toast]);

  return (
    <Dialog open={open} onOpenChange={(isOpen) => {
        if (!isOpen && scannerRef.current && scannerRef.current.isScanning) {
            scannerRef.current.stop().catch((e: any) => console.error(e));
        }
        setOpen(isOpen);
    }}>
      <DialogTrigger asChild>{children}</DialogTrigger>
      <DialogContent className="sm:max-w-md p-0 overflow-hidden">
        <DialogHeader className="p-6 pb-0">
          <DialogTitle className="font-headline">Escanear Código</DialogTitle>
          <DialogDescription>Apunte la cámara al código QR o de barras del material.</DialogDescription>
        </DialogHeader>
        <div className="p-0 bg-black min-h-[300px] flex items-center justify-center relative">
          <div id={elementId} className="w-full h-full" />
          {!hasCameraPermission && (
            <div className="absolute inset-0 flex items-center justify-center bg-black/80 z-10">
              <Alert variant="destructive" className="m-4">
                <AlertTitle>Cámara No Disponible</AlertTitle>
                <AlertDescription>
                  Habilite los permisos de cámara para escanear.
                </AlertDescription>
              </Alert>
            </div>
          )}
        </div>
        <DialogFooter className="p-6 pt-4">
            <Button variant="outline" onClick={() => setOpen(false)} className="w-full">Cancelar</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
