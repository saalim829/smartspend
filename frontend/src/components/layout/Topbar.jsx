import { useLocation } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import {
  Menu,
  Bell,
  ChevronRight,
} from "lucide-react";

const pageTitles = {
  "/": "Overview",
  "/dashboard": "Overview",
  "/transactions": "Transactions",
  "/budgets": "Budgets",
  "/reports": "Reports",
};

export default function Topbar({ onMenuClick }) {
  const location = useLocation();
  const { user } = useAuth();

  const currentPage =
    pageTitles[location.pathname] || "SmartSpend";

  const displayName =
    user?.name ||
    user?.fullName ||
    user?.username ||
    "User";

  const initials = displayName
    .trim()
    .split(/\s+/)
    .map((part) => part[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  return (
    <header className="topbar">
      <div className="topbar-left">
        <button
          type="button"
          className="menu-toggle"
          onClick={onMenuClick}
          aria-label="Toggle navigation sidebar"
          title="Toggle sidebar"
        >
          <Menu size={22} strokeWidth={2} />
        </button>

        <nav className="breadcrumb" aria-label="Breadcrumb">
          <span className="breadcrumb-root">Workspace</span>

          <ChevronRight
            size={16}
            className="breadcrumb-separator"
            aria-hidden="true"
          />

          <span
            className="breadcrumb-current"
            aria-current="page"
          >
            {currentPage}
          </span>
        </nav>
      </div>

      <div className="top-actions">
        <span className="account-label">
          {displayName}
        </span>

        <button
          type="button"
          className="notification-btn"
          aria-label="Notifications"
          title="Notifications"
        >
          <Bell size={20} strokeWidth={1.8} />
        </button>

        <div
          className="top-avatar"
          title={displayName}
          aria-label={`Signed in as ${displayName}`}
        >
          {initials || "U"}
        </div>
      </div>
    </header>
  );
}
