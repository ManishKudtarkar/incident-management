import { Link } from "react-router-dom";

export default function Header() {
  return (
    <header className="bg-slate-800 text-white shadow-sm">
      <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-4 sm:px-6 lg:px-8">
        <div>
          <Link to="/" className="text-lg font-semibold text-white hover:text-slate-200">
            Incident Management
          </Link>
        </div>
        <nav className="flex items-center gap-4 text-sm">
          <Link to="/" className="text-slate-200 hover:text-white">
            Dashboard
          </Link>
          <Link to="/scan" className="rounded-md bg-slate-700 px-3 py-2 text-slate-100 hover:bg-slate-600">
            Scan
          </Link>
        </nav>
      </div>
    </header>
  );
}
