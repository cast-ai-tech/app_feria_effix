/**
 * Roles por defecto (respaldo del formulario si la tabla public.roles
 * aún no responde). La lista es ABIERTA: se amplía en la BD o con "Otro".
 */
export const DEFAULT_ROLES = [
  { value: "trafficker", label: "Trafficker" },
  { value: "agencia", label: "Agencia" },
  { value: "marca", label: "Marca / Ecommerce" },
  { value: "mentor", label: "Mentor / Ponente" },
  { value: "asistente", label: "Asistente general" },
] as const;

export const OTHER_ROLE_VALUE = "__otro__";
