import { useState } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import {
  LayoutDashboard, Package, Tag, ArrowLeftRight,
  ChevronLeft, ChevronRight, Warehouse, ShieldCheck
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAuth } from '@/contexts/AuthContext';

const navItems = [
  { label: 'Dashboard', to: '/', icon: LayoutDashboard },
  { label: 'Itens', to: '/items', icon: Package },
  { label: 'Categorias', to: '/categories', icon: Tag },
  { label: 'Movimentações', to: '/movements', icon: ArrowLeftRight },
];

const adminItems = [
  { label: 'Usuários', to: '/admin/users', icon: ShieldCheck },
];

export function Sidebar() {
  const [collapsed, setCollapsed] = useState(false);
  const location = useLocation();
  const { user, isAdmin } = useAuth();

  return (
    <aside
      className={cn(
        'flex flex-col shrink-0 h-screen sticky top-0 transition-all duration-300 ease-in-out border-r',
        'border-sidebar-border',
        collapsed ? 'w-16' : 'w-60'
      )}
      style={{ background: 'hsl(var(--sidebar-background))' }}
    >
      {/* Logo */}
      <div className={cn(
        'flex items-center gap-3 px-4 py-4 border-b border-sidebar-border',
        collapsed && 'justify-center px-2'
      )}>
        <div className="shrink-0 flex h-8 w-8 items-center justify-center rounded-md bg-primary">
          <Warehouse className="h-5 w-5 text-primary-foreground" />
        </div>
        {!collapsed && (
          <div className="animate-fade-in">
            <p className="text-sm font-bold text-sidebar-foreground leading-none">Galpão</p>
            <p className="text-xs font-semibold text-primary">Copycentro</p>
          </div>
        )}
      </div>

      {/* Nav */}
      <nav className="flex-1 p-2 space-y-0.5 overflow-y-auto">
        {navItems.map(({ label, to, icon: Icon }) => {
          const isActive = to === '/'
            ? location.pathname === '/'
            : location.pathname.startsWith(to);

          return (
            <NavLink
              key={to}
              to={to}
              className={cn(
                'nav-item',
                isActive && 'active',
                collapsed && 'justify-center px-2'
              )}
              title={collapsed ? label : undefined}
            >
              <Icon className="h-4 w-4 shrink-0" />
              {!collapsed && <span className="animate-fade-in">{label}</span>}
            </NavLink>
          );
        })}

        {/* Admin section */}
        {isAdmin && (
          <>
            {!collapsed && (
              <p className="animate-fade-in px-3 pt-3 pb-1 text-xs font-semibold uppercase tracking-wider text-muted-foreground/60">
                Admin
              </p>
            )}
            {collapsed && <div className="my-2 border-t border-sidebar-border" />}
            {adminItems.map(({ label, to, icon: Icon }) => {
              const isActive = location.pathname.startsWith(to);
              return (
                <NavLink
                  key={to}
                  to={to}
                  className={cn(
                    'nav-item',
                    isActive && 'active',
                    collapsed && 'justify-center px-2'
                  )}
                  title={collapsed ? label : undefined}
                >
                  <Icon className="h-4 w-4 shrink-0" />
                  {!collapsed && <span className="animate-fade-in">{label}</span>}
                </NavLink>
              );
            })}
          </>
        )}
      </nav>

      {/* User + Collapse */}
      <div className="border-t border-sidebar-border p-2 space-y-1">
        {!collapsed && user && (
          <div className="px-3 py-2 animate-fade-in">
            <p className="text-xs font-semibold text-sidebar-foreground truncate">{user.name}</p>
            <p className="text-xs text-muted-foreground truncate">{user.email}</p>
            <span className={cn(
              'mt-1 inline-block text-xs px-1.5 py-0.5 rounded font-medium',
              user.role === 'ADMIN'
                ? 'bg-primary/10 text-primary'
                : 'text-info'
            )}
              style={user.role !== 'ADMIN' ? {
                background: 'hsl(var(--info) / 0.1)',
                color: 'hsl(var(--info))',
              } : {}}>
              {user.role}
            </span>
          </div>
        )}
        <button
          onClick={() => setCollapsed(v => !v)}
          className="w-full nav-item justify-center text-muted-foreground hover:text-foreground"
        >
          {collapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
          {!collapsed && <span className="text-xs ml-1">Recolher</span>}
        </button>
      </div>
    </aside>
  );
}
