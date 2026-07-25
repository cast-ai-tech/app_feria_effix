"use client";

import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import { createClient } from "@/lib/supabase/client";
import { cn } from "@/lib/cn";
import {
  filterLiveBanners,
  shouldRecordImpression,
  type BannerRow,
} from "@/lib/banners";
import { parseYoutubeId, youtubeBackgroundEmbedUrl } from "@/lib/youtube";

/** ¿La URL es un video para servir NATIVO (mp4/webm del bucket)? */
function isNativeVideo(url: string): boolean {
  return /\.(mp4|webm)(\?|$)/i.test(url);
}

/**
 * Slot de banner de patrocinio (Fase 24).
 * - Trae los banners ACTIVOS de la edición vigente para su placement.
 * - Impresión: 1 por banner por sesión de la app (Set en memoria).
 * - Clic: abre link_url en pestaña nueva y registra el evento.
 * - Sin banners activos → el slot COLAPSA (renderiza null, cero cajas vacías).
 */

/** Registro de impresiones de ESTA sesión de la app (módulo compartido). */
const seenThisSession = new Set<string>();

/** Registra el clic del banner (best-effort, no bloquea la navegación). */
function recordClick(banner: BannerRow) {
  const supabase = createClient();
  void supabase.auth.getUser().then(({ data: { user } }) =>
    supabase.from("banner_events").insert({
      banner_id: banner.id,
      event_type: "click",
      user_id: user?.id ?? null,
    }),
  );
}

function BannerLink({
  banner,
  children,
  linkClass,
}: {
  banner: BannerRow;
  children: React.ReactNode;
  linkClass?: string;
}) {
  if (!banner.link_url) return <div className={linkClass}>{children}</div>;
  return (
    <a
      href={banner.link_url}
      target="_blank"
      rel="noopener noreferrer sponsored"
      onClick={() => recordClick(banner)}
      className={linkClass}
    >
      {children}
    </a>
  );
}

type Props = {
  placement: "home_hero" | "home_inline" | "module_top" | "footer_strip";
  /** Solo para module_top: agenda | stands | ponentes | academia | alianzas. */
  moduleKey?: string;
  /** Edición vigente (la pasa el server — nunca hardcodeada). */
  edition: number;
  className?: string;
};

