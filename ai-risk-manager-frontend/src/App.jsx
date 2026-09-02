import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import Layout from './components/Layout';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import FraudDetect from './pages/FraudDetect';
import ReturnScorer from './pages/ReturnScorer';
import ChargebackResponder from './pages/ChargebackResponder';

const ProtectedRoute = ({ children }) => {
  const { apiKey } = useAuth();
  if (!apiKey) {
    return <Navigate to="/login" replace />;
  }
  return children;
};

const PublicRoute = ({ children }) => {
  const { apiKey } = useAuth();
  if (apiKey) {
    return <Navigate to="/dashboard" replace />;
  }
  return children;
};

const AppContent = () => {
  return (
    <Routes>
      <Route
        path="/login"
        element={
          <PublicRoute>
            <Login />
          </PublicRoute>
        }
      />
      <Route
        path="/dashboard"
        element={
          <ProtectedRoute>
            <Layout title="Risk Operations Center">
              <Dashboard />
            </Layout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/fraud"
        element={
          <ProtectedRoute>
            <Layout title="Fraud Detection">
              <FraudDetect />
            </Layout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/returns"
        element={
          <ProtectedRoute>
            <Layout title="Return Risk Analysis">
              <ReturnScorer />
            </Layout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/chargebacks"
        element={
          <ProtectedRoute>
            <Layout title="Chargeback Management">
              <ChargebackResponder />
            </Layout>
          </ProtectedRoute>
        }
      />
      <Route path="/" element={<Navigate to="/login" replace />} />
    </Routes>
  );
};

const App = () => {
  return (
    <BrowserRouter>
      <AuthProvider>
        <AppContent />
      </AuthProvider>
    </BrowserRouter>
  );
};

export default App;
