import type { ReactElement } from 'react';
import { Navigate } from 'react-router-dom';
import { useCustomerSession } from '../hooks/useCustomerSession';

interface Props {
  children: ReactElement;
}

export const ProtectedRoute = ({ children }: Props) => {
  const { isAuthenticated } = useCustomerSession();
  if (!isAuthenticated) {
    return <Navigate to="/auth/login" replace />;
  }
  return children;
};
