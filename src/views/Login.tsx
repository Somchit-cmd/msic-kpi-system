'use client';

import { useState } from 'react';
import { useEvaluation } from '@/context/EvaluationContext';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { LogIn, AlertCircle, Eye, EyeOff } from 'lucide-react';

const demoCredentials = [
  { label: 'Employee', username: 'sarah.johnson', password: 'employee123' },
  { label: 'Employee (Evaluator)', username: 'james.wilson', password: 'employee123' },
  { label: 'Manager', username: 'michael.chen', password: 'manager123' },
  { label: 'President', username: 'robert.tanaka', password: 'president123' },
  { label: 'HR Admin', username: 'lisa.park', password: 'hradmin123' },
  { label: 'System Admin', username: 'david.kim', password: 'sysadmin123' },
];

export default function Login() {
  const { login, navigate } = useEvaluation();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (!username.trim() || !password) {
      setError('Please enter username and password');
      return;
    }
    setSubmitting(true);
    const result = await login(username, password);
    setSubmitting(false);
    if (result.success) {
      navigate('/');
    } else {
      setError(result.error ?? 'Login failed');
    }
  };

  const fillDemo = (u: string, p: string) => {
    setUsername(u);
    setPassword(p);
    setError('');
  };

  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center p-6">
      <div className="w-full max-w-md space-y-6">
        <div className="text-center space-y-2">
          <h1 className="text-3xl font-bold text-foreground tracking-tight">
            KPI Evaluation System
          </h1>
          <p className="text-muted-foreground">Sign in to your account</p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <LogIn className="h-5 w-5" />
              Sign In
            </CardTitle>
            <CardDescription>Enter your username and password</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              {error && (
                <Alert variant="destructive">
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              )}
              <div className="space-y-2">
                <Label htmlFor="username">Username</Label>
                <Input
                  id="username"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="e.g. sarah.johnson"
                  autoComplete="username"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="password">Password</Label>
                <div className="relative">
                  <Input
                    id="password"
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Enter your password"
                    autoComplete="current-password"
                    className="pr-10"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((s) => !s)}
                    className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground p-1"
                    aria-label={showPassword ? 'Hide password' : 'Show password'}
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>
              <Button type="submit" className="w-full" disabled={submitting}>{submitting ? 'Signing in...' : 'Sign In'}</Button>
            </form>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm">Demo Accounts</CardTitle>
            <CardDescription className="text-xs">Click to autofill credentials</CardDescription>
          </CardHeader>
          <CardContent className="space-y-2">
            {demoCredentials.map((d) => (
              <button
                key={d.username}
                type="button"
                onClick={() => fillDemo(d.username, d.password)}
                className="w-full text-left p-2 rounded-md border border-border hover:border-primary/40 hover:bg-muted/50 transition-colors"
              >
                <div className="flex justify-between items-center">
                  <span className="text-sm font-medium">{d.label}</span>
                  <span className="text-xs text-muted-foreground font-mono">{d.username}</span>
                </div>
              </button>
            ))}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
