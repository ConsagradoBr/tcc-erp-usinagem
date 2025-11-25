import { RouterProvider } from "react-router-dom";
import { Toaster } from "react-hot-toast";
import routes from "./routes";

export default function App() {
  return (
    <>
      <RouterProvider router={routes} />
      <Toaster position="top-right" />
    </>
  );
}
