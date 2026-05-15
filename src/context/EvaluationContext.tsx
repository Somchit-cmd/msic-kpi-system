'use client';

// Context for evaluation state management — powered by Supabase PostgreSQL via API
import React, { createContext, useContext, useState, useCallback, useEffect, useRef } from 'react';
import { Evaluation, User, Role, KpiPlan, AppSettings, isLeadershipRole } from '@/types/evaluation';

// Notification type definition
export interface AppNotification {
  id: string;
  recipientId: string;
  type: string;
  title: string;
  message: string;
  entityType: string;  // 'plan' | 'evaluation'
  entityId: string;
  read: boolean;
  createdAt: string;
}

export type NotificationType =
  | 'kpi_submitted'        // Employee submitted KPI → notify manager
  | 'kpi_approved'         // Manager approved KPI → notify employee
  | 'kpi_rejected'         // Manager rejected KPI → notify employee
  | 'kpi_hr_approved'      // HR approved KPI → notify employee
  | 'kpi_hr_rejected'      // HR rejected KPI → notify employee
  | 'kpi_manager_approved' // Manager approved KPI → notify HR
  | 'eval_submitted'       // Employee submitted eval → notify manager
  | 'eval_scored'          // Manager scored eval → notify employee + HR
  | 'eval_hr_approved'     // HR approved eval → notify employee
  | 'eval_hr_rejected';    // HR rejected eval → notify employee

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
  notifications: AppNotification[];
  unreadCount: number;
  fetchNotifications: (overrideUserId?: string) => Promise<void>;
  pushNotification: (n: Omit<AppNotification, 'id' | 'read' | 'createdAt'>) => Promise<void>;
  markNotificationRead: (id: string) => Promise<void>;
  markAllNotificationsRead: () => Promise<void>;
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
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [loading, setLoading] = useState(true);

  // Ref to track currentUserId for polling without re-creating interval
  const userIdRef = useRef<string | null>(null);

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

  // Fetch notifications — accepts optional overrideUserId to avoid closure staleness
  const fetchNotifications = useCallback(async (overrideUserId?: string) => {
    const uid = overrideUserId || userIdRef.current;
    if (!uid) return;
    try {
      const res = await fetch(`/api/notifications?recipientId=${uid}`);
      if (res.ok) setNotifications(await res.json());
    } catch (e) { console.error('Failed to fetch notifications', e); }
  }, []);

  // Internal helper to set user and sync ref
  const setUserSession = useCallback((userId: string) => {
    setCurrentUserId(userId);
    userIdRef.current = userId;
    setIsLoggedIn(true);
  }, []);

  // Restore session from cookie on mount
  const restoreSession = useCallback(async () => {
    try {
      const res = await fetch('/api/auth');
      if (res.ok) {
        const user = await res.json();
        setUserSession(user.id);
        return user.id; // Return userId for chaining
      }
    } catch (e) { console.error('Failed to restore session', e); }
    return null;
  }, [setUserSession]);

  // Initial data load — restore session then fetch from API
  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      const userId = await restoreSession();
      await Promise.all([
        fetchUsers(),
        fetchEvaluations(),
        fetchPlans(),
        fetchSettings(),
        // Fetch notifications with the userId we just got
        userId ? fetchNotifications(userId) : Promise.resolve(),
      ]);
      if (!cancelled) setLoading(false);
    })();
    return () => { cancelled = true; };
  }, [restoreSession, fetchUsers, fetchEvaluations, fetchPlans, fetchSettings, fetchNotifications]);

  // Poll notifications every 30s when logged in
  useEffect(() => {
    if (!currentUserId) return;
    const interval = setInterval(() => fetchNotifications(), 30000);
    return () => clearInterval(interval);
  }, [currentUserId, fetchNotifications]);

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
        setUserSession(user.id);
        // Re-fetch users and notifications with the new userId
        await Promise.all([
          fetchUsers(),
          fetchNotifications(user.id),
        ]);
        return { success: true };
      }
      return { success: false, error: 'Invalid username or password' };
    } catch {
      return { success: false, error: 'Login failed' };
    }
  }, [fetchUsers, fetchNotifications, setUserSession]);

  const logout = useCallback(async () => {
    await fetch('/api/auth', { method: 'DELETE' });
    setIsLoggedIn(false);
    setCurrentUserId(null);
    userIdRef.current = null;
    setNotifications([]);
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

  // Notifications
  const unreadCount = notifications.filter(n => !n.read).length;

  const pushNotification = useCallback(async (n: Omit<AppNotification, 'id' | 'read' | 'createdAt'>) => {
    try {
      const res = await fetch('/api/notifications', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(n),
      });
      if (res.ok) {
        const created = await res.json();
        setNotifications(prev => [created, ...prev]);
      }
    } catch (e) { console.error('Failed to push notification', e); }
  }, []);

  const markNotificationRead = useCallback(async (id: string) => {
    try {
      const res = await fetch(`/api/notifications/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ read: true }),
      });
      if (res.ok) {
        setNotifications(prev => prev.map(n => n.id === id ? { ...n, read: true } : n));
      }
    } catch (e) { console.error('Failed to mark notification read', e); }
  }, []);

  const markAllNotificationsRead = useCallback(async () => {
    const uid = userIdRef.current;
    if (!uid) return;
    try {
      const res = await fetch(`/api/notifications/read-all?recipientId=${uid}`, { method: 'PUT' });
      if (res.ok) {
        setNotifications(prev => prev.map(n => ({ ...n, read: true })));
      }
    } catch (e) { console.error('Failed to mark all notifications read', e); }
  }, []);

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
      notifications,
      unreadCount,
      fetchNotifications,
      pushNotification,
      markNotificationRead,
      markAllNotificationsRead,
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
