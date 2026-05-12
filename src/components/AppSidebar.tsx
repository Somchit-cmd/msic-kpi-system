'use client';

import { LayoutDashboard, Settings2, FileText, CalendarRange, Users, ClipboardList, ChevronDown, LogOut, Shield, Wrench } from 'lucide-react';
import { useEvaluation } from '@/context/EvaluationContext';
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarFooter,
  useSidebar,
} from '@/components/ui/sidebar';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Role } from '@/types/evaluation';
import { cn } from '@/lib/utils';

const baseNavItems = [
  { title: 'Dashboard', url: '/', icon: LayoutDashboard },
  { title: 'Setup KPI', url: '/setup-kpi', icon: Settings2 },
  { title: 'Performance Reviews', url: '/performance-reviews', icon: FileText },
  { title: 'Quarterly Reviews', url: '/quarterly-reviews', icon: CalendarRange },
  { title: 'Team', url: '/team', icon: Users },
];

const superAdminNavItems = [
  { title: 'Dashboard', url: '/', icon: LayoutDashboard },
  { title: 'Team', url: '/team', icon: Users },
  { title: 'User Management', url: '/users', icon: Shield },
  { title: 'Settings', url: '/settings', icon: Wrench },
];

// President sees same nav as manager (no Team nav item needed separately — they see Team via their evaluator role)
const presidentNavItems = [
  { title: 'Dashboard', url: '/', icon: LayoutDashboard },
  { title: 'Setup KPI', url: '/setup-kpi', icon: Settings2 },
  { title: 'Performance Reviews', url: '/performance-reviews', icon: FileText },
  { title: 'Quarterly Reviews', url: '/quarterly-reviews', icon: CalendarRange },
  { title: 'Team', url: '/team', icon: Users },
];

export function AppSidebar() {
  const { state } = useSidebar();
  const collapsed = state === 'collapsed';
  const { currentUser, setCurrentRole, logout, navigate, currentView } = useEvaluation();

  const navItems = currentUser.role === 'superadmin'
    ? superAdminNavItems
    : currentUser.role === 'president'
      ? presidentNavItems
      : baseNavItems.filter(item => {
          // Hide Team for regular employees (non-evaluator)
          if (item.url === '/team' && currentUser.role === 'employee' && !currentUser.canEvaluate) return false;
          return true;
        });

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  const roleLabels: Record<Role, string> = {
    employee: 'Employee',
    manager: 'Manager',
    president: 'President',
    admin: 'HR Admin',
    superadmin: 'System Admin',
  };

  return (
    <Sidebar collapsible="icon" className="border-r-0">
      <SidebarContent className="bg-sidebar">
        <SidebarGroup>
          <SidebarGroupLabel className="text-sidebar-foreground/60 text-xs uppercase tracking-wider px-3 mb-1">
            {!collapsed && (
              <div className="flex items-center gap-2 py-4">
                <ClipboardList className="h-6 w-6 text-sidebar-primary" />
                <span className="font-bold text-lg text-sidebar-foreground">KPI System</span>
              </div>
            )}
            {collapsed && <ClipboardList className="h-6 w-6 text-sidebar-primary mx-auto" />}
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {navItems.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton asChild>
                    <button
                      onClick={() => navigate(item.url)}
                      className={cn(
                        'flex items-center gap-3 px-3 py-2.5 rounded-md text-sidebar-foreground/80 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground transition-colors w-full',
                        currentView === item.url && 'bg-sidebar-accent text-sidebar-primary font-medium'
                      )}
                    >
                      <item.icon className="h-4 w-4 shrink-0" />
                      {!collapsed && <span>{item.title}</span>}
                    </button>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter className="bg-sidebar border-t border-sidebar-border">
        {!collapsed && (
          <DropdownMenu>
            <DropdownMenuTrigger className="w-full px-3 py-3 flex items-center gap-3 hover:bg-sidebar-accent rounded-md transition-colors">
              <div className="h-8 w-8 rounded-full bg-sidebar-primary flex items-center justify-center text-sidebar-primary-foreground text-sm font-semibold">
                {currentUser.name.split(' ').map(n => n[0]).join('')}
              </div>
              <div className="flex-1 text-left min-w-0">
                <p className="text-sm font-medium text-sidebar-foreground truncate">{currentUser.name}</p>
                <p className="text-xs text-sidebar-foreground/60 truncate">{currentUser.title}</p>
              </div>
              <ChevronDown className="h-4 w-4 text-sidebar-foreground/40" />
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" className="w-56">
              <DropdownMenuItem onClick={() => setCurrentRole('employee')}>Switch to Employee</DropdownMenuItem>
              <DropdownMenuItem onClick={() => setCurrentRole('manager')}>Switch to Manager</DropdownMenuItem>
              <DropdownMenuItem onClick={() => setCurrentRole('president')}>Switch to President</DropdownMenuItem>
              <DropdownMenuItem onClick={() => setCurrentRole('admin')}>Switch to HR Admin</DropdownMenuItem>
              <DropdownMenuItem onClick={() => setCurrentRole('superadmin')}>Switch to System Admin</DropdownMenuItem>
              <DropdownMenuItem onClick={handleLogout} className="text-destructive focus:text-destructive">
                <LogOut className="h-4 w-4 mr-2" />
                Sign Out
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        )}
      </SidebarFooter>
    </Sidebar>
  );
}
