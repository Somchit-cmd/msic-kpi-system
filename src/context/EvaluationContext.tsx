'use client';

// Context for evaluation state management — powered by Supabase PostgreSQL via API
import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';
import { Evaluation, User, Role, KpiPlan, AppSettings, isLeadershipRole } from '@/types/evaluation';

interface EvaluationContextType {
  isLoggedIn: boolean;
  currentUser: User;
  canEvaluateOthers: boolean;
  hasDirectReports: boolean;
  hasManager: boolean;
  users: User[];
  evaluations: Evaluation[];
  settings: AppSettings;
  loading: boolean;
  login: (username: string, password: string, rememberMe?: boolean) => Promise<{ success: boolean; error?: string }>;
  logout: () => Promise<void>;
  addEvaluation: (eval_: Evaluation) => Promise<void>;
  updateEvaluation: (eval_: Evaluation) => Promise<void>;
  getEvaluation: (id: string) => Evaluation | undefined;
  getMyEvaluations: () => Evaluation[];
  getPendingActions: () => Evaluation[];
  getTeamEvaluations: () => Evaluation[];
  addUser: (user: User) => Promise<void>;
  updateUser: (user: User) => Promise<void>;
  deleteUser: (id: string) => Promise<void>;
  plans: KpiPlan[];
  addPlan: (p: KpiPlan) => Promise<void>;
  updatePlan: (p: KpiPlan) => Promise<void>;
  deletePlan: (id: string) => Promise<void>;
  getPlan: (id: string) => KpiPlan | undefined;
  updateSetting: (key: string, value: string[] | Record<string, string[]>) => Promise<void>;
  currentView: string;
  viewParams: Record<string, string>;
  navigate: (path: string, params?: Record<string, string>) => void;
}

const EvaluationContext = createContext<EvaluationContextType | null>(null);

