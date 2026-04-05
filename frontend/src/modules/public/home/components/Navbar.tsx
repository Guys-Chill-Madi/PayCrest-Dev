// Module: Navbar
import { Link, useLocation } from "react-router-dom";
import "../styles/navbar.css";
import { getSession } from "../../../../modules/auth/services/authApi";

const managerItems = [
  {
    to: "/manager",
    label: "Dashboard",
    icon: (
      <svg viewBox="0 0 24 24" className="icon-svg" fill="none" stroke="currentColor" strokeWidth="1.5">
        <path d="M4 13h7V4H4v9zM13 20h7V11h-7v9zM13 4h7v5h-7V4zM4 20h7v-5H4v5z" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    ),
  },
  {
    to: "/manager/pending",
    label: "Pending",
    icon: (
      <svg viewBox="0 0 24 24" className="icon-svg" fill="none" stroke="currentColor" strokeWidth="1.5">
        <path d="M12 6v6l4 2" strokeLinecap="round" strokeLinejoin="round" />
        <path d="M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0z" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    ),
  },
  {
    to: "/manager/completed",
    label: "Completed",
    icon: (
      <svg viewBox="0 0 24 24" className="icon-svg" fill="none" stroke="currentColor" strokeWidth="1.5">
        <path d="M9 12l2 2 4-4" strokeLinecap="round" strokeLinejoin="round" />
        <path d="M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0z" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    ),
  },
  {
    to: "/manager/sanctions",
    label: "Sanction Letter",
    icon: (
      <svg viewBox="0 0 24 24" className="icon-svg" fill="none" stroke="currentColor" strokeWidth="1.5">
        <path d="M7 3h8l4 4v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2z" strokeLinecap="round" strokeLinejoin="round" />
        <path d="M15 3v4h4" strokeLinecap="round" strokeLinejoin="round" />
        <path d="M8 12h8M8 16h6" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    ),
  },
  {
    to: "/manager/profile",
    label: "Profile",
    icon: (
      <svg viewBox="0 0 24 24" className="icon-svg" fill="none" stroke="currentColor" strokeWidth="1.5">
        <path d="M12 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8z" strokeLinecap="round" strokeLinejoin="round" />
        <path d="M6 20a6 6 0 0 1 12 0" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    ),
  },
];

const verificationItems = [
  {
    to: "/verification",
    label: "Dashboard",
    icon: (
      <svg viewBox="0 0 24 24" className="icon-svg" fill="none" stroke="currentColor" strokeWidth="1.5">
        <path d="M9 11l2 2 4-4" strokeLinecap="round" strokeLinejoin="round" />
        <path d="M21 12v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h11" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    ),
  },
  {
    to: "/verification/pending",
    label: "Pending",
    icon: (
      <svg viewBox="0 0 24 24" className="icon-svg" fill="none" stroke="currentColor" strokeWidth="1.5">
        <path d="M12 6v6l4 2" strokeLinecap="round" strokeLinejoin="round" />
        <path d="M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0z" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    ),
  },
  {
    to: "/verification/completed",
    label: "Completed",
    icon: (
      <svg viewBox="0 0 24 24" className="icon-svg" fill="none" stroke="currentColor" strokeWidth="1.5">
        <path d="M9 12l2 2 4-4" strokeLinecap="round" strokeLinejoin="round" />
        <path d="M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0z" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    ),
  },
  {
    to: "/verification/profile",
    label: "Profile",
    icon: (
      <svg viewBox="0 0 24 24" className="icon-svg" fill="none" stroke="currentColor" strokeWidth="1.5">
        <path d="M12 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8z" strokeLinecap="round" strokeLinejoin="round" />
        <path d="M6 20a6 6 0 0 1 12 0" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    ),
  },
];

