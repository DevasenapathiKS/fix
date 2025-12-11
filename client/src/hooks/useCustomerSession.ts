import { useShallow } from 'zustand/react/shallow';
import { useAuthStore } from '../store/auth.store';

export const useCustomerSession = () =>
  useAuthStore(
    useShallow((state) => ({
      user: state.user,
      token: state.token,
      isAuthenticated: state.isAuthenticated(),
      login: state.login,
      logout: state.logout,
      updateUser: state.updateUser
    }))
  );