export function EvaluationProvider({ children }: { children: React.ReactNode }) {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [evaluations, setEvaluations] = useState<Evaluation[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [plans, setPlans] = useState<KpiPlan[]>([]);
  const [settings, setSettings] = useState<AppSettings>({ departments: [], jobTitles: {}, objectiveCategories: [] });
  const [loading, setLoading] = useState(true);

  // State-based routing
  const [currentView, setCurrentView] = useState('/');
  const [viewParams, setViewParams] = useState<Record<string, string>>({});

  const navigate = useCallback((path: string, params?: Record<string, string>) => {
    setCurrentView(path);
    setViewParams(params ?? {});
  }, []);

  // Fetch all data from API
  const fetchUsers = useCallback(async () => {
    try {
      const res = await fetch('/api/users');
      if (res.ok) setUsers(await res.json());
    } catch (e) { console.error('Failed to fetch users', e); }
  }, []);

  const fetchEvaluations = useCallback(async () => {
    try {
      const res = await fetch('/api/evaluations');
      if (res.ok) setEvaluations(await res.json());
    } catch (e) { console.error('Failed to fetch evaluations', e); }
  }, []);

  const fetchPlans = useCallback(async () => {
    try {
      const res = await fetch('/api/plans');
      if (res.ok) setPlans(await res.json());
    } catch (e) { console.error('Failed to fetch plans', e); }
  }, []);

  const fetchSettings = useCallback(async () => {
    try {
      const res = await fetch('/api/settings');
      if (res.ok) {
        const data = await res.json();
        setSettings({
          departments: data.departments || [],
          jobTitles: data.jobTitles || {},
          objectiveCategories: data.objectiveCategories || [],
        });
      }
    } catch (e) { console.error('Failed to fetch settings', e); }
  }, []);

  // Restore session from cookie on mount
  const restoreSession = useCallback(async () => {
    try {
      const res = await fetch('/api/auth');
      if (res.ok) {
        const user = await res.json();
        setCurrentUserId(user.id);
        setIsLoggedIn(true);
      }
    } catch (e) { console.error('Failed to restore session', e); }
  }, []);

  // Initial data load — restore session then fetch from API
  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      await restoreSession();
      await Promise.all([fetchUsers(), fetchEvaluations(), fetchPlans(), fetchSettings()]);
      if (!cancelled) setLoading(false);
    })();
    return () => { cancelled = true; };
  }, []);

  const currentUser: User = users.find(u => u.id === currentUserId) || users[0] || {
    id: '',
    name: '',
    title: '',
    department: '',
    role: 'employee' as Role,
    managerId: null,
    username: '',
    email: '',
    telephone: '',
  };

  // Derive evaluator status from org chart
  const canEvaluateOthers = users.some(u => u.managerId === currentUser.id);

  // Does current user have direct reports? (= they are an evaluator/manager in the org chart)
  const hasDirectReports = users.some(u => u.managerId === currentUser.id);

  // Does current user have a manager? (= they need to set up their own KPI)
  const hasManager = !!currentUser.managerId;

  // Plans
  const getPlan = useCallback((id: string) => plans.find(p => p.id === id), [plans]);

  const addPlan = useCallback(async (p: KpiPlan) => {
    const res = await fetch('/api/plans', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(p),
    });
    if (res.ok) {
      const created = await res.json();
      setPlans(prev => [...prev, created]);
    }
  }, []);

  const updatePlan = useCallback(async (p: KpiPlan) => {
    const res = await fetch(`/api/plans/${p.id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(p),
    });
    if (res.ok) {
      const updated = await res.json();
      setPlans(prev => prev.map(x => x.id === updated.id ? updated : x));
    }
  }, []);

  const deletePlan = useCallback(async (id: string) => {
    const res = await fetch(`/api/plans/${id}`, { method: 'DELETE' });
    if (res.ok) setPlans(prev => prev.filter(x => x.id !== id));
  }, []);

  // Settings
  const updateSetting = useCallback(async (key: string, value: string[] | Record<string, string[]>) => {
    const res = await fetch('/api/settings', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ key, value }),
    });
    if (res.ok) {
      const data = await res.json();
      setSettings(prev => ({ ...prev, [data.key]: data.value }));
    }
  }, []);

  // Users
  const addUser = useCallback(async (user: User) => {
    const res = await fetch('/api/users', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(user),
    });
    if (res.ok) {
      const created = await res.json();
      setUsers(prev => [...prev, created]);
    }
  }, []);

  const updateUser = useCallback(async (user: User) => {
    const res = await fetch(`/api/users/${user.id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(user),
    });
    if (res.ok) {
      const updated = await res.json();
      setUsers(prev => prev.map(u => u.id === updated.id ? updated : u));
    }
  }, []);

  const deleteUser = useCallback(async (id: string) => {
    const res = await fetch(`/api/users/${id}`, { method: 'DELETE' });
    if (res.ok) setUsers(prev => prev.filter(u => u.id !== id));
  }, []);

  // Auth
  const login = useCallback(async (username: string, password: string, rememberMe?: boolean) => {
    try {
      const res = await fetch('/api/auth', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password, rememberMe }),
      });
      if (res.ok) {
        const user = await res.json();
        setCurrentUserId(user.id);
        setIsLoggedIn(true);
        // Re-fetch users to ensure the list is up to date
        await fetchUsers();
        return { success: true };
      }
      return { success: false, error: 'Invalid username or password' };
    } catch {
      return { success: false, error: 'Login failed' };
    }
  }, [fetchUsers]);

  const logout = useCallback(async () => {
    await fetch('/api/auth', { method: 'DELETE' });
    setIsLoggedIn(false);
    setCurrentUserId(null);
  }, []);

  // Evaluations
  const addEvaluation = useCallback(async (eval_: Evaluation) => {
    const res = await fetch('/api/evaluations', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(eval_),
    });
    if (res.ok) {
      const created = await res.json();
      setEvaluations(prev => [...prev, created]);
    }
  }, []);

  const updateEvaluation = useCallback(async (eval_: Evaluation) => {
    const res = await fetch(`/api/evaluations/${eval_.id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(eval_),
    });
    if (res.ok) {
      const updated = await res.json();
      setEvaluations(prev => prev.map(e => e.id === updated.id ? updated : e));
    }
  }, []);

  const getEvaluation = useCallback((id: string) => {
    return evaluations.find(e => e.id === id);
  }, [evaluations]);

  const getMyEvaluations = useCallback(() => {
    return evaluations.filter(e => e.employeeId === currentUser.id);
  }, [evaluations, currentUser]);

  const getPendingActions = useCallback(() => {
    if (hasDirectReports) {
      return evaluations.filter(e => e.managerId === currentUser.id && e.status === 'submitted');
    }
    if (currentUser.role === 'admin' || currentUser.role === 'superadmin') {
      return evaluations.filter(e => e.status === 'manager_scored');
    }
    return [];
  }, [evaluations, currentUser, hasDirectReports]);

  const getTeamEvaluations = useCallback(() => {
    if (hasDirectReports || currentUser.role === 'admin' || currentUser.role === 'superadmin') {
      return evaluations;
    }
    return [];
  }, [evaluations, currentUser, hasDirectReports]);

  return (
    <EvaluationContext.Provider value={{
      isLoggedIn,
      currentUser,
      canEvaluateOthers,
      hasDirectReports,
      hasManager,
      users,
      evaluations,
      settings,
      loading,
      login,
      logout,
      addEvaluation,
      updateEvaluation,
      getEvaluation,
      getMyEvaluations,
      getPendingActions,
      getTeamEvaluations,
      addUser,
      updateUser,
      deleteUser,
      plans,
      addPlan,
      updatePlan,
      deletePlan,
      getPlan,
      updateSetting,
      currentView,
      viewParams,
      navigate,
    }}>
      {children}
    </EvaluationContext.Provider>
  );
}

export function useEvaluation() {
  const ctx = useContext(EvaluationContext);
  if (!ctx) throw new Error('useEvaluation must be used within EvaluationProvider');
  return ctx;
}
