import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import "./styles/font-faces.css";
import "./styles/typography.css";
import "./styles/materials.css";
import "./styles/global.css";
import { App } from "./app/App";
import { ErrorBoundary } from './app/ErrorBoundary';
import { installErrorReporting } from './lib/errorReporting';
import "./i18n";

installErrorReporting();

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <ErrorBoundary>
      {/* URL-backed inputs need urgent updates; defer data requests, not typing. */}
      <BrowserRouter useTransitions={false}>
        <App />
      </BrowserRouter>
    </ErrorBoundary>
  </StrictMode>,
);
