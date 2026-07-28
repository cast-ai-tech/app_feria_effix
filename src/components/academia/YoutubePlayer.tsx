"use client";

import Image from "next/image";
import { Play } from "lucide-react";
import { youtubeThumbnail } from "@/lib/youtube";

/**
 * Poster + botón play de un video de Academia. Al tocar, NO monta un iframe
 * aquí — abre el mini-player global (Fase 27, MiniPlayerProvider), que es
 * la única instancia de reproductor de toda la app.
 */
export default function YoutubePlayer({
  videoId,
  title,
  onOpen,
}: {
  videoId: string;
  title: string;
  onOpen: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onOpen}
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
