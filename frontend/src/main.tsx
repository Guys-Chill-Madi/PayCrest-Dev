// App bootstrap
import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App";
import { applyIstLocalePatch } from "./lib/ist-locale";
import "./index.css";
import "./styles/design-system.css";
import "./styles/fintech-portal.css";
import "./styles/legacy-migration.css";

applyIstLocalePatch();

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
