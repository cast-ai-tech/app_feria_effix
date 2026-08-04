/**
 * Layout PURO de la vista Horario de la Agenda (Fase 30) — testeable.
 * Dado un conjunto de charlas con inicio/fin, calcula:
 *  - el rango horario del día (redondeado a horas completas), y
 *  - el carril de cada charla cuando se solapan en el tiempo (dos charlas
 *    simultáneas se muestran lado a lado, cada una en su columna).
 */

export type ScheduleItem = {
  id: string;
  startMs: number;
  endMs: number;
};

export type LanePlacement = {
  /** Columna (0-based) dentro de su grupo de solape. */
  lane: number;
  /** Total de columnas del grupo — define el ancho (100% / laneCount). */
  laneCount: number;
};

const HOUR_MS = 3_600_000;

/** Rango [inicio, fin] del día redondeado a horas completas (UTC ms). */
export function timeBounds(items: ScheduleItem[]): {
  startMs: number;
  endMs: number;
} {
  if (items.length === 0) return { startMs: 0, endMs: 0 };
  const min = Math.min(...items.map((i) => i.startMs));
  const max = Math.max(...items.map((i) => i.endMs));
  return {
    startMs: Math.floor(min / HOUR_MS) * HOUR_MS,
    endMs: Math.ceil(max / HOUR_MS) * HOUR_MS,
  };
}

/**
 * Asigna carriles con greedy por grupos de solape: dentro de cada grupo
 * (charlas encadenadas en el tiempo), cada charla toma el primer carril
 * libre y todas comparten el mismo laneCount (el máximo del grupo) para
 * que sus anchos coincidan visualmente.
 */
export function layoutDay(items: ScheduleItem[]): Map<string, LanePlacement> {
  const out = new Map<string, LanePlacement>();
  const sorted = [...items].sort(
    (a, b) => a.startMs - b.startMs || a.endMs - b.endMs,
  );

  // Grupo activo: charlas cuyo intervalo aún puede solaparse con la próxima.
  let group: { item: ScheduleItem; lane: number }[] = [];
  let laneEnds: number[] = []; // fin del último evento por carril
  let groupMaxEnd = 0;

  const closeGroup = () => {
    const laneCount = laneEnds.length || 1;
    for (const g of group) {
      out.set(g.item.id, { lane: g.lane, laneCount });
    }
    group = [];
    laneEnds = [];
    groupMaxEnd = 0;
  };

  for (const item of sorted) {
    if (group.length > 0 && item.startMs >= groupMaxEnd) closeGroup();

    // Primer carril cuyo último evento ya terminó.
    let lane = laneEnds.findIndex((end) => end <= item.startMs);
    if (lane === -1) {
      lane = laneEnds.length;
      laneEnds.push(item.endMs);
    } else {
      laneEnds[lane] = item.endMs;
    }
    group.push({ item, lane });
    groupMaxEnd = Math.max(groupMaxEnd, item.endMs);
  }
  closeGroup();

  return out;
}
