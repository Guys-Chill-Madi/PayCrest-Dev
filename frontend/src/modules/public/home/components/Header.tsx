// Module: Header
import { useEffect, useRef, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import "../styles/header.css";
import { clearSession } from "../../../../modules/auth/services/authApi";

const Header = () => {
  const logoSrc = new URL("../../../../styles/paycrest-logo.png", import.meta.url).href;
  const navigate = useNavigate();
  const location = useLocation();

  const isAppArea = ["/dashboard", "/customer", "/kyc", "/verification", "/manager", "/admin"].some((path) =>
    location.pathname.startsWith(path),
  );
  const hasSidebar = ["/verification", "/manager", "/admin"].some((path) => location.pathname.startsWith(path));
  const isHome = location.pathname === "/";
  const [hiddenOnScroll, setHiddenOnScroll] = useState(false);
  const lastScrollYRef = useRef(0);

  useEffect(() => {
    const onScroll = () => {
      const currentY = Math.max(0, window.scrollY || 0);
      const previousY = lastScrollYRef.current;
      const delta = currentY - previousY;

      if (currentY <= 20) {
        setHiddenOnScroll(false);
      } else if (delta > 6) {
        setHiddenOnScroll(true);
      } else if (delta < -6) {
        setHiddenOnScroll(false);
      }

      lastScrollYRef.current = currentY;
    };

    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const handleLogout = () => {
    clearSession();
    navigate("/login");
  };

  const goToSection = (sectionId: string) => {
    if (location.pathname !== "/") {
      navigate("/");
      window.setTimeout(() => {
        document.getElementById(sectionId)?.scrollIntoView({ behavior: "smooth", block: "start" });
      }, 80);
      return;
    }
    document.getElementById(sectionId)?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  return (
    <header className={`site-header ${hasSidebar ? "with-sidebar" : ""} ${hiddenOnScroll ? "is-hidden" : ""}`}>
      <nav className="header-navbar" aria-label="Primary navigation">
        <Link to="/" className="navbar-brand">
          <img className="navbar-logo" src={logoSrc} alt="Pay Crest" />
          <span>
            PayCrest
            <small>Loan Management System</small>
          </span>
        </Link>

        {isHome && (
          <div className="navbar-links">
            <button type="button" className="navbar-link" onClick={() => goToSection("overview-section")}>Overview</button>
            <button type="button" className="navbar-link" onClick={() => goToSection("loan-products-section")}>Loan Products</button>
            <button type="button" className="navbar-link" onClick={() => goToSection("how-it-works-section")}>How It Works</button>
          </div>
        )}

        <div className="navbar-actions">
          {isAppArea ? (
            <button type="button" className="btn btn-primary" onClick={handleLogout}>
              Sign Out
            </button>
          ) : (
            <>
              <Link to="/login/customer" className="btn btn-secondary">Login</Link>
              <Link to="/register/customer" className="btn btn-primary">Sign Up</Link>
            </>
          )}
        </div>
      </nav>
    </header>
  );
};

export default Header;