const adminItems = [
  {
    to: "/admin",
    label: "Dashboard",
    icon: (
      <svg viewBox="0 0 24 24" className="icon-svg" fill="none" stroke="currentColor" strokeWidth="1.5">
        <path d="M12 2v4" strokeLinecap="round" strokeLinejoin="round" />
        <path d="M5.5 7.5L4 12l1 6 6 3 6-3 1-6-1.5-4.5" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    ),
  },
  {
    to: "/admin/approvals",
    label: "Approvals",
    icon: (
      <svg viewBox="0 0 24 24" className="icon-svg" fill="none" stroke="currentColor" strokeWidth="1.5">
        <path d="M9 12l2 2 4-4" strokeLinecap="round" strokeLinejoin="round" />
        <path d="M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0z" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    ),
  },
  {
    to: "/admin/audit",
    label: "Audit Logs",
    icon: (
      <svg viewBox="0 0 24 24" className="icon-svg" fill="none" stroke="currentColor" strokeWidth="1.5">
        <path d="M12 8v5l3 2" strokeLinecap="round" strokeLinejoin="round" />
        <path d="M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0z" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    ),
  },
  {
    to: "/admin/staff",
    label: "Staff",
    icon: (
      <svg viewBox="0 0 24 24" className="icon-svg" fill="none" stroke="currentColor" strokeWidth="1.5">
        <path d="M12 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8z" strokeLinecap="round" strokeLinejoin="round" />
        <path d="M6 20a6 6 0 0 1 12 0" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    ),
  },
  {
    to: "/admin/settings",
    label: "Settings",
    icon: (
      <svg viewBox="0 0 24 24" className="icon-svg" fill="none" stroke="currentColor" strokeWidth="1.5">
        <path d="M12 15.5a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7z" strokeLinecap="round" strokeLinejoin="round" />
        <path d="M19.4 15a1.8 1.8 0 0 0 .35 1.98l.06.06a2.2 2.2 0 0 1-1.56 3.76 2.2 2.2 0 0 1-1.56-.65l-.06-.06A1.8 1.8 0 0 0 15 19.4a1.8 1.8 0 0 0-1 .33 1.8 1.8 0 0 0-.7 1.46V21a2.2 2.2 0 0 1-4.4 0v-.08a1.8 1.8 0 0 0-1.7-1.8 1.8 1.8 0 0 0-1 .33l-.06.06a2.2 2.2 0 0 1-3.12 0 2.2 2.2 0 0 1 0-3.12l.06-.06A1.8 1.8 0 0 0 4.6 15a1.8 1.8 0 0 0-.33-1 1.8 1.8 0 0 0-1.46-.7H2.9a2.2 2.2 0 0 1 0-4.4h.08A1.8 1.8 0 0 0 4.8 7.2a1.8 1.8 0 0 0-.33-1l-.06-.06a2.2 2.2 0 0 1 3.12-3.12l.06.06A1.8 1.8 0 0 0 9 4.6a1.8 1.8 0 0 0 1-.33 1.8 1.8 0 0 0 .7-1.46V2.9a2.2 2.2 0 0 1 4.4 0v.08a1.8 1.8 0 0 0 1.8 1.7 1.8 1.8 0 0 0 1-.33l.06-.06a2.2 2.2 0 0 1 3.12 3.12l-.06.06A1.8 1.8 0 0 0 19.4 9c.2 0 .4-.03.58-.08h.08a2.2 2.2 0 0 1 0 4.4h-.08c-.18-.05-.38-.08-.58-.08z" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    ),
  },
  {
    to: "/admin/profile",
    label: "Profile",
    icon: (
      <svg viewBox="0 0 24 24" className="icon-svg" fill="none" stroke="currentColor" strokeWidth="1.5">
        <path d="M12 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8z" strokeLinecap="round" strokeLinejoin="round" />
        <path d="M6 20a6 6 0 0 1 12 0" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    ),
  },
];

