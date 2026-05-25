import React from "react";
import { createRoot } from "react-dom/client";
import App from "./App.jsx";
import { ThemeProvider } from "./components/ThemeProvider.jsx";
import { bootstrapAppearance } from "./hooks/useAppearance.js";
import "./styles/globals.css";

document.body.classList.add("blitz-popup");

bootstrapAppearance().then(() => {
  createRoot(document.getElementById("root")).render(
    <React.StrictMode>
      <ThemeProvider>
        <App />
      </ThemeProvider>
    </React.StrictMode>
  );
});

