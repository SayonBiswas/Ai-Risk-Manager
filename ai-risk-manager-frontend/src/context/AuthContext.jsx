import { createContext, useContext, useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [jwt, setJwt] = useState(null);
  const [activeApiKey, setActiveApiKey] = useState(null);
  const navigate = useNavigate();

  // Load auth state from localStorage on mount
  useEffect(() => {
    const storedUser = localStorage.getItem('rm_user');
    const storedJwt = localStorage.getItem('rm_jwt');
    const storedApiKey = localStorage.getItem('rm_active_api_key');

    if (storedUser) setUser(JSON.parse(storedUser));
    if (storedJwt) setJwt(storedJwt);
    if (storedApiKey) setActiveApiKey(storedApiKey);
  }, []);

  const setAuth = (token, userData) => {
    setJwt(token);
    setUser(userData);
    localStorage.setItem('rm_jwt', token);
    localStorage.setItem('rm_user', JSON.stringify(userData));
  };

  const handleSetActiveApiKey = (key) => {
    setActiveApiKey(key);
    localStorage.setItem('rm_active_api_key', key);
  };

  const logout = () => {
    setUser(null);
    setJwt(null);
    setActiveApiKey(null);
    localStorage.removeItem('rm_jwt');
    localStorage.removeItem('rm_user');
    localStorage.removeItem('rm_active_api_key');
    navigate('/login');
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        jwt,
        setAuth,
        logout,
        activeApiKey,
        setActiveApiKey: handleSetActiveApiKey,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
