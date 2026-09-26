import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../hooks/useAuth";
import { supabase } from "../lib/supabase";
import type { Estimathon } from "../lib/types";

export default function Home() {
  const { user, loading } = useAuth();
  const [hosted, setHosted] = useState<Estimathon[]>([]);

  useEffect(() => {
    if (!user) return;
    void supabase
      .from("estimathons")
      .select("*")
      .eq("host_id", user.id)
      .order("created_at", { ascending: false })
      .then(({ data }) => setHosted((data ?? []) as Estimathon[]));
  }, [user]);

  if (loading) return null;

  return (
    <div className="mx-auto max-w-2xl">
      <h1 className="font-heading mb-2 text-4xl text-white">
        ESTIM<span className="text-accent">ATHON</span>
      </h1>
      <p className="mb-8 text-white/60">
        Host and play live estimation competitions. Guess a range, not a number &mdash; tighter,
        correct ranges score better.
      </p>

      <div className="mb-8 grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Link to="/create" className="card p-6 transition hover:border-accent">
          <h2 className="font-heading mb-1 text-lg text-white">Host an Estimathon</h2>
          <p className="text-sm text-white/60">Create questions and get a join code.</p>
        </Link>
        <Link to="/join" className="card p-6 transition hover:border-accent">
          <h2 className="font-heading mb-1 text-lg text-white">Join an Estimathon</h2>
          <p className="text-sm text-white/60">Enter a join code and a name to start playing.</p>
        </Link>
      </div>

      {hosted.length > 0 && (
        <div>
          <h2 className="font-heading mb-3 text-lg text-white/80">Your estimathons</h2>
          <ul className="space-y-2">
            {hosted.map((e) => (
              <li key={e.id}>
                <Link
                  to={`/host/${e.id}`}
                  className="card flex items-center justify-between p-4 transition hover:border-accent"
                >
                  <span className="text-white">{e.name}</span>
                  <span className="font-heading text-sm text-white/50">{e.join_code}</span>
                </Link>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
