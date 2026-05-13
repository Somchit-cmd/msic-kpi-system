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
import { cn } from '@/lib/utils';

export function AppSidebar() {
  const { state } = useSidebar();
  const collapsed = state === 'collapsed';
  const { currentUser, logout, navigate, currentView, hasDirectReports, hasManager } = useEvaluation();

  // Build nav items based on role and org chart position
  const navItems = (() => {
    if (currentUser.role === 'superadmin') {
      return [
        { title: 'Dashboard', url: '/', icon: LayoutDashboard },
        { title: 'Team', url: '/team', icon: Users },
        { title: 'User Management', url: '/users', icon: Shield },
        { title: 'Settings', url: '/settings', icon: Wrench },
      ];
    }

    if (currentUser.role === 'admin') {
      return [
        { title: 'Dashboard', url: '/', icon: LayoutDashboard },
        { title: 'Setup KPI', url: '/setup-kpi', icon: Settings2 },
        { title: 'Performance Reviews', url: '/performance-reviews', icon: FileText },
        { title: 'Quarterly Reviews', url: '/quarterly-reviews', icon: CalendarRange },
        { title: 'Team', url: '/team', icon: Users },
      ];
    }

    // Employee — navigation based on org chart position
    const items = [
      { title: 'Dashboard', url: '/', icon: LayoutDashboard },
    ];

    if (hasManager) {
      items.push({ title: 'Setup KPI', url: '/setup-kpi', icon: Settings2 });
    }

    items.push(
      { title: 'Performance Reviews', url: '/performance-reviews', icon: FileText },
      { title: 'Quarterly Reviews', url: '/quarterly-reviews', icon: CalendarRange },
    );

    if (hasDirectReports) {
      items.push({ title: 'Team', url: '/team', icon: Users });
    }

    return items;
  })();

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  return (
    <Sidebar collapsible="icon" className="border-r-0">
      <SidebarContent className="bg-sidebar">
        <SidebarGroup>
          <SidebarGroupLabel className="text-sidebar-foreground/70 text-xs uppercase tracking-wider px-3 mb-1">
            {!collapsed && (
              <div className="flex items-center gap-2 py-4">
                <ClipboardList className="h-6 w-6 text-white" />
                <span className="font-bold text-lg text-white">KPI System</span>
              </div>
            )}
            {collapsed && <ClipboardList className="h-6 w-6 text-white mx-auto" />}
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {navItems.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton asChild>
                    <button
                      onClick={() => navigate(item.url)}
                      className={cn(
                        'flex items-center gap-3 px-3 py-2.5 rounded-md text-white/80 hover:bg-white/15 hover:text-white transition-colors w-full',
                        currentView === item.url && 'bg-white/20 text-white font-medium'
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

      <SidebarFooter className="bg-sidebar border-t border-white/15">
        {!collapsed && (
          <DropdownMenu>
            <DropdownMenuTrigger className="w-full px-3 py-3 flex items-center gap-3 hover:bg-white/15 rounded-md transition-colors">
              <div className="h-8 w-8 rounded-full bg-white/20 flex items-center justify-center text-white text-sm font-semibold">
                {currentUser.name.split(' ').map(n => n[0]).join('')}
              </div>
              <div className="flex-1 text-left min-w-0">
                <p className="text-sm font-medium text-white truncate">{currentUser.name}</p>
                <p className="text-xs text-white/60 truncate">{currentUser.title}</p>
              </div>
              <ChevronDown className="h-4 w-4 text-white/40" />
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" className="w-56">
              <DropdownMenuItem onClick={handleLogout} className="text-destructive focus:bg-red-50 focus:text-destructive dark:focus:bg-red-950">
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
