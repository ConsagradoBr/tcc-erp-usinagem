import { RouterProvider } from "react-router-dom";
import { Toaster } from "react-hot-toast";
import routes from "./routes";
import { ThemeProvider } from "./components/ThemeProvider";

export default function App() {
  return (
    <ThemeProvider>
      <RouterProvider router={routes} />
      <Toaster position="top-right" />
    </ThemeProvider>
  );
}
