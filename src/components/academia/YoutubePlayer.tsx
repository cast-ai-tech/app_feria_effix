"use client";

import { useState } from "react";
import Image from "next/image";
import { Play } from "lucide-react";
import { youtubeEmbedUrl, youtubeThumbnail } from "@/lib/youtube";

/**
 * Reproductor de YouTube EMBEBIDO (Academia). Patrón "lite embed":
 * primero solo la miniatura (rápida, sin JS de YouTube); al tocar Play se
 * monta el iframe con autoplay y se dispara onPlay (registro de progreso).
 * El contenido se ve DENTRO de la app — nada de saltar a YouTube.
 */
export default function YoutubePlayer({
  videoId,
  title,
  onPlay,
}: {
  videoId: string;
  title: string;
  onPlay?: () => void;
}) {
  const [playing, setPlaying] = useState(false);

  if (playing) {
    return (
      <div className="relative aspect-video w-full overflow-hidden rounded-[14px] border border-white/10 bg-black">
        <iframe
          src={youtubeEmbedUrl(videoId)}
          title={title}
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
          allowFullScreen
          className="absolute inset-0 h-full w-full"
        />
      </div>
    );
  }

  return (
    <button
      type="button"
      onClick={() => {
        setPlaying(true);
        onPlay?.();
      }}
      aria-label={`Reproducir: ${title}`}
      className="group relative block aspect-video w-full overflow-hidden rounded-[14px] border border-white/10 bg-black transition-transform duration-150 active:scale-[0.98]"
    >
      <Image
        src={youtubeThumbnail(videoId)}
        alt={title}
        fill
        sizes="(max-width: 768px) 100vw, 50vw"
        className="object-cover opacity-80 transition-opacity duration-200 group-hover:opacity-100"
      />
      <span className="absolute inset-0 flex items-center justify-center">
        <span className="flex h-14 w-14 items-center justify-center rounded-full border border-white/40 bg-black/60 backdrop-blur-sm transition-transform duration-150 group-hover:scale-105">
          <Play className="ml-0.5 h-6 w-6 text-brand-white" aria-hidden />
        </span>
      </span>
    </button>
  );
}
