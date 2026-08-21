import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './components/AuthContext';
import { ToastProvider } from './components/Toast';
import LoginScreen from './components/LoginScreen';
import Sidebar from './components/Sidebar';
import BackButton from './components/BackButton';
import Dashboard from './pages/Dashboard';
import PeralatanIndex from './pages/PeralatanIndex';
import SiteList from './pages/SiteList';
import SiteCategoryList from './pages/SiteCategoryList';
import ChecksheetForm from './pages/ChecksheetForm';
import InstrumenPage from './pages/InstrumenPage';
import DokumentasiPage from './pages/DokumentasiPage';
import VerifikasiIndex from './pages/VerifikasiIndex';
import VerifikasiSite from './pages/VerifikasiSite';

function AppShell() {
  const { user, isForeman } = useAuth();

  if (!user) {
    return <LoginScreen />;
  }

  return (
    <div className="app-shell">
      <Sidebar />
      <main className="main">
        <BackButton />
        <Routes>
          <Route path="/" element={<Dashboard />} />
          <Route path="/peralatan" element={<PeralatanIndex />} />
          <Route path="/peralatan/:buildingCategory" element={<SiteList />} />
          <Route path="/peralatan/:buildingCategory/:siteName" element={<SiteCategoryList />} />
          <Route path="/peralatan/:buildingCategory/:siteName/:categoryId" element={<ChecksheetForm />} />
          <Route path="/instrumen" element={<InstrumenPage />} />
          <Route path="/dokumentasi" element={<DokumentasiPage />} />
          {isForeman ? (
            <>
              <Route path="/verifikasi" element={<VerifikasiIndex />} />
              <Route path="/verifikasi/:buildingCategory/:siteName" element={<VerifikasiSite />} />
            </>
          ) : (
            <Route path="/verifikasi/*" element={<Navigate to="/" replace />} />
          )}
        </Routes>
      </main>
    </div>
  );
}

export default function App() {
  return (
    <ToastProvider>
      <AuthProvider>
        <AppShell />
      </AuthProvider>
    </ToastProvider>
  );
}
