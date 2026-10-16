import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import ErrorBoundary from './components/ErrorBoundary';
import Login from './pages/Login';
import Register from './pages/Register';
import ForgotPassword from './pages/ForgotPassword';
import ResetPassword from './pages/ResetPassword';
import ApiKeys from './pages/ApiKeys';
import Dashboard from './pages/Dashboard';
import TransactionDetail from './pages/TransactionDetail';
import FraudDetect from './pages/FraudDetect';
import ReturnScorer from './pages/ReturnScorer';
import ChargebackResponder from './pages/ChargebackResponder';
import NotFound from './pages/NotFound';

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

    <Route path="/login"           element={<PublicRoute><Login /></PublicRoute>} />
    <Route path="/register"        element={<PublicRoute><Register /></PublicRoute>} />
    <Route path="/forgot-password" element={<PublicRoute><ForgotPassword /></PublicRoute>} />
    <Route path="/reset-password"  element={<PublicRoute><ResetPassword /></PublicRoute>} />

    <Route path="/api-keys" element={
      <PrivateRoute requireKey={false}><ApiKeys /></PrivateRoute>
    } />

    <Route path="/dashboard"           element={<PrivateRoute><Dashboard /></PrivateRoute>} />
    <Route path="/transactions/:id"    element={<PrivateRoute><TransactionDetail /></PrivateRoute>} />
    <Route path="/fraud"               element={<PrivateRoute><FraudDetect /></PrivateRoute>} />
    <Route path="/returns"             element={<PrivateRoute><ReturnScorer /></PrivateRoute>} />
    <Route path="/chargebacks"         element={<PrivateRoute><ChargebackResponder /></PrivateRoute>} />

    {/* Catch-all route for 404 */}
    <Route path="*" element={<NotFound />} />
  </Routes>
);

const App = () => (
  <ErrorBoundary>
    <BrowserRouter>
      <AuthProvider>
        <AppContent />
      </AuthProvider>
    </BrowserRouter>
  </ErrorBoundary>
);

export default App;