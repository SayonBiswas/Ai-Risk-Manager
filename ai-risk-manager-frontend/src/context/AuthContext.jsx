import { createContext, useContext, useState, useEffect } from 'react';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [apiKey, setApiKeyState] = useState(null);

  useEffect(() => {
    const storedKey = localStorage.getItem('rm_api_key');
    if (storedKey) {
      setApiKeyState(storedKey);
    }
  }, []);

  const setApiKey = (key) => {
    localStorage.setItem('rm_api_key', key);
    setApiKeyState(key);
  };

  const logout = () => {
    localStorage.removeItem('rm_api_key');
    setApiKeyState(null);
  };

  return (
    <AuthContext.Provider value={{ apiKey, setApiKey, logout }}>
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
