/**
 * Fondo de marca de la app: doble degradado radial lavanda sobre negro
 * + textura de ruido sutil (noise). Se renderiza una sola vez en el layout,
 * fijo detrás de todo el contenido.
 */
export default function AppBackground() {
  return (
    <div aria-hidden className="-z-10">
      <div className="app-bg" />
      <div className="app-noise" />
    </div>
  );
}
