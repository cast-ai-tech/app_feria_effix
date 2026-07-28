/**
 * Cliente de la API de ventas de La Tiquetera — SOLO servidor.
 *
 * Es una API de solo consulta (no hay webhooks): expone ventas por día
 * (con datos de comprador) y totales agregados por show. La firma de cada
 * request es sha256(`${valor}-${TIQUETERA_API_SECRET}`), según su doc:
 * https://latiquetera.com/pages/docs/api_company_sales
 *
 * NUNCA importar este módulo desde un componente cliente: usa
 * TIQUETERA_API_KEY/TIQUETERA_API_SECRET, que no llevan NEXT_PUBLIC_.
 */
import { createHash } from "node:crypto";

const BASE_URL = "https://latiquetera.com/companies";

export type TiqueteraBuyer = {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  age: number | null;
  identification: string;
};

export type TiqueteraTicket = {
  id: string;
  price: number;
  other: number;
  channel: string;
  locationId: string;
  locationName: string;
  showId: string;
  showName: string;
  discount: string | null;
  discountReference: string | null;
  referer: string | null;
  buyer: TiqueteraBuyer | null;
  customFields: Record<string, string> | null;
};

export type TiqueteraSaleBlock = {
  locationName: string;
  locationId: string;
  price: number;
  other: number;
  quantity: number;
  printed: boolean;
};

/** Firma sha256(`${valor}-${secret}`) requerida en cada request. */
export function signTiquetera(value: string): string {
  const secret = process.env.TIQUETERA_API_SECRET ?? "";
  return createHash("sha256").update(`${value}-${secret}`).digest("hex");
}

function requireApiKey(): string {
  const apiKey = process.env.TIQUETERA_API_KEY;
  const apiSecret = process.env.TIQUETERA_API_SECRET;
  if (!apiKey || !apiSecret) {
    throw new Error(
      "La Tiquetera no configurada (TIQUETERA_API_KEY / TIQUETERA_API_SECRET).",
    );
  }
  return apiKey;
}

async function post<T>(
  path: string,
  body: Record<string, unknown>,
): Promise<T> {
  const res = await fetch(`${BASE_URL}${path}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const json = (await res.json()) as { success: boolean; message: string } & T;
  if (!res.ok || !json.success) {
    throw new Error(
      `La Tiquetera (${path}): ${json.message || res.statusText}`,
    );
  }
  return json;
}

/** Ventas de un día (YYYY-MM-DD). `buyer` viene null si el permiso no lo habilita. */
export async function fetchSalesPerDay(
  date: string,
): Promise<{ data: TiqueteraTicket[] }> {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    throw new Error(
      `Fecha inválida para La Tiquetera (esperado YYYY-MM-DD): "${date}"`,
    );
  }
  const apiKey = requireApiKey();
  return post("/api_sales_per_day", {
    apiKey,
    date,
    signature: signTiquetera(date),
  });
}

/** Totales agregados por localidad/precio de un show (sin datos de comprador). */
export async function fetchSalesPerShow(showId: string): Promise<{
  show: { id: string; name: string };
  data: TiqueteraSaleBlock[];
}> {
  if (!/^[a-zA-Z0-9_-]+$/.test(showId)) {
    throw new Error(`showId inválido para La Tiquetera: "${showId}"`);
  }
  const apiKey = requireApiKey();
  return post("/api_sales_per_show", {
    apiKey,
    showId,
    signature: signTiquetera(showId),
  });
}

/** Mapea la localidad de La Tiquetera al tipo de boleta interno de la app. */
export function mapLocationToTicketType(
  locationName: string,
): "general" | "vip" | "black" | "corporativa" {
  const t = locationName.toLowerCase();
  if (t.includes("black")) return "black";
  if (t.includes("vip") || t.includes("platino") || t.includes("box"))
    return "vip";
  if (t.includes("corporativ") || t.includes("empresa") || t.includes("equipo"))
    return "corporativa";
  return "general";
}
