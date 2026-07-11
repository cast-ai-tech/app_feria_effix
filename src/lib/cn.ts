/**
 * Une clases condicionalmente (utilidad ligera, sin dependencias).
 * Ej: cn("base", active && "activo", className)
 */
export function cn(
  ...parts: Array<string | false | null | undefined>
): string {
  return parts.filter(Boolean).join(" ");
}
