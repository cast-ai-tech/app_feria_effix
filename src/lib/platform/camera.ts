/**
 * Adaptador de cámara / escaneo de QR — capa de plataforma.
 *
 * Web: BarcodeDetector API nativa cuando existe (Chrome/Android), con
 * fallback a la librería `qr-scanner` (import dinámico, no infla el bundle
 * inicial). Fase 22: se sustituye por @capacitor-mlkit/barcode-scanning.
 *
 * Definido en Fase 13; la UI lo consume desde las Fases 14-15
 * (Credencial Effix y Pasaporte de stands).
 */

export type ScanOptions = {
  /** Aborta el escaneo (p. ej. al cerrar el modal). */
  signal?: AbortSignal;
};

type BarcodeDetectorLike = {
  detect(source: HTMLVideoElement): Promise<Array<{ rawValue: string }>>;
};

type BarcodeDetectorCtor = new (opts: {
  formats: string[];
}) => BarcodeDetectorLike;

function nativeDetectorCtor(): BarcodeDetectorCtor | null {
  if (typeof window === "undefined") return null;
  const ctor = (window as unknown as { BarcodeDetector?: BarcodeDetectorCtor })
    .BarcodeDetector;
  return ctor ?? null;
}

/**
 * Abre la cámara trasera sobre el <video> dado y resuelve con el TEXTO del
 * primer QR detectado. Detiene la cámara al terminar (éxito, error o abort).
 * Rechaza con Error si no hay cámara/permiso o si se aborta.
 */
export async function scanQR(
  video: HTMLVideoElement,
  { signal }: ScanOptions = {},
): Promise<string> {
  if (typeof navigator === "undefined" || !navigator.mediaDevices?.getUserMedia) {
    throw new Error("Este dispositivo no soporta acceso a la cámara.");
  }

  const Native = nativeDetectorCtor();
  if (Native) return scanWithNativeDetector(Native, video, signal);
  return scanWithQrScannerLib(video, signal);
}

async function scanWithNativeDetector(
  Native: BarcodeDetectorCtor,
  video: HTMLVideoElement,
  signal?: AbortSignal,
): Promise<string> {
  const detector = new Native({ formats: ["qr_code"] });
  const stream = await navigator.mediaDevices.getUserMedia({
    video: { facingMode: "environment" },
  });
  video.srcObject = stream;
  video.setAttribute("playsinline", "true"); // iOS: sin pantalla completa
  await video.play();

  const stop = () => {
    stream.getTracks().forEach((t) => t.stop());
    video.srcObject = null;
  };

  try {
    return await new Promise<string>((resolve, reject) => {
      const interval = window.setInterval(async () => {
        if (signal?.aborted) {
          window.clearInterval(interval);
          reject(new Error("Escaneo cancelado."));
          return;
        }
        try {
          const codes = await detector.detect(video);
          const value = codes[0]?.rawValue;
          if (value) {
            window.clearInterval(interval);
            resolve(value);
          }
        } catch {
          // Frame aún no listo: se reintenta en el próximo tick.
        }
      }, 150);
    });
  } finally {
    stop();
  }
}

async function scanWithQrScannerLib(
  video: HTMLVideoElement,
  signal?: AbortSignal,
): Promise<string> {
  const { default: QrScanner } = await import("qr-scanner");

  return new Promise<string>((resolve, reject) => {
    const scanner = new QrScanner(
      video,
      (result) => {
        cleanup();
        resolve(result.data);
      },
      {
        preferredCamera: "environment",
        highlightScanRegion: false,
        highlightCodeOutline: false,
      },
    );

    const cleanup = () => {
      scanner.stop();
      scanner.destroy();
    };

    signal?.addEventListener("abort", () => {
      cleanup();
      reject(new Error("Escaneo cancelado."));
    });

    scanner.start().catch((err) => {
      cleanup();
      reject(
        err instanceof Error
          ? err
          : new Error("No se pudo iniciar la cámara."),
      );
    });
  });
}
