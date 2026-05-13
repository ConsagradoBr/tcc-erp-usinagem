import { useEffect } from "react";
import { RouterProvider } from "react-router-dom";
import { Toaster } from "react-hot-toast";
import routes from "./routes";
import { ThemeProvider } from "./components/ThemeProvider";
import { setupOfflineSessionCleanup } from "./offline/sessionCleanup";

export default function App() {
  useEffect(() => {
    setupOfflineSessionCleanup();
  }, []);

  return (
    <ThemeProvider>
      <RouterProvider router={routes} />
      <Toaster position="top-right" />
    </ThemeProvider>
  );
}
