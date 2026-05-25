import { createBrowserRouter, Navigate } from "react-router";
import { ReactNode } from "react";
import { Layout } from "./components/Layout";
import { Login } from "./pages/Login";
import { Inventaire } from "./pages/Inventaire";
import { Administration } from "./pages/Administration";
import { Ocr } from "./pages/Ocr";
import { ProtectedRoute } from "./routes/ProtectedRoute";
import { useAuth } from "./hooks/useAuth";

function RequireRole({ allow, children }: { allow: string[]; children: ReactNode }) {
  const role = useAuth((s) => s.role);
  return role && allow.includes(role) ? <>{children}</> : <Navigate to="/" replace />;
}

export const router = createBrowserRouter([
  {
    path: "/login",
    Component: Login,
  },
  {
    path: "/",
    element: (
      <ProtectedRoute>
        <Layout />
      </ProtectedRoute>
    ),
    children: [
      { index: true, Component: Inventaire },
      {
        path: "administration",
        element: (
          <RequireRole allow={["admin"]}>
            <Administration />
          </RequireRole>
        ),
      },
      {
        path: "ocr",
        element: (
          <RequireRole allow={["admin", "user"]}>
            <Ocr />
          </RequireRole>
        ),
      },
    ],
  },
]);
