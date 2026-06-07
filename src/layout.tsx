import { Outlet } from "react-router-dom";
import { Navbar } from "./components/Navbar"; // Check your path!
import { Toaster } from "sonner";

export function AppLayout() {
  return (
    <div className="min-h-screen bg-slate-50">
      <Navbar />
      <main>
        {/* This renders the child routes (Dashboard, Discover, etc.) */}
        <Outlet />
      </main>
      <Toaster position="top-center" richColors />
    </div>
  );
}