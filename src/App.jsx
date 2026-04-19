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
        <Route path="benutzer" element={<Benutzer />} />
      </Route>
    </Routes>
  );
}

export default App;
