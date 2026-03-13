import React, { useState } from 'react';
import { Sidebar } from './components/Sidebar';
import { TopNav } from './components/TopNav';
import { SecurityDashboard } from './pages/SecurityDashboard';
import { ScanRepository } from './pages/ScanRepository';
import { Reports } from './pages/Reports';
import { ScanningProcess } from './pages/ScanningProcess';
import { VulnerabilityReport } from './pages/VulnerabilityReport';
import { LoginPage } from './pages/LoginPage';
import { ScanLineEffect } from './components/ScanLineEffect';
import { useAuth } from './hooks/useAuth';
import { LoaderIcon } from 'lucide-react';
import type { ScanResponse } from './services/api';

type Page = 'dashboard' | 'scan' | 'reports' | 'scanning' | 'vulnerabilities';

export interface ScanJob {
  url: string;
  type: 'code' | 'iac';
  promise: Promise<ScanResponse>;
}

export function App() {
  const { user, loading } = useAuth();
  const [currentPage, setCurrentPage] = useState<Page>('dashboard');
  const [scanJob, setScanJob] = useState<ScanJob | null>(null);
  const [lastScanResult, setLastScanResult] = useState<ScanResponse | null>(null);

  function handleStartScan(url: string, type: 'code' | 'iac', promise: Promise<ScanResponse>) {
    setScanJob({ url, type, promise });
    setLastScanResult(null);
    setCurrentPage('scanning');
  }

  function handleScanComplete(result: ScanResponse) {
    setLastScanResult(result);
    setScanJob(null);
    setCurrentPage('reports');
  }

  function handleScanCancel() {
    setScanJob(null);
    setCurrentPage('scan');
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-cyber-black flex items-center justify-center">
        <LoaderIcon className="w-8 h-8 text-cyber-red animate-spin" />
      </div>
    );
  }

  if (!user) {
    return <LoginPage />;
  }

  const renderPage = () => {
    switch (currentPage) {
      case 'dashboard':
        return <SecurityDashboard onNavigate={setCurrentPage} />;
      case 'scan':
        return <ScanRepository onStartScan={handleStartScan} />;
      case 'reports':
        return <Reports latestScan={lastScanResult} />;
      case 'scanning':
        return (
          <ScanningProcess
            scanJob={scanJob}
            onComplete={handleScanComplete}
            onCancel={handleScanCancel}
          />
        );
      case 'vulnerabilities':
        return <VulnerabilityReport lastScan={lastScanResult} />;
      default:
        return <SecurityDashboard onNavigate={setCurrentPage} />;
    }
  };

  return (
    <div className="relative min-h-screen w-full bg-cyber-black">
      <Sidebar currentPage={currentPage} onNavigate={setCurrentPage} />
      <TopNav user={user} />
      {renderPage()}
      <ScanLineEffect />
    </div>
  );
}
