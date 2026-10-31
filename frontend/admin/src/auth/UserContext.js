import { createContext, useContext } from 'react';

// The signed-in admin user ({ id, email, full_name, role }) so any screen can hide actions the role may not use.
export const UserContext = createContext(null);
export const useUser = () => useContext(UserContext);
export const useIsAdmin = () => useUser()?.role === 'admin';
