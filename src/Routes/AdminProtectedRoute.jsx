import { Navigate, Outlet, useLocation } from "react-router-dom";

export default function AdminProtectedRoute() {
  const location = useLocation();
  const token = sessionStorage.getItem("adminToken");

  if (!token) {
    return <Navigate to="/admin/login" replace state={{ from: location }} />;
  }

  return <Outlet />;
}
