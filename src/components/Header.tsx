import { Bell, LogOut, Search } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import { useState } from 'react';
import { mockItems } from '@/data/mockData';
import { cn } from '@/lib/utils';

interface HeaderProps {
  title: string;
}

export function Header({ title }: HeaderProps) {
  const { logout, user } = useAuth();
  const navigate = useNavigate();
  const [search, setSearch] = useState('');
  const [results, setResults] = useState(mockItems.slice(0, 0));
  const [focused, setFocused] = useState(false);

  const handleSearch = (val: string) => {
    setSearch(val);
    if (val.trim().length > 1) {
      setResults(
        mockItems.filter(
          i => i.name.toLowerCase().includes(val.toLowerCase())
            || i.barcode.toLowerCase().includes(val.toLowerCase())
        ).slice(0, 5)
      );
    } else {
      setResults([]);
    }
  };

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <header className="sticky top-0 z-10 flex h-14 items-center gap-4 border-b border-border bg-card/80 px-6 backdrop-blur-sm">
      <h1 className="text-sm font-semibold text-foreground flex-shrink-0">{title}</h1>

      {/* Barcode / Search */}
      <div className="relative flex-1 max-w-sm ml-auto">
        <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
        <input
          className="input-search pl-8 h-8"
          placeholder="Buscar por nome ou código..."
          value={search}
          onChange={e => handleSearch(e.target.value)}
          onFocus={() => setFocused(true)}
          onBlur={() => setTimeout(() => setFocused(false), 150)}
        />
        {focused && results.length > 0 && (
          <div className="absolute top-full mt-1 w-full rounded-md border border-border bg-card shadow-lg z-50 overflow-hidden">
            {results.map(item => (
              <button
                key={item.id}
                className="w-full flex items-center gap-3 px-3 py-2 hover:bg-muted text-left text-sm"
                onClick={() => { navigate(`/items/${item.id}`); setSearch(''); setResults([]); }}
              >
                <span className="font-mono text-xs text-muted-foreground">{item.barcode}</span>
                <span className="truncate">{item.name}</span>
                <span className={cn(
                  'ml-auto text-xs font-medium shrink-0',
                  item.quantity <= item.minQuantity ? 'text-destructive' : 'text-success'
                )}>
                  {item.quantity} un
                </span>
              </button>
            ))}
          </div>
        )}
      </div>

      <div className="flex items-center gap-2">
        <button className="h-8 w-8 flex items-center justify-center rounded-md text-muted-foreground hover:bg-muted hover:text-foreground transition-colors">
          <Bell className="h-4 w-4" />
        </button>
        <button
          onClick={handleLogout}
          className="h-8 flex items-center gap-2 px-3 rounded-md text-sm text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
          title="Sair"
        >
          <LogOut className="h-4 w-4" />
          <span className="hidden sm:inline text-xs">Sair</span>
        </button>
      </div>
    </header>
  );
}
