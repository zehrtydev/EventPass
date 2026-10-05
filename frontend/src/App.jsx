import { Route, Routes, useLocation } from 'react-router-dom';
import Layout from './components/Layout';
import ProtectedRoute from './components/ProtectedRoute';
import HomePage from './pages/HomePage';
import AuthPage from './pages/AuthPages';
import EventDetailPage from './pages/EventDetailPage';
import RegistrationsPage from './pages/RegistrationsPage';
import ProfilePage from './pages/ProfilePage';
import TelegramLinkPage from './pages/TelegramLinkPage';
import AssistantPage from './pages/AssistantPage';
import NotFoundPage from './pages/NotFoundPage';

export default function App() {
  const location = useLocation();
  return <Routes><Route element={<Layout />}><Route index element={<HomePage />} /><Route path="eventos" element={<HomePage catalogOnly />} /><Route path="eventos/:id" element={<EventDetailPage key={location.pathname} />} /><Route path="login" element={<AuthPage />} /><Route path="registro" element={<AuthPage key="register" register />} /><Route path="asistente" element={<AssistantPage />} /><Route element={<ProtectedRoute />}><Route path="cuenta" element={<ProfilePage />} /><Route path="inscripciones" element={<RegistrationsPage />} /><Route path="vinculacion" element={<TelegramLinkPage />} /></Route><Route path="*" element={<NotFoundPage />} /></Route></Routes>;
}
