'use client';

import { useState, useRef, useEffect } from 'react';
import { useEvaluation, AppNotification } from '@/context/EvaluationContext';
import { Button } from '@/components/ui/button';
import { Bell, Check, CheckCheck, FileText, ClipboardList, X } from 'lucide-react';

// Map notification type to icon and color
function getNotificationStyle(type: string) {
  if (type.startsWith('kpi_')) {
    if (type.includes('rejected')) return { icon: FileText, color: 'text-destructive', bg: 'bg-destructive/10' };
    if (type.includes('approved')) return { icon: FileText, color: 'text-success', bg: 'bg-success/10' };
    return { icon: FileText, color: 'text-info', bg: 'bg-info/10' };
  }
  // eval_
  if (type.includes('rejected')) return { icon: ClipboardList, color: 'text-destructive', bg: 'bg-destructive/10' };
  if (type.includes('approved')) return { icon: ClipboardList, color: 'text-success', bg: 'bg-success/10' };
  return { icon: ClipboardList, color: 'text-info', bg: 'bg-info/10' };
}

function formatTimeAgo(dateStr: string) {
  const date = new Date(dateStr);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  if (diffMins < 1) return 'Just now';
  if (diffMins < 60) return `${diffMins}m ago`;
  const diffHours = Math.floor(diffMins / 60);
  if (diffHours < 24) return `${diffHours}h ago`;
  const diffDays = Math.floor(diffHours / 24);
  if (diffDays < 7) return `${diffDays}d ago`;
  return date.toLocaleDateString();
}

export function NotificationBell() {
  const { notifications, unreadCount, markNotificationRead, markAllNotificationsRead, navigate } = useEvaluation();
  const [open, setOpen] = useState(false);
  const panelRef = useRef<HTMLDivElement>(null);
  const bellRef = useRef<HTMLButtonElement>(null);

  // Close panel when clicking outside
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (open && panelRef.current && bellRef.current &&
        !panelRef.current.contains(e.target as Node) &&
        !bellRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [open]);

  const handleNotificationClick = (n: AppNotification) => {
    if (!n.read) markNotificationRead(n.id);
    // Navigate to the related entity
    if (n.entityType === 'plan') {
      navigate('/setup-kpi/edit', { id: n.entityId });
    } else if (n.entityType === 'evaluation') {
      navigate('/evaluation', { id: n.entityId });
    }
    setOpen(false);
  };

  return (
    <div className="relative">
      <Button
        ref={bellRef}
        variant="ghost"
        size="icon"
        className="relative h-9 w-9"
        onClick={() => setOpen(!open)}
        aria-label={`Notifications${unreadCount > 0 ? ` (${unreadCount} unread)` : ''}`}
      >
        <Bell className="h-4 w-4" />
        {unreadCount > 0 && (
          <span className="absolute -top-0.5 -right-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-destructive px-1 text-[10px] font-bold text-destructive-foreground">
            {unreadCount > 99 ? '99+' : unreadCount}
          </span>
        )}
      </Button>

      {open && (
        <div
          ref={panelRef}
          className="absolute right-0 top-full mt-2 w-80 sm:w-96 rounded-lg border bg-card shadow-lg z-50 overflow-hidden"
        >
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 border-b bg-muted/30">
            <h3 className="text-sm font-semibold">Notifications</h3>
            <div className="flex items-center gap-1">
              {unreadCount > 0 && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-7 text-xs text-muted-foreground hover:text-foreground"
                  onClick={markAllNotificationsRead}
                >
                  <CheckCheck className="h-3.5 w-3.5 mr-1" />
                  Mark all read
                </Button>
              )}
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7"
                onClick={() => setOpen(false)}
              >
                <X className="h-3.5 w-3.5" />
              </Button>
            </div>
          </div>

          {/* Notification list */}
          <div className="max-h-96 overflow-y-auto">
            {notifications.length === 0 ? (
              <div className="py-8 text-center">
                <Bell className="h-8 w-8 text-muted-foreground/40 mx-auto mb-2" />
                <p className="text-sm text-muted-foreground">No notifications yet</p>
              </div>
            ) : (
              notifications.map(n => {
                const style = getNotificationStyle(n.type);
                const Icon = style.icon;
                return (
                  <div
                    key={n.id}
                    className={`flex items-start gap-3 px-4 py-3 border-b last:border-0 cursor-pointer transition-colors hover:bg-muted/50 ${!n.read ? 'bg-primary/5' : ''}`}
                    onClick={() => handleNotificationClick(n)}
                  >
                    {/* Unread dot + icon */}
                    <div className="relative shrink-0 mt-0.5">
                      <div className={`p-1.5 rounded-full ${style.bg}`}>
                        <Icon className={`h-3.5 w-3.5 ${style.color}`} />
                      </div>
                      {!n.read && (
                        <span className="absolute -top-0.5 -left-0.5 h-2 w-2 rounded-full bg-primary" />
                      )}
                    </div>

                    {/* Content */}
                    <div className="flex-1 min-w-0">
                      <p className={`text-sm leading-snug ${!n.read ? 'font-medium' : 'text-foreground'}`}>
                        {n.title}
                      </p>
                      <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">
                        {n.message}
                      </p>
                      <p className="text-[10px] text-muted-foreground/70 mt-1">
                        {formatTimeAgo(n.createdAt)}
                      </p>
                    </div>

                    {/* Mark as read */}
                    {!n.read && (
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-6 w-6 shrink-0 mt-0.5 text-muted-foreground hover:text-foreground"
                        onClick={(e) => {
                          e.stopPropagation();
                          markNotificationRead(n.id);
                        }}
                        aria-label="Mark as read"
                      >
                        <Check className="h-3 w-3" />
                      </Button>
                    )}
                  </div>
                );
              })
            )}
          </div>

          {/* Footer */}
          {notifications.length > 0 && (
            <div className="px-4 py-2 border-t bg-muted/20 text-center">
              <p className="text-[10px] text-muted-foreground">
                {unreadCount > 0 ? `${unreadCount} unread` : 'All caught up!'}
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
