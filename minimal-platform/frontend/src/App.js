import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from './context/AuthContext';
import Layout from './components/Layout';
import Login from './pages/Login';
import Register from './pages/Register';
import Dashboard from './pages/Dashboard';
import UmzugList from './pages/UmzugList';
import UmzugForm from './pages/UmzugForm';
import MitarbeiterList from './pages/MitarbeiterList';

const PrivateRoute = ({ children }) => {
  const { user, loading } = useAuth();
  
  if (loading) {
    return (
      <div className="flex justify-center items-center h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
      </div>
    );
  }
  
  return user ? children : <Navigate to="/login" />;
};

function App() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route path="/register" element={<Register />} />
      
      <Route path="/" element={
        <PrivateRoute>
          <Layout />
        </PrivateRoute>
      }>
        <Route index element={<Dashboard />} />
        <Route path="umzuege" element={<UmzugList />} />
        <Route path="umzuege/neu" element={<UmzugForm />} />
        <Route path="umzuege/:id/bearbeiten" element={<UmzugForm />} />
        <Route path="mitarbeiter" element={<MitarbeiterList />} />
      </Route>
    </Routes>
  );
}

export default App;