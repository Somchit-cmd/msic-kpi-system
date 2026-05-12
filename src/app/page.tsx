'use client';

import { EvaluationProvider, useEvaluation } from '@/context/EvaluationContext';
import { AppLayout } from '@/components/AppLayout';
import { Toaster } from 'sonner';
import { ClipboardList } from 'lucide-react';
import dynamic from 'next/dynamic';

const Login = dynamic(() => import('@/views/Login'));
const Dashboard = dynamic(() => import('@/views/Dashboard'));
const SetupKpi = dynamic(() => import('@/views/SetupKpi'));
const SetupKpiForm = dynamic(() => import('@/views/SetupKpiForm'));
const PerformanceReviews = dynamic(() => import('@/views/PerformanceReviews'));
const QuarterlyReviews = dynamic(() => import('@/views/QuarterlyReviews'));
const NewEvaluation = dynamic(() => import('@/views/NewEvaluation'));
const EvaluationView = dynamic(() => import('@/views/EvaluationView'));
const NewQuarterlyReview = dynamic(() => import('@/views/NewQuarterlyReview'));
const QuarterlyReviewView = dynamic(() => import('@/views/QuarterlyReviewView'));
const Team = dynamic(() => import('@/views/Team'));
const UserManagement = dynamic(() => import('@/views/UserManagement'));
const Settings = dynamic(() => import('@/views/Settings'));

function LoadingScreen() {
  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center p-6 gap-4">
      <ClipboardList className="h-12 w-12 text-primary animate-pulse" />
      <p className="text-muted-foreground text-sm">Loading KPI System...</p>
    </div>
  );
}

function AppRouter() {
  const { isLoggedIn, currentView, loading } = useEvaluation();

  if (loading) {
    return <LoadingScreen />;
  }

  if (!isLoggedIn) {
    return <Login />;
  }

  const renderView = () => {
    switch (currentView) {
      case '/':
        return <Dashboard />;
      case '/setup-kpi':
        return <SetupKpi />;
      case '/setup-kpi/new':
      case '/setup-kpi/edit':
        return <SetupKpiForm />;
      case '/performance-reviews':
        return <PerformanceReviews />;
      case '/performance-reviews/new':
        return <NewEvaluation />;
      case '/quarterly-reviews':
        return <QuarterlyReviews />;
      case '/quarterly-reviews/new':
        return <NewQuarterlyReview />;
      case '/quarterly-reviews/view':
        return <QuarterlyReviewView />;
      case '/evaluation':
        return <EvaluationView />;
      case '/team':
        return <Team />;
      case '/users':
        return <UserManagement />;
      case '/settings':
        return <Settings />;
      default:
        return <Dashboard />;
    }
  };

  return (
    <AppLayout>
      {renderView()}
    </AppLayout>
  );
}

export default function Home() {
  return (
    <EvaluationProvider>
      <Toaster position="top-right" richColors />
      <AppRouter />
    </EvaluationProvider>
  );
}
