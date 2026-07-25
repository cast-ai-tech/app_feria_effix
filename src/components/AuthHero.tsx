/**
 * Cabecera de marca para pantallas de autenticación: el logo cromado
 * apilado OFICIAL (asset del sitio — nunca recreado con tipografía).
 * Solo decorativo: el título real lo pone PageHeader.
 */
export default function AuthHero() {
  return (
    <div className="mb-4 flex justify-center">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src="/brand/logo-cromado.png"
        alt=""
        aria-hidden
        className="h-28 w-auto drop-shadow-[0_0_24px_rgba(114,110,141,0.35)]"
      />
    </div>
  );
}
