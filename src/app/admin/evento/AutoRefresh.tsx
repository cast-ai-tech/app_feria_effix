"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

/** Refresca el dashboard cada 30s durante el día del evento. */
export default function AutoRefresh() {
  const router = useRouter();
  useEffect(() => {
    const id = setInterval(() => router.refresh(), 30_000);
    return () => clearInterval(id);
  }, [router]);
  return null;
}
