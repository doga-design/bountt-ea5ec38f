import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "@fontsource/geist-sans/400.css";
import "@fontsource/geist-sans/500.css";
import "@fontsource/geist-sans/600.css";
import "@fontsource/geist-sans/700.css";
import "./index.css";

createRoot(document.getElementById("root")!).render(<App />);
