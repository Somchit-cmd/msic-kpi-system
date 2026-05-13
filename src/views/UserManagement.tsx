'use client';

import { useState } from 'react';
import { useEvaluation } from '@/context/EvaluationContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Badge } from '@/components/ui/badge';
import { Role, User } from '@/types/evaluation';
import { Pencil, Trash2, UserPlus, Shield, ShieldCheck, ShieldAlert, User as UserIcon, Search } from 'lucide-react';
import { toast } from 'sonner';

const roleLabels: Record<Role, string> = {
  employee: 'Employee',
  admin: 'HR Admin',
  superadmin: 'System Admin',
};

const roleVariants: Record<Role, 'default' | 'secondary' | 'outline' | 'destructive'> = {
  employee: 'secondary',
  admin: 'outline',
  superadmin: 'destructive',
};

const roleIcons: Record<Role, typeof Shield> = {
  employee: UserIcon,
  admin: ShieldCheck,
  superadmin: ShieldAlert,
};

interface UserFormState {
  id: string;
  name: string;
  title: string;
  department: string;
  role: Role;
  managerId: string;
  username: string;
  password: string;
  email: string;
  telephone: string;
}

const emptyForm: UserFormState = {
  id: '',
  name: '',
  title: '',
  department: '',
  role: 'employee',
  managerId: '',
  username: '',
  password: '',
  email: '',
  telephone: '',
};

