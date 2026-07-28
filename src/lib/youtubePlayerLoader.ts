/**
 * Loader singleton de la YouTube IFrame Player API — SOLO cliente.
 *
 * La API exige un callback GLOBAL (`window.onYouTubeIframeAPIReady`) que solo
 * puede tener un dueño; este módulo inyecta el <script> una única vez y
 * comparte la misma promesa entre todos los que llamen `loadYoutubeIframeApi()`
 * (varias aperturas del mini-player antes de que cargue el script no deben
 * inyectar el script más de una vez).
 */

let apiPromise: Promise<typeof YT> | null = null;

export function loadYoutubeIframeApi(): Promise<typeof YT> {
  if (typeof window === "undefined") {
    return Promise.reject(
      new Error("loadYoutubeIframeApi solo corre en el cliente"),
    );
  }
  if (window.YT?.Player) {
    return Promise.resolve(window.YT);
  }
  if (apiPromise) {
    return apiPromise;
  }

  apiPromise = new Promise((resolve) => {
    const previousReady = window.onYouTubeIframeAPIReady;
    window.onYouTubeIframeAPIReady = () => {
      previousReady?.();
      resolve(window.YT as typeof YT);
    };

    if (!document.getElementById("yt-iframe-api")) {
      const script = document.createElement("script");
      script.id = "yt-iframe-api";
      script.src = "https://www.youtube.com/iframe_api";
      document.head.appendChild(script);
    }
  });

  return apiPromise;
}
