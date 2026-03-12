import { Routes, Route, Navigate } from 'react-router-dom';
import { useState } from 'react';
import Login from './pages/Login';
import DashboardLayout from './components/DashboardLayout';
import Overview from './pages/Overview';
import Bookings from './pages/Bookings';
import Schedule from './pages/Schedule';
import Finance from './pages/Finance';
import Customers from './pages/Customers';
import Settings from './pages/Settings';

function App() {
  const [isAuth, setIsAuth] = useState(false);

  const handleLogin = () => setIsAuth(true);

  if (!isAuth) {
    return <Login onSuccess={handleLogin} />;
  }

  return (
    <DashboardLayout>
      <Routes>
        <Route path="/" element={<Overview />} />
        <Route path="/bookings" element={<Bookings />} />
        <Route path="/schedule" element={<Schedule />} />
        <Route path="/finance" element={<Finance />} />
        <Route path="/customers" element={<Customers />} />
        <Route path="/settings" element={<Settings />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </DashboardLayout>
  );
}

export default App;
