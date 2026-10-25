import { useState } from "react";
import { Outlet } from "react-router-dom";
import Sidebar from "./Sidebar";
import Topbar from "./Topbar";

export default function AppLayout() {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);

  const toggleSidebar = () => {
    if (window.innerWidth <= 768) {
      setMobileSidebarOpen((previous) => !previous);
    } else {
      setSidebarCollapsed((previous) => !previous);
    }
  };

  const closeMobileSidebar = () => {
    setMobileSidebarOpen(false);
  };

  return (
    <div
      className={[
        "app-shell",
        sidebarCollapsed ? "sidebar-collapsed" : "",
        mobileSidebarOpen ? "mobile-sidebar-open" : "",
      ]
        .filter(Boolean)
        .join(" ")}
    >
      <Sidebar onNavigate={closeMobileSidebar} />

      {mobileSidebarOpen && (
        <button
          type="button"
          className="sidebar-overlay"
          aria-label="Close navigation menu"
          onClick={closeMobileSidebar}
        />
      )}

      <div className="main-content">
        <Topbar onMenuClick={toggleSidebar} />

        <main className="page-content">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
