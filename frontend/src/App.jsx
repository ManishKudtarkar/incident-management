import React from "react";
import { BrowserRouter as Router, Routes, Route, Link, useLocation } from "react-router-dom";
import Dashboard from "./pages/Dashboard";
import IncidentDetail from "./pages/IncidentDetail";
import ScanPage from "./pages/ScanPage";

function Navbar() {
  const location = useLocation();
  const active = "text-white font-semibold border-b-2 border-blue-400 pb-0.5";
  const inactive = "text-gray-300 hover:text-white transition-colors";

  return (
    <header className="bg-gray-900 text-white shadow-lg">
      <div className="max-w-6xl mx-auto px-4 py-3 flex items-center justify-between">
        <Link to="/" className="flex items-center gap-2 font-bold text-base tracking-tight flex-shrink-0">
          <span className="relative flex h-3 w-3">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-3 w-3 bg-red-500"></span>
          </span>
          <span>IMS</span>
          <span className="text-gray-400 font-normal text-sm">— Incident Management</span>
        </Link>

        <nav className="flex items-center gap-6 text-sm ml-6">
          <Link to="/" className={location.pathname === "/" ? active : inactive}>
            Dashboard
          </Link>
          <Link to="/scan" className={location.pathname === "/scan" ? active : inactive}>
            🔍 Scanner
          </Link>
          <a
            href="http://localhost:8000/docs"
            target="_blank"
            rel="noreferrer"
            className={inactive}
          >
            API Docs ↗
          </a>
        </nav>
      </div>
    </header>
  );
}

export default function App() {
  return (
    <Router>
      <div className="min-h-screen bg-gray-50 flex flex-col">
        <Navbar />
        <main className="flex-1">
          <Routes>
            <Route path="/" element={<Dashboard />} />
            <Route path="/incident/:id" element={<IncidentDetail />} />
            <Route path="/scan" element={<ScanPage />} />
          </Routes>
        </main>
        <footer className="text-center text-xs text-gray-400 py-4 border-t border-gray-200">
          Mission-Critical IMS · Built with FastAPI + React
        </footer>
      </div>
    </Router>
  );
}
