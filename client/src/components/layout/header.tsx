import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { User, Settings, LogOut, Building2 } from 'lucide-react';

export function Header() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map((n) => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  return (
    <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container flex h-14 items-center">
        <div className="mr-4 flex">
          <Link to="/" className="mr-6 flex items-center space-x-2">
            <span className="font-bold text-xl">Foundry</span>
          </Link>
          <nav className="flex items-center space-x-6 text-sm font-medium">
            <Link
              to="/projects"
              className="transition-colors hover:text-foreground/80 text-foreground/60"
            >
              Projects
            </Link>
            {user?.role === 'admin' && (
              <Link
                to="/settings/team"
                className="transition-colors hover:text-foreground/80 text-foreground/60"
              >
                Team
              </Link>
            )}
            {user?.role === 'admin' && (
              <Link
                to="/audit"
                className="transition-colors hover:text-foreground/80 text-foreground/60"
              >
                Audit Logs
              </Link>
            )}
          </nav>
        </div>
        <div className="flex flex-1 items-center justify-end space-x-2">
          {user && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" className="relative h-8 w-8 rounded-full">
                  <Avatar className="h-8 w-8">
                    <AvatarFallback>{getInitials(user.name)}</AvatarFallback>
                  </Avatar>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent className="w-56" align="end" forceMount>
                <DropdownMenuLabel className="font-normal">
                  <div className="flex flex-col space-y-1">
                    <p className="text-sm font-medium leading-none">{user.name}</p>
                    <p className="text-xs leading-none text-muted-foreground">
                      {user.email}
                    </p>
                  </div>
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => navigate('/settings/profile')}>
                  <User className="mr-2 h-4 w-4" />
                  Profile
                </DropdownMenuItem>
                {user.role === 'admin' && (
                  <DropdownMenuItem onClick={() => navigate('/settings/organization')}>
                    <Building2 className="mr-2 h-4 w-4" />
                    Organization
                  </DropdownMenuItem>
                )}
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={handleLogout}>
                  <LogOut className="mr-2 h-4 w-4" />
                  Log out
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          )}
        </div>
      </div>
    </header>
  );
}
