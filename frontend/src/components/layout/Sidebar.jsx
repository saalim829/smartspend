import { Link, NavLink } from "react-router-dom";
import {
  ArrowLeftRight,
  ArrowUpRight,
  ChartNoAxesCombined,
  CircleDollarSign,
  LayoutDashboard,
  LogOut,
  Settings,
  WalletCards,
  X,
} from "lucide-react";
import { useAuth } from "../../context/AuthContext";

const navItems = [
  { label: "Overview", path: "/dashboard", icon: LayoutDashboard },
  { label: "Transactions", path: "/transactions", icon: ArrowLeftRight },
  { label: "Budgets", path: "/budgets", icon: WalletCards },
  { label: "Reports", path: "/reports", icon: ChartNoAxesCombined },
];

export default function Sidebar({ mobileNavOpen, closeMobileNav }) {
  const { logout } = useAuth();

  return (
    <aside
      className={`sidebar ${mobileNavOpen ? "sidebar-open" : ""}`}
      aria-label="Main navigation"
    >
      <div className="brand">
        <Link to="/dashboard" className="brand-link" onClick={closeMobileNav}>
          <span className="brand-mark">
            <CircleDollarSign size={24} />
          </span>

          <span className="brand-name">
            smart<span>spend</span>
            <small>PERSONAL FINANCE</small>
          </span>
        </Link>

        <button
          type="button"
          className="close-nav"
          onClick={closeMobileNav}
          aria-label="Close navigation"
        >
          <X size={20} />
        </button>
      </div>

      <div className="workspace-label">WORKSPACE</div>

      <nav className="side-nav">
        {navItems.map(({ label, path, icon: Icon }) => (
          <NavLink
            key={path}
            to={path}
            end
            onClick={closeMobileNav}
            className={({ isActive }) =>
              `nav-item ${isActive ? "active" : ""}`
            }
          >
            <Icon size={19} />
            <span>{label}</span>
          </NavLink>
        ))}
      </nav>

      <div className="sidebar-bottom">
        <div className="upgrade-card">
          <span className="upgrade-spark">✦</span>
          <strong>
            Make your money
            <br />
            work smarter.
          </strong>
          <p>Build better habits, one day at a time.</p>
          <Link to="/reports" onClick={closeMobileNav}>
            Explore insights <ArrowUpRight size={15} />
          </Link>
        </div>

        <button
          type="button"
          className="nav-item settings-item"
          onClick={() =>
            window.dispatchEvent(new CustomEvent("smartspend:settings"))
          }
        >
          <Settings size={19} />
          <span>Settings</span>
        </button>

        <button
          type="button"
          className="nav-item logout-item"
          onClick={logout}
        >
          <LogOut size={19} />
          <span>Sign out</span>
        </button>
      </div>
    </aside>
  );
}