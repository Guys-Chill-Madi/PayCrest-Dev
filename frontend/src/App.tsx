// App routes
import { lazy, Suspense, useEffect, useRef, useState, type ComponentType } from "react";
import { BrowserRouter as Router, Routes, Route, useLocation } from "react-router-dom";

import Header from "./modules/public/home/components/Header";
import Navbar from "./modules/public/home/components/Navbar";
import PageTransitionLoader from "./components/PageTransitionLoader";
import StaffTopActions from "./components/StaffTopActions";
import SiteFooter from "./modules/public/home/components/SiteFooter";

const lazyRoute = (loader: () => Promise<Record<string, unknown>>) =>
  lazy(async () => {
    const mod = await loader();

    if (mod && typeof mod.default !== "undefined") {
      return { default: mod.default as ComponentType };
    }

    // Fallback for modules that only provide named exports.
    const firstExport = Object.values(mod).find((value) => value != null) as ComponentType | undefined;
    if (firstExport) {
      return { default: firstExport };
    }

    throw new Error("Lazy route module resolved without a component export.");
  });

const Home = lazyRoute(() => import("./modules/public/home/pages/Home"));
const CustomerLogin = lazyRoute(() => import("./modules/auth/pages/CustomerLogin"));
const StaffLogin = lazyRoute(() => import("./modules/auth/pages/StaffLogin"));
const CustomerRegister = lazyRoute(() => import("./modules/auth/pages/CustomerRegister"));
const KYC = lazyRoute(() => import("./modules/auth/pages/KYC"));
const VerificationDashboard = lazyRoute(() => import("./modules/verification/pages/VerificationDashboard"));
const VerificationProfilePage = lazyRoute(() => import("./modules/verification/pages/VerificationProfilePage"));
const KycVerificationPage = lazyRoute(() => import("./modules/verification/pages/KycVerificationPage"));
const DocumentVerificationPage = lazyRoute(() => import("./modules/verification/pages/DocumentVerificationPage"));
const ScoringPage = lazyRoute(() => import("./modules/verification/pages/ScoringPage"));
const ManagerDashboard = lazyRoute(() => import("./modules/manager/pages/ManagerDashboard"));
const ManagerProfilePage = lazyRoute(() => import("./modules/manager/pages/ManagerProfilePage"));
const ManagerPendingPage = lazyRoute(() => import("./modules/manager/pages/ManagerPendingPage"));
const ManagerCompletedPage = lazyRoute(() => import("./modules/manager/pages/ManagerCompletedPage"));
const ManagerSanctionLettersPage = lazyRoute(() => import("./modules/manager/pages/ManagerSanctionLettersPage"));
const ManagerReviewPage = lazyRoute(() => import("./modules/manager/pages/ManagerReviewPage"));
const AdminOverviewPage = lazyRoute(() => import("./modules/admin/pages/AdminOverviewPage"));
const AdminProfilePage = lazyRoute(() => import("./modules/admin/pages/AdminProfilePage"));
const AdminApprovalsPage = lazyRoute(() => import("./modules/admin/pages/AdminApprovalsPage"));
const AdminAuditLogsPage = lazyRoute(() => import("./modules/admin/pages/AdminAuditLogsPage"));
const AdminStaffPage = lazyRoute(() => import("./modules/admin/pages/AdminStaffPage"));
const AdminSettingsPage = lazyRoute(() => import("./modules/admin/pages/AdminSettingsPage"));
const AdminReviewPage = lazyRoute(() => import("./modules/admin/pages/AdminReviewPage"));
const EduInfo = lazyRoute(() => import("./modules/public/home/pages/eduinfo"));
const HomeInfo = lazyRoute(() => import("./modules/public/home/pages/homeinfo"));
const VehInfo = lazyRoute(() => import("./modules/public/home/pages/vehinfo"));
const PersInfo = lazyRoute(() => import("./modules/public/home/pages/persinfo"));
const CustomerPortal = lazyRoute(() => import("./modules/customer/pages/CustomerPortal/index"));
const MPINSetup = lazyRoute(() => import("./modules/auth/pages/MPINSetup"));

