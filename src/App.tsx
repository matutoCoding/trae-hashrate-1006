import { BrowserRouter as Router, Routes, Route, Navigate } from "react-router-dom";
import Sidebar from "@/components/layout/Sidebar";
import StoneEntry from "@/pages/StoneEntry";
import CenterOfGravity from "@/pages/CenterOfGravity";
import StressAnalysis from "@/pages/StressAnalysis";
import Construction from "@/pages/Construction";
import ParadigmLibrary from "@/pages/ParadigmLibrary";

export default function App() {
  return (
    <Router>
      <div className="flex min-h-screen bg-ink-100 font-song">
        <Sidebar />
        <main className="flex-1 min-w-0">
          <Routes>
            <Route path="/" element={<Navigate to="/stones" replace />} />
            <Route path="/stones" element={<StoneEntry />} />
            <Route path="/center-of-gravity" element={<CenterOfGravity />} />
            <Route path="/stress-analysis" element={<StressAnalysis />} />
            <Route path="/construction" element={<Construction />} />
            <Route path="/paradigm" element={<ParadigmLibrary />} />
            <Route path="*" element={<Navigate to="/stones" replace />} />
          </Routes>
        </main>
      </div>
    </Router>
  );
}
