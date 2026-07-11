"use client";

import { useState } from "react";
import Button from "@/components/Button";
import { createClient } from "@/lib/supabase/client";

/**
 * Botón "Seguir" (toggle) — registro de interés en un ponente.
 * Escribe/borra en public.speaker_follows respetando la RLS del usuario.
 */
export default function FollowButton({
  speakerId,
  initialFollowing,
}: {
  speakerId: string;
  initialFollowing: boolean;
}) {
  const [following, setFollowing] = useState(initialFollowing);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function toggle() {
    setBusy(true);
    setError(null);
    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      setBusy(false);
      setError("Inicia sesión para seguir.");
      return;
    }

    if (following) {
      const { error } = await supabase
        .from("speaker_follows")
        .delete()
        .eq("speaker_id", speakerId)
        .eq("user_id", user.id);
      if (error) setError(error.message);
      else setFollowing(false);
    } else {
      const { error } = await supabase
        .from("speaker_follows")
        .insert({ speaker_id: speakerId, user_id: user.id });
      if (error) setError(error.message);
      else setFollowing(true);
    }
    setBusy(false);
  }

  return (
    <div className="flex flex-col items-end gap-1">
      <Button
        variant={following ? "solid" : "ghost"}
        onClick={toggle}
        disabled={busy}
        aria-label={following ? "Dejar de seguir" : "Seguir"}
      >
        {busy ? "…" : following ? "Siguiendo ✓" : "Seguir"}
      </Button>
      {error && <span className="text-[9px] text-red-300">{error}</span>}
    </div>
  );
}