export default function BannerSlot({
  placement,
  moduleKey,
  edition,
  className,
}: Props) {
  const [banners, setBanners] = useState<BannerRow[]>([]);
  const [slide, setSlide] = useState(0);
  const timerRef = useRef<number | null>(null);

  // Fetch + registro de impresiones.
  useEffect(() => {
    let cancelled = false;
    void (async () => {
      const supabase = createClient();
      let query = supabase
        .from("banners")
        .select(
          "id,placement,module_key,title,image_url,link_url,sort_order,starts_at,ends_at,active",
        )
        .eq("edition", edition)
        .eq("placement", placement)
        .eq("active", true)
        .order("sort_order");
      if (placement === "module_top" && moduleKey) {
        query = query.eq("module_key", moduleKey);
      }
      const { data } = await query;
      if (cancelled) return;

      const live = filterLiveBanners((data ?? []) as BannerRow[], Date.now());
      setBanners(live);

      // Impresiones (1 por sesión por banner), best-effort.
      const fresh = live.filter((b) =>
        shouldRecordImpression(seenThisSession, b.id),
      );
      if (fresh.length > 0) {
        const {
          data: { user },
        } = await supabase.auth.getUser();
        void supabase.from("banner_events").insert(
          fresh.map((b) => ({
            banner_id: b.id,
            event_type: "impression",
            user_id: user?.id ?? null,
          })),
        );
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [placement, moduleKey, edition]);

  // Auto-scroll del carrusel (home_hero con 2+ banners):
  // - IMAGEN activa → avanza a los 4 segundos.
  // - VIDEO nativo activo → avanza cuando el video TERMINA (onEnded).
  // - Respaldo YouTube → corre en loop; se cambia con los dots.
  // (Toda la decisión vive DENTRO del effect: deps estables siempre.)
  useEffect(() => {
    if (placement !== "home_hero" || banners.length < 2) return;
    const activeUrl = banners[slide]?.image_url ?? "";
    const activeIsVideo =
      isNativeVideo(activeUrl) || !!parseYoutubeId(activeUrl);
    if (activeIsVideo) return; // el <video> avanza solo con onEnded

    timerRef.current = window.setTimeout(
      () => setSlide((s) => (s + 1) % banners.length),
      4000,
    );
    return () => {
      if (timerRef.current) window.clearTimeout(timerRef.current);
    };
  }, [placement, banners, slide]);

  // Slot colapsado: nada de cajas vacías.
  if (banners.length === 0) return null;

  if (placement === "home_hero") {
    return (
      <div className={cn("relative", className)}>
        <div className="relative aspect-[16/7] w-full overflow-hidden rounded-[18px] border border-white/10 lg:aspect-[21/6]">
          {banners.map((b, i) => {
            const nativeVideo = isNativeVideo(b.image_url);
            const videoId = nativeVideo ? null : parseYoutubeId(b.image_url);
            return (
              <div
                key={b.id}
                className={cn(
                  "absolute inset-0 transition-opacity duration-500",
                  i === slide ? "opacity-100" : "pointer-events-none opacity-0",
                )}
              >
                <BannerLink banner={b} linkClass="relative block h-full w-full">
                  {nativeVideo ? (
                    /* VIDEO NATIVO (preferido): incrustado, sin controles.
                       Solo se monta el del slide visible (reinicia al volver);
                       al TERMINAR avanza el carrusel — con un único banner,
                       simplemente hace loop. */
                    i === slide && (
                      <video
                        src={b.image_url}
                        autoPlay
                        muted
                        loop={banners.length < 2}
                        playsInline
                        preload="auto"
                        disablePictureInPicture
                        onEnded={() =>
                          setSlide((s) => (s + 1) % banners.length)
                        }
                        aria-label={b.title}
                        className="pointer-events-none absolute inset-0 h-full w-full object-cover"
                      />
                    )
                  ) : videoId ? (
                    /* Respaldo YouTube (si el admin pega un link directo):
                       embed silenciado en loop con la UI bloqueada. */
                    i === slide && (
                      <iframe
                        src={youtubeBackgroundEmbedUrl(videoId)}
                        title={b.title}
                        allow="autoplay; encrypted-media"
                        tabIndex={-1}
                        aria-hidden
                        className="pointer-events-none absolute left-1/2 top-1/2 aspect-video h-[130%] -translate-x-1/2 -translate-y-1/2"
                      />
                    )
                  ) : (
                    <Image
                      src={b.image_url}
                      alt={b.title}
                      fill
                      sizes="100vw"
                      className="object-cover"
                      priority={i === 0}
                    />
                  )}
                </BannerLink>
              </div>
            );
          })}
        </div>
        {banners.length > 1 && (
          <div className="absolute bottom-2 left-1/2 flex -translate-x-1/2 gap-1.5">
            {banners.map((b, i) => (
              <button
                key={b.id}
                onClick={() => setSlide(i)}
                aria-label={`Banner ${i + 1}: ${b.title}`}
                className={cn(
                  "h-2 w-2 rounded-full transition-colors duration-150",
                  i === slide ? "bg-brand-white" : "bg-white/35",
                )}
              />
            ))}
          </div>
        )}
      </div>
    );
  }

  if (placement === "footer_strip") {
    return (
      <div className={cn("flex flex-col gap-2", className)}>
        <p className="text-caption text-center text-brand-dim">Patrocinan</p>
        <div className="grid grid-cols-3 items-center gap-3 md:grid-cols-4">
          {banners.map((b) => (
            <BannerLink
              key={b.id}
              banner={b}
              linkClass="relative flex h-14 items-center justify-center overflow-hidden rounded-[12px] border border-white/10 bg-white/[0.04] p-2 transition-colors duration-150 hover:border-white/25 active:scale-[0.97]"
            >
              <Image
                src={b.image_url}
                alt={b.title}
                fill
                sizes="(max-width: 768px) 33vw, 200px"
                className="object-contain p-2"
              />
            </BannerLink>
          ))}
        </div>
      </div>
    );
  }

  // home_inline y module_top: un solo banner horizontal.
  // Video nativo → 3:1 (más aire); imagen → 4:1.
  const b = banners[0];
  const singleVideo = isNativeVideo(b.image_url);
  return (
    <BannerLink
      banner={b}
      linkClass={cn(
        "relative block w-full overflow-hidden rounded-[18px] border border-white/10 transition-colors duration-150 hover:border-white/25 active:scale-[0.98]",
        singleVideo ? "aspect-[3/1]" : "aspect-[4/1]",
        className,
      )}
    >
      {singleVideo ? (
        <video
          src={b.image_url}
          autoPlay
          muted
          loop
          playsInline
          preload="auto"
          disablePictureInPicture
          aria-label={b.title}
          className="pointer-events-none absolute inset-0 h-full w-full object-cover"
        />
      ) : (
        <Image
          src={b.image_url}
          alt={b.title}
          fill
          sizes="100vw"
          className="object-cover"
        />
      )}
    </BannerLink>
  );
}