function AppWrapper() {
  const loc = useLocation();
  const showStaffSidebar = ["/verification", "/manager", "/admin"].some((path) => loc.pathname.startsWith(path));
  const [showRouteLoader, setShowRouteLoader] = useState(false);
  const [loaderDurationMs, setLoaderDurationMs] = useState(1200);
  const [loaderRunId, setLoaderRunId] = useState(0);
  const firstPathRef = useRef(true);
  const hideLoaderTimerRef = useRef<number | null>(null);

  useEffect(() => {
    if (firstPathRef.current) {
      firstPathRef.current = false;
      return;
    }

    if (hideLoaderTimerRef.current) {
      window.clearTimeout(hideLoaderTimerRef.current);
      hideLoaderTimerRef.current = null;
    }

    const duration = 1000 + Math.floor(Math.random() * 501);
    setLoaderDurationMs(duration);
    setLoaderRunId((curr) => curr + 1);
    setShowRouteLoader(true);

    hideLoaderTimerRef.current = window.setTimeout(() => {
      setShowRouteLoader(false);
      hideLoaderTimerRef.current = null;
    }, duration);
  }, [loc.pathname, loc.search, loc.hash]);

  useEffect(
    () => () => {
      if (hideLoaderTimerRef.current) {
        window.clearTimeout(hideLoaderTimerRef.current);
      }
    },
    [],
  );

  useEffect(() => {
    if (loc.hash) return;
    window.scrollTo({ top: 0, left: 0, behavior: "auto" });
  }, [loc.pathname, loc.search]);

  useEffect(() => {
    // Add header labels for responsive card-style tables on small screens.
    const stampLabels = () => {
      const tables = Array.from(document.querySelectorAll<HTMLTableElement>(".table, .audit-table, .custx-table, .bankdash-table"));
      tables.forEach((table) => {
        const headers = Array.from(table.querySelectorAll<HTMLTableCellElement>("thead th")).map((h) =>
          (h.textContent || "").trim(),
        );
        if (!headers.length) return;
        const rows = Array.from(table.querySelectorAll<HTMLTableRowElement>("tbody tr"));
        rows.forEach((row) => {
          Array.from(row.cells).forEach((cell, index) => {
            const label = headers[index] || `Column ${index + 1}`;
            cell.setAttribute("data-label", label);
          });
        });
      });
    };
    stampLabels();
    const t = window.setTimeout(stampLabels, 200);
    return () => window.clearTimeout(t);
  }, [loc.pathname]);

  return (
    <>
      <div className="app-ambient" aria-hidden="true">
        <span className="ambient-orb ambient-orb-a"></span>
        <span className="ambient-orb ambient-orb-b"></span>
      </div>
      {showStaffSidebar ? <Navbar /> : null}
      {showStaffSidebar ? <StaffTopActions /> : <Header />}
      <div className={`app-shell ${showStaffSidebar ? "with-sidebar" : ""}`}>
        <Suspense fallback={null}>
          <Routes>
          {/* Home */}
          <Route path="/" element={<Home />} />

          {/* Login */}
          <Route path="/login" element={<CustomerLogin />} />
          <Route path="/login/customer" element={<CustomerLogin />} />
          <Route path="/login/staff/:role" element={<StaffLogin />} />
          <Route path="/register/customer" element={<CustomerRegister />} />
          <Route path="/mpin-setup" element={<MPINSetup />} />
          <Route path="/customer/*" element={<CustomerPortal />} />
          <Route path="/dashboard" element={<CustomerPortal />} />
          <Route path="/kyc" element={<KYC />} />
          <Route path="/verification" element={<VerificationDashboard />} />
          <Route path="/verification/pending" element={<VerificationDashboard />} />
          <Route path="/verification/completed" element={<VerificationDashboard />} />
          <Route path="/verification/profile" element={<VerificationProfilePage />} />
          <Route path="/verification/kyc/:id" element={<KycVerificationPage />} />
          <Route path="/verification/loan/:loanId" element={<DocumentVerificationPage />} />
          <Route path="/verification/score/:entityType/:id" element={<ScoringPage />} />
          <Route path="/manager" element={<ManagerDashboard />} />
          <Route path="/manager/profile" element={<ManagerProfilePage />} />
          <Route path="/manager/pending" element={<ManagerPendingPage />} />
          <Route path="/manager/completed" element={<ManagerCompletedPage />} />
          <Route path="/manager/sanctions" element={<ManagerSanctionLettersPage />} />
          <Route path="/manager/review/:loanId" element={<ManagerReviewPage />} />
          <Route path="/admin" element={<AdminOverviewPage />} />
          <Route path="/admin/profile" element={<AdminProfilePage />} />
          <Route path="/admin/approvals" element={<AdminApprovalsPage />} />
          <Route path="/admin/audit" element={<AdminAuditLogsPage />} />
          <Route path="/admin/staff" element={<AdminStaffPage />} />
          <Route path="/admin/settings" element={<AdminSettingsPage />} />
          <Route path="/admin/review/:loanId" element={<AdminReviewPage />} />

          {/* Loan Info Pages */}
          <Route path="/education" element={<EduInfo />} />
          <Route path="/home-loan" element={<HomeInfo />} />
          <Route path="/vehicle" element={<VehInfo />} />
          <Route path="/personal" element={<PersInfo />} />
          </Routes>
        </Suspense>
        {showStaffSidebar ? null : <SiteFooter />}
      </div>
      <PageTransitionLoader active={showRouteLoader} durationMs={loaderDurationMs} runId={loaderRunId} />
    </>
  );
}

export default function App() {
  return (
    <Router future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
      <AppWrapper />
    </Router>
  );
}
