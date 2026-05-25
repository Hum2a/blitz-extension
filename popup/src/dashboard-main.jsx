import React from "react";
import { createRoot } from "react-dom/client";
import App from "./App.jsx";
import WebConnect from "./components/WebConnect.jsx";
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

createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <Root />
  </React.StrictMode>
);
