import { Route, Routes } from "react-router-dom";
import Navbar from "./components/Navbar";
import Home from "./pages/Home";
import CreateEstimathon from "./pages/CreateEstimathon";
import Join from "./pages/Join";
import Host from "./pages/Host";
import Play from "./pages/Play";

export default function App() {
  return (
    <div className="min-h-screen bg-base font-body text-white">
      <Navbar />
      <main className="px-4 py-8">
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/create" element={<CreateEstimathon />} />
          <Route path="/join" element={<Join />} />
          <Route path="/host/:id" element={<Host />} />
          <Route path="/play/:id" element={<Play />} />
        </Routes>
      </main>
    </div>
  );
}
