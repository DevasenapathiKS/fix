import type { ReactElement } from 'react';
import { Navigate } from 'react-router-dom';
import { useCustomerSession } from '../hooks/useCustomerSession';

interface Props {
  children: ReactElement;
}

export const PublicRoute = ({ children }: Props) => {
  const { isAuthenticated } = useCustomerSession();
  if (isAuthenticated) {
    return <Navigate to="/dashboard" replace />;
  }
  return children;
};
