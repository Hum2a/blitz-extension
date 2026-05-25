import React from "react";
import { createRoot } from "react-dom/client";
import App from "./App.jsx";
import WebConnect from "./components/WebConnect.jsx";
import { ThemeProvider } from "./components/ThemeProvider.jsx";
import { bootstrapAppearance } from "./hooks/useAppearance.js";
import { isExtensionPage } from "./lib/extension-env.js";
import "./styles/globals.css";

if (isExtensionPage()) {
  document.body.classList.add("blitz-site");
}

function Root() {
  if (isExtensionPage()) {
    return <App fullPage />;
  }
  return <WebConnect />;
}

bootstrapAppearance().then(() => {
  createRoot(document.getElementById("root")).render(
    <React.StrictMode>
      <ThemeProvider>
        <Root />
      </ThemeProvider>
    </React.StrictMode>
  );
});
