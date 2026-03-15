import React from "react";
import ReactDOM from "react-dom/client";
import { AppProvider as PolarisProvider } from "@shopify/polaris";
import enTranslations from "@shopify/polaris/locales/en.json";
import App from "./App";
import "@shopify/polaris/build/esm/styles.css";

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <PolarisProvider i18n={enTranslations}>
      <App />
    </PolarisProvider>
  </React.StrictMode>
);
