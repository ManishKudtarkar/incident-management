import React from "react";
import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import Dashboard from "./pages/Dashboard";
import IncidentDetail from "./pages/IncidentDetail";
import ScanPage from "./pages/ScanPage";
import Header from "./components/Header";

export default function App() {
  return (
    <Router>
      <div className="min-h-screen bg-slate-50 font-sans">
        <Header />
        <main>
          <Routes>
            <Route path="/" element={<Dashboard />} />
            <Route path="/incident/:id" element={<IncidentDetail />} />
            <Route path="/scan" element={<ScanPage />} />
          </Routes>
        </main>
        <footer className="text-center text-xs text-slate-400 py-6">
          Incident Management System
        </footer>
      </div>
    </Router>
  );
}
