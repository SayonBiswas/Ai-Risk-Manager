import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import Login from './pages/Login';
import Register from './pages/Register';
import ApiKeys from './pages/ApiKeys';
import Dashboard from './pages/Dashboard';
import FraudDetect from './pages/FraudDetect';
import ReturnScorer from './pages/ReturnScorer';
import ChargebackResponder from './pages/ChargebackResponder';

const PrivateRoute = ({ children, requireKey = true }) => {
  const { jwt, activeApiKey } = useAuth();
  if (!jwt) return <Navigate to="/login" replace />;
  if (requireKey && !activeApiKey) return <Navigate to="/api-keys" replace />;
  return children;
};

const PublicRoute = ({ children }) => {
  const { jwt } = useAuth();
  if (jwt) return <Navigate to="/dashboard" replace />;
  return children;
};

const AppContent = () => (
  <Routes>
    <Route path="/" element={<Navigate to="/login" replace />} />

    <Route path="/login"    element={<PublicRoute><Login /></PublicRoute>} />
    <Route path="/register" element={<PublicRoute><Register /></PublicRoute>} />

    <Route path="/api-keys" element={
      <PrivateRoute requireKey={false}><ApiKeys /></PrivateRoute>
    } />

    <Route path="/dashboard"    element={<PrivateRoute><Dashboard /></PrivateRoute>} />
    <Route path="/fraud"        element={<PrivateRoute><FraudDetect /></PrivateRoute>} />
    <Route path="/returns"      element={<PrivateRoute><ReturnScorer /></PrivateRoute>} />
    <Route path="/chargebacks"  element={<PrivateRoute><ChargebackResponder /></PrivateRoute>} />
  </Routes>
);

const App = () => (
  <BrowserRouter>
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  </BrowserRouter>
);

export default App;