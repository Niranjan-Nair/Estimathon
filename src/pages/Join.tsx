import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../hooks/useAuth";
import { supabase } from "../lib/supabase";

export default function Join() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [code, setCode] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [joining, setJoining] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!user) return;
    setError(null);

    const cleanCode = code.trim().toUpperCase();
    const cleanName = displayName.trim();
    if (!cleanCode || !cleanName) {
      setError("Enter a join code and a name.");
      return;
    }

    setJoining(true);
    try {
      const { data: estimathon, error: estErr } = await supabase
        .from("estimathons")
        .select("*")
        .eq("join_code", cleanCode)
        .maybeSingle();

      if (estErr) throw estErr;
      if (!estimathon) {
        setError("No estimathon found with that code.");
        return;
      }

      // TEMPORARY DEBUG: confirm what auth.uid() resolves to for this exact
      // request, straight from Postgres, vs. what the client thinks it is.
      const whoami = await supabase.rpc("debug_whoami");
      // eslint-disable-next-line no-console
      console.log("[debug] client user.id:", user.id, "| server auth.uid():", whoami.data, whoami.error);

      // Avoid upsert()/ON CONFLICT here -- it interacts with RLS in ways
      // that are hard to reason about. Explicit select-then-insert-or-update
      // keeps each request under one simple, single-purpose policy check.
      const { data: existing, error: existingErr } = await supabase
        .from("participants")
        .select("id")
        .eq("estimathon_id", estimathon.id)
        .eq("user_id", user.id)
        .maybeSingle();

      if (existingErr) throw existingErr;

      const { error: joinErr } = existing
        ? await supabase
            .from("participants")
            .update({ display_name: cleanName })
            .eq("id", existing.id)
        : await supabase
            .from("participants")
            .insert({ estimathon_id: estimathon.id, user_id: user.id, display_name: cleanName });

      if (joinErr) {
        // eslint-disable-next-line no-console
        console.log("[debug] join error:", JSON.stringify(joinErr), "existing row:", existing);
        if (joinErr.code === "23505") {
          setError("That name is already taken in this estimathon. Try another.");
          return;
        }
        throw joinErr;
      }

      navigate(`/play/${estimathon.id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong.");
    } finally {
      setJoining(false);
    }
  }

  return (
    <div className="mx-auto max-w-sm">
      <h1 className="font-heading mb-6 text-3xl text-white">Join an Estimathon</h1>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="mb-1 block text-sm text-white/70">Join code</label>
          <input
            className="input-field w-full text-center font-heading text-xl uppercase tracking-widest"
            value={code}
            onChange={(e) => setCode(e.target.value)}
            maxLength={8}
            placeholder="ABC123"
          />
        </div>
        <div>
          <label className="mb-1 block text-sm text-white/70">Display name</label>
          <input
            className="input-field w-full"
            value={displayName}
            onChange={(e) => setDisplayName(e.target.value)}
            placeholder="Your name or team name"
          />
        </div>
        {error && <p className="text-sm text-accent-hover">{error}</p>}
        <button type="submit" className="btn-primary w-full" disabled={joining}>
          {joining ? "Joining..." : "Join"}
        </button>
      </form>
    </div>
  );
}
