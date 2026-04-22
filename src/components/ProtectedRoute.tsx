import { Navigate } from "react-router-dom";
import type { ReactNode } from "react";
import { useAuth } from "../context/AuthContext";
import type { Role } from "../types";

interface Props {
  role: Role;
  children: ReactNode;
}

export function ProtectedRoute({ role, children }: Props) {
  const { currentUser } = useAuth();

  if (!currentUser) return <Navigate to="/login" replace />;
  if (currentUser.role !== role) {
    return <Navigate to={`/${currentUser.role}`} replace />;
  }
  return <>{children}</>;
}
