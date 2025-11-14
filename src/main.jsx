import { createRoot } from "react-dom/client";
import App from "./App.jsx";
import "./index.css";

// Prevent page refresh on unhandled promise rejections
window.addEventListener('unhandledrejection', (event) => {
  console.error('Unhandled promise rejection:', event.reason);
  event.preventDefault(); // Prevent default browser behavior
});

// Prevent page refresh on errors
window.addEventListener('error', (event) => {
  console.error('Global error:', event.error);
  event.preventDefault(); // Prevent default browser behavior
});

createRoot(document.getElementById("root")).render(<App />);


