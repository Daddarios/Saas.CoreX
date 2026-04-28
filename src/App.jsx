import { Routes, Route } from 'react-router-dom';
import ProtectedRoute from './components/shared/ProtectedRoute';
import MainLayout from './components/layout/MainLayout';
import Login from './pages/Login';
import ZweiFaktor from './pages/ZweiFaktor';
import Dashboard from './pages/Dashboard';
import Kunden from './pages/Kunden';
import Projekte from './pages/Projekte';
import Tickets from './pages/Tickets';
import Chat from './pages/Chat';
import Benutzer from './pages/Benutzer';
import Berichte from './pages/Berichte';
import Abonnement from './pages/Abonnement';
import Zahlung from './pages/Zahlung';
import Filiale from './pages/Filiale';

function App() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route path="/verify" element={<ZweiFaktor />} />

      <Route
        element={(
          <ProtectedRoute>
            <MainLayout />
          </ProtectedRoute>
        )}
      >
        <Route index element={<Dashboard />} />
        <Route path="kunden" element={<Kunden />} />
        <Route path="projekte" element={<Projekte />} />
        <Route path="tickets" element={<Tickets />} />
        <Route path="chat" element={<Chat />} />
        <Route path="filialen" element={<Filiale />} />
        {/* Sadece SuperAdmin ve Admin erişebilir */}
        <Route path="benutzer" element={
          <ProtectedRoute allowedRoles={['SuperAdmin', 'Admin', 'Manager']}>
            <Benutzer />
          </ProtectedRoute>
        } />
        <Route path="berichte" element={<Berichte />} />
        <Route path="abonnement" element={
          <ProtectedRoute allowedRoles={['SuperAdmin', 'Admin']}>
            <Abonnement />
          </ProtectedRoute>
        } />
        <Route path="zahlung" element={
          <ProtectedRoute allowedRoles={['SuperAdmin', 'Admin']}>
            <Zahlung />
          </ProtectedRoute>
        } />
      </Route>
    </Routes>
  );
}

export default App;