const customerItems = [
  { to: "/customer/dashboard", label: "Dashboard", icon: (
      <svg viewBox="0 0 24 24" className="icon-svg" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M3 11.5L12 4l9 7.5" strokeLinecap="round" strokeLinejoin="round" /><path d="M5 21V12h14v9" strokeLinecap="round" strokeLinejoin="round" /></svg>
    ) },
  { to: "/customer/wallet", label: "Wallet", icon: (
      <svg viewBox="0 0 24 24" className="icon-svg" fill="none" stroke="currentColor" strokeWidth="1.5"><rect x="2" y="7" width="20" height="12" rx="2" /><path d="M16 12h.01" /></svg>
    ) },
  { to: "/customer/emi", label: "EMI Repayment", icon: (
      <svg viewBox="0 0 24 24" className="icon-svg" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M3 7h18" /><path d="M6 11h12" /><path d="M9 15h6" /></svg>
    ) },
  { to: "/customer/loans", label: "Loans", icon: (
      <svg viewBox="0 0 24 24" className="icon-svg" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M3 13l9-9 9 9" /><path d="M21 21H3v-8h18v8z" /></svg>
    ) },
  { to: "/customer/track", label: "Track Status", icon: (
      <svg viewBox="0 0 24 24" className="icon-svg" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M3 12h3l3 8 7-16 4 12h2" /></svg>
    ) },
  { to: "/customer/profile", label: "Profile", icon: (
      <svg viewBox="0 0 24 24" className="icon-svg" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M12 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8z" /><path d="M6 20a6 6 0 0 1 12 0" /></svg>
    ) },
];

const Navbar = () => {
  const loc = useLocation();
  const isCustomer = loc.pathname.startsWith("/customer");
  const role = getSession()?.role ?? null;
  const isStaff = !isCustomer;
  const logoSrc = new URL("../../../../styles/paycrest-logo.png", import.meta.url).href;

  const menu = (() => {
    if (isCustomer) return customerItems;
    if (role === "manager") return managerItems;
    if (role === "verification") return verificationItems;
    if (role === "admin") return adminItems;
    if (loc.pathname.startsWith("/manager")) return managerItems;
    if (loc.pathname.startsWith("/verification")) return verificationItems;
    if (loc.pathname.startsWith("/admin")) return adminItems;
    return managerItems;
  })();

  const isActive = (to: string) => {
    if (to === "/manager") return loc.pathname === "/manager" || loc.pathname.startsWith("/manager/review/");
    if (to === "/manager/profile") return loc.pathname === "/manager/profile";
    if (to === "/verification") return loc.pathname === "/verification";
    if (to === "/verification/pending")
      return (
        loc.pathname === "/verification/pending" ||
        loc.pathname.startsWith("/verification/kyc/") ||
        loc.pathname.startsWith("/verification/loan/") ||
        loc.pathname.startsWith("/verification/score/")
      );
    if (to === "/verification/completed") return loc.pathname === "/verification/completed";
    if (to === "/verification/profile") return loc.pathname === "/verification/profile";
    if (to === "/admin") return loc.pathname === "/admin" || loc.pathname.startsWith("/admin/review/");
    if (to === "/admin/profile") return loc.pathname === "/admin/profile";
    return loc.pathname === to || loc.pathname.startsWith(`${to}/`);
  };

  return (
    <nav className={`sidebar ${isCustomer ? "customer" : "light"} ${isStaff ? "staff" : ""}`} aria-label="Primary navigation">
      <div className="sidebar-top">
        <div className="sidebar-top-row">
          <div className="sidebar-brand-row">
            <img className="sidebar-brand-logo" src={logoSrc} alt="PayCrest" />
            <div className="brand">PayCrest</div>
          </div>
          {isCustomer ? <div className="sidebar-sub">Customer Console</div> : null}
        </div>
      </div>
      <ul className="sidebar-list">
        {menu.map((it) => (
          <li key={it.to} className={isActive(it.to) ? "active" : ""}>
            <Link to={it.to} className="sidebar-link">
              <span className="icon">{it.icon}</span>
              <span className="label">{it.label}</span>
            </Link>
          </li>
        ))}
      </ul>
      {isCustomer ? (
        <div className="sidebar-bottom">
          <Link to="/login" className="sidebar-cta">Get Started</Link>
        </div>
      ) : null}
    </nav>
  );
};

export default Navbar;


