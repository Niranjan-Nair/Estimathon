import { Route, Routes } from "react-router-dom";
import Navbar from "./components/Navbar";
import Home from "./pages/Home";
import CreateEstimathon from "./pages/CreateEstimathon";
import Join from "./pages/Join";
import Host from "./pages/Host";
import Play from "./pages/Play";
import { isSupabaseConfigured } from "./lib/supabase";

function ConfigError() {
  return (
    <div className="mx-auto max-w-md text-center">
      <h1 className="font-heading mb-3 text-2xl text-accent">Supabase isn&apos;t configured</h1>
      <p className="text-white/70">
        Set <code className="text-white">VITE_SUPABASE_URL</code> and{" "}
        <code className="text-white">VITE_SUPABASE_PUBLISHABLE_KEY</code> — as GitHub Actions
        repo secrets for a deployed build, or in <code className="text-white">.env.local</code>{" "}
        for local dev — then rebuild.
      </p>
    </div>
  );
}

export default function App() {
  return (
    <div className="min-h-screen bg-base font-body text-white">
      <Navbar />
      <main className="px-4 py-8">
        {isSupabaseConfigured ? (
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/create" element={<CreateEstimathon />} />
            <Route path="/join" element={<Join />} />
            <Route path="/host/:id" element={<Host />} />
            <Route path="/play/:id" element={<Play />} />
          </Routes>
        ) : (
          <ConfigError />
        )}
      </main>
    </div>
  );
}