export default function UserManagement() {
  const { currentUser, users, addUser, updateUser, deleteUser, settings } = useEvaluation();
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState<string>('all');
  const [deptFilter, setDeptFilter] = useState<string>('all');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<UserFormState>(emptyForm);
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const isSuperAdmin = currentUser.role === 'superadmin';
  const isHrAdmin = currentUser.role === 'admin';

  if (!isSuperAdmin && !isHrAdmin) {
    return (
      <div className="flex flex-col items-center justify-center py-20">
        <ShieldAlert className="h-12 w-12 text-muted-foreground mb-4" />
        <p className="text-muted-foreground">You don't have access to User Management.</p>
      </div>
    );
  }

  const managers = users.filter(u => u.id !== editingId && u.role === 'employee');

  const filtered = users.filter(u => {
    const matchesSearch =
      u.name.toLowerCase().includes(search.toLowerCase()) ||
      u.title.toLowerCase().includes(search.toLowerCase()) ||
      u.department.toLowerCase().includes(search.toLowerCase());
    const matchesRole = roleFilter === 'all' || u.role === roleFilter;
    const matchesDept = deptFilter === 'all' || u.department === deptFilter;
    return matchesSearch && matchesRole && matchesDept;
  });

  const roleCounts = (Object.keys(roleLabels) as Role[]).map(r => ({
    role: r,
    count: users.filter(u => u.role === r).length,
  }));

  const openCreate = () => {
    setEditingId(null);
    setForm(emptyForm);
    setDialogOpen(true);
  };

  const openEdit = (u: User) => {
    setEditingId(u.id);
    setForm({
      id: u.id,
      name: u.name,
      title: u.title,
      department: u.department,
      role: u.role,
      managerId: u.managerId ?? '',
      username: u.username,
      password: u.password,
      email: u.email,
      telephone: u.telephone,
    });
    setDialogOpen(true);
  };

  const handleSave = () => {
    if (isSuperAdmin && !editingId) {
      // System Admin creating new user — only Name, Role, Username, Password required
      if (!form.name.trim()) {
        toast.error('Missing field', { description: 'Full Name is required.' });
        return;
      }
      if (!form.username.trim()) {
        toast.error('Missing credentials', { description: 'Username is required for login.' });
        return;
      }
      if (!form.password?.trim()) {
        toast.error('Missing credentials', { description: 'Password is required for new users.' });
        return;
      }
      const usernameTaken = users.some(u => u.username.toLowerCase() === form.username.trim().toLowerCase());
      if (usernameTaken) {
        toast.error('Username taken', { description: 'This username is already in use.' });
        return;
      }
      const payload: User = {
        id: `u-${Date.now()}`,
        name: form.name.trim(),
        title: '',
        department: '',
        role: form.role,
        managerId: null,
        username: form.username.trim(),
        password: form.password.trim(),
        email: '',
        telephone: '',
      };
      addUser(payload);
      toast.success('User created', { description: `${payload.name} has been added. HR Admin can complete the profile.` });
      setDialogOpen(false);
      return;
    }

    if (isHrAdmin && editingId) {
      // HR Admin editing user — Name, Department, Job Title, Manager, Contact info
      if (!form.name.trim()) {
        toast.error('Missing field', { description: 'Full Name is required.' });
        return;
      }
      if (!form.department.trim()) {
        toast.error('Missing field', { description: 'Department is required.' });
        return;
      }
      if (!form.title.trim()) {
        toast.error('Missing field', { description: 'Job Title is required.' });
        return;
      }
      if (form.email.trim() && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email.trim())) {
        toast.error('Invalid email', { description: 'Please enter a valid email address.' });
        return;
      }
      const payload: User = {
        id: editingId,
        name: form.name.trim(),
        title: form.title.trim(),
        department: form.department.trim(),
        role: form.role, // keep existing role
        managerId: form.role === 'employee' && form.managerId ? form.managerId : null,
        username: form.username, // keep existing username
        password: undefined, // don't change password
        email: form.email.trim(),
        telephone: form.telephone.trim(),
      };
      updateUser(payload);
      toast.success('Profile updated', { description: `${payload.name}'s profile has been updated.` });
      setDialogOpen(false);
      return;
    }

    if (isSuperAdmin && editingId) {
      // System Admin editing user — same as create: Name, Role, Username, Password
      if (!form.name.trim()) {
        toast.error('Missing field', { description: 'Full Name is required.' });
        return;
      }
      if (!form.username.trim()) {
        toast.error('Missing credentials', { description: 'Username is required.' });
        return;
      }
      const usernameTaken = users.some(u => u.username.toLowerCase() === form.username.trim().toLowerCase() && u.id !== editingId);
      if (usernameTaken) {
        toast.error('Username taken', { description: 'This username is already in use.' });
        return;
      }
      const existingUser = users.find(u => u.id === editingId);
      const payload: User = {
        id: editingId,
        name: form.name.trim(),
        title: existingUser?.title ?? '', // keep existing — managed by HR Admin
        department: existingUser?.department ?? '', // keep existing — managed by HR Admin
        role: form.role,
        managerId: existingUser?.managerId ?? null, // keep existing — managed by HR Admin
        username: form.username.trim(),
        password: form.password?.trim() || undefined,
        email: existingUser?.email ?? '', // keep existing — managed by HR Admin
        telephone: existingUser?.telephone ?? '', // keep existing — managed by HR Admin
      };
      updateUser(payload);
      toast.success('User updated', { description: `${payload.name} has been updated.` });
      setDialogOpen(false);
    }
  };

  const handleDelete = () => {
    if (!deleteId) return;
    if (deleteId === currentUser.id) {
      toast.error('Cannot delete', { description: 'You cannot delete your own account.' });
      setDeleteId(null);
      return;
    }
    const u = users.find(x => x.id === deleteId);
    deleteUser(deleteId);
    toast.success('User deleted', { description: `${u?.name ?? 'User'} has been removed.` });
    setDeleteId(null);
  };

  const departmentOptions = settings.departments.length > 0 ? settings.departments : [...new Set(users.map(u => u.department).filter(Boolean))];
  const formDeptTitles = settings.jobTitles[form.department] || [];
  const hasDeptTitles = Object.keys(settings.jobTitles).length > 0 && formDeptTitles.length > 0;
  const fallbackTitles = [...new Set(users.filter(u => u.department === form.department).map(u => u.title).filter(Boolean))];
  const titleOptions = hasDeptTitles ? formDeptTitles : (form.department ? fallbackTitles : [...new Set(users.map(u => u.title).filter(Boolean))]);

  // Check if user profile is incomplete (missing department/title)
  const isIncomplete = (u: User) => !u.department || !u.title;

  return (
    <div className="space-y-6 w-full">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground">User Management</h1>
          <p className="text-muted-foreground mt-1">
            {isSuperAdmin
              ? 'Create user accounts and manage login credentials.'
              : 'Complete user profiles with department, job title, and contact information.'}
          </p>
        </div>
        {isSuperAdmin && (
          <Button onClick={openCreate}>
            <UserPlus className="h-4 w-4" />
            Add User
          </Button>
        )}
      </div>

      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
        {roleCounts.map(({ role, count }) => {
          const Icon = roleIcons[role];
          return (
            <Card key={role}>
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">{roleLabels[role]}</p>
                    <p className="text-3xl font-bold mt-1">{count}</p>
                  </div>
                  <Icon className="h-10 w-10 text-primary opacity-80" />
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">All Users</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-wrap gap-3">
            <div className="relative flex-1 min-w-[200px]">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search by name, title, or department"
                value={search}
                onChange={e => setSearch(e.target.value)}
                className="pl-9"
              />
            </div>
            <Select value={roleFilter} onValueChange={setRoleFilter}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Filter by role" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Roles</SelectItem>
                {(Object.keys(roleLabels) as Role[]).map(r => (
                  <SelectItem key={r} value={r}>{roleLabels[r]}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={deptFilter} onValueChange={setDeptFilter}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Filter by dept" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Departments</SelectItem>
                {departmentOptions.map(d => (
                  <SelectItem key={d} value={d}>{d}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b text-left text-muted-foreground">
                  <th className="pb-2 font-medium">Name</th>
                  <th className="pb-2 font-medium">Username</th>
                  <th className="pb-2 font-medium">Email</th>
                  <th className="pb-2 font-medium">Telephone</th>
                  <th className="pb-2 font-medium">Role</th>
                  <th className="pb-2 font-medium">Evaluator</th>
                  <th className="pb-2 font-medium text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map(u => {
                  const mgr = users.find(m => m.id === u.managerId);
                  return (
                    <tr key={u.id} className="border-b last:border-0 hover:bg-muted/50 transition-colors">
                      <td className="py-3">
                        <div className="flex items-center gap-3">
                          <div className="h-8 w-8 rounded-full bg-primary flex items-center justify-center text-primary-foreground text-xs font-semibold">
                            {u.name.split(' ').map(n => n[0]).join('')}
                          </div>
                          <div className="flex flex-col">
                            <span className="font-medium">{u.name}</span>
                            <span className="text-xs text-muted-foreground">
                              {u.title && u.department ? `${u.title} · ${u.department}` : (
                                <span className="text-amber-600">Profile incomplete</span>
                              )}
                            </span>
                          </div>
                        </div>
                      </td>
                      <td className="py-3 font-mono text-xs">{u.username}</td>
                      <td className="py-3 text-muted-foreground">{u.email || '—'}</td>
                      <td className="py-3 text-muted-foreground">{u.telephone || '—'}</td>
                      <td className="py-3">
                        <div className="flex items-center gap-2">
                          <Badge variant={roleVariants[u.role]}>{roleLabels[u.role]}</Badge>
                          {u.role === 'employee' && users.some(t => t.managerId === u.id) && (
                            <Badge variant="outline" className="text-xs">Evaluator</Badge>
                          )}
                        </div>
                      </td>
                      <td className="py-3 text-muted-foreground">{mgr?.name ?? '—'}</td>
                      <td className="py-3 text-right">
                        <div className="flex justify-end gap-1">
                          {/* HR Admin can edit any employee; System Admin can always edit */}
                          {(isHrAdmin || isSuperAdmin) && (
                            <Button variant="ghost" size="icon" onClick={() => openEdit(u)}>
                              <Pencil className="h-4 w-4" />
                            </Button>
                          )}
                          {isSuperAdmin && (
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => setDeleteId(u.id)}
                              disabled={u.id === currentUser.id}
                              className="text-destructive hover:text-destructive"
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
                {filtered.length === 0 && (
                  <tr>
                    <td colSpan={7} className="py-8 text-center text-muted-foreground">
                      No users found.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {editingId
                ? isHrAdmin ? 'Edit User Profile' : 'Edit User'
                : 'Add New User'}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">

            {/* ===== FULL NAME — always shown ===== */}
            <div className="space-y-2">
              <Label>Full Name <span className="text-destructive">*</span></Label>
              <Input value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} placeholder="Enter full name" />
            </div>

            {/* ===== SYSTEM ADMIN: Role + Login Credentials ===== */}
            {isSuperAdmin && (
              <>
                <div className="space-y-2">
                  <Label>Role <span className="text-destructive">*</span></Label>
                  <Select value={form.role} onValueChange={(v: Role) => setForm({ ...form, role: v })}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {(Object.keys(roleLabels) as Role[]).map(r => (
                        <SelectItem key={r} value={r}>{roleLabels[r]}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="border-t pt-4 space-y-4">
                  <h3 className="text-sm font-semibold text-foreground">Login Credentials</h3>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-2">
                      <Label>Username <span className="text-destructive">*</span></Label>
                      <Input
                        value={form.username}
                        onChange={e => setForm({ ...form, username: e.target.value })}
                        placeholder="e.g. john.doe"
                        autoComplete="off"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Password {!editingId && <span className="text-destructive">*</span>}</Label>
                      <Input
                        type="password"
                        value={form.password || ''}
                        onChange={e => setForm({ ...form, password: e.target.value })}
                        placeholder={editingId ? 'Leave blank to keep current' : 'Set password'}
                        autoComplete="new-password"
                      />
                    </div>
                  </div>
                  {editingId && (
                    <p className="text-xs text-muted-foreground">Leave password blank to keep the current password unchanged.</p>
                  )}
                </div>

                {editingId && (
                  <div className="border-t pt-4">
                    <p className="text-xs text-muted-foreground">
                      Department, Job Title, and Contact Info are managed by HR Admin.
                    </p>
                  </div>
                )}
              </>
            )}

            {/* ===== HR ADMIN: Department, Job Title, Manager, Contact Info ===== */}
            {isHrAdmin && (
              <>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-2">
                    <Label>Department <span className="text-destructive">*</span></Label>
                    {departmentOptions.length > 0 ? (
                      <Select value={form.department || undefined} onValueChange={v => setForm({ ...form, department: v, title: '' })}>
                        <SelectTrigger><SelectValue placeholder="Select department" /></SelectTrigger>
                        <SelectContent>
                          {departmentOptions.map(d => <SelectItem key={d} value={d}>{d}</SelectItem>)}
                        </SelectContent>
                      </Select>
                    ) : (
                      <Input value={form.department} onChange={e => setForm({ ...form, department: e.target.value, title: '' })} placeholder="Enter department" />
                    )}
                  </div>
                  <div className="space-y-2">
                    <Label>Job Title <span className="text-destructive">*</span></Label>
                    {titleOptions.length > 0 ? (
                      <Select value={form.title || undefined} onValueChange={v => setForm({ ...form, title: v })}>
                        <SelectTrigger><SelectValue placeholder="Select title" /></SelectTrigger>
                        <SelectContent>
                          {titleOptions.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}
                        </SelectContent>
                      </Select>
                    ) : (
                      <Input value={form.title} onChange={e => setForm({ ...form, title: e.target.value })} placeholder={form.department ? 'Enter title' : 'Select department first'} />
                    )}
                  </div>
                </div>

                {form.role === 'employee' && (
                  <div className="space-y-2">
                    <Label>Evaluator</Label>
                    <Select value={form.managerId || undefined} onValueChange={v => setForm({ ...form, managerId: v })}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select an evaluator" />
                      </SelectTrigger>
                      <SelectContent>
                        {managers.map(m => (
                          <SelectItem key={m.id} value={m.id}>{m.name} ({m.title || 'No title'})</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}

                <div className="border-t pt-4 space-y-4">
                  <h3 className="text-sm font-semibold text-foreground">Contact Info</h3>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-2">
                      <Label>Email</Label>
                      <Input
                        type="email"
                        value={form.email}
                        onChange={e => setForm({ ...form, email: e.target.value })}
                        placeholder="user@company.com"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Telephone</Label>
                      <Input
                        type="tel"
                        value={form.telephone}
                        onChange={e => setForm({ ...form, telephone: e.target.value })}
                        placeholder="+1-555-0100"
                      />
                    </div>
                  </div>
                </div>

                <div className="border-t pt-4">
                  <p className="text-xs text-muted-foreground">
                    Role and login credentials are managed by System Admin.
                  </p>
                </div>
              </>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleSave}>
              {editingId ? 'Save Changes' : 'Create User'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!deleteId} onOpenChange={o => !o && setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete user?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. The user will be permanently removed from the system.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
