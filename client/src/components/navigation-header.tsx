import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import type { User } from "@/lib/types";

interface NavigationHeaderProps {
  user: User;
}

export default function NavigationHeader({ user }: NavigationHeaderProps) {
  const getRoleBadgeColor = (role: string) => {
    switch (role) {
      case "manager":
        return "bg-primary text-primary-foreground";
      case "supervisor":
        return "bg-orange-500 text-white";
      case "housekeeper":
        return "bg-green-500 text-white";
      default:
        return "bg-secondary text-secondary-foreground";
    }
  };

  const getRoleText = (role: string) => {
    switch (role) {
      case "manager":
        return "Gerente";
      case "supervisor":
        return "Supervisor";
      case "housekeeper":
        return "Camareira";
      default:
        return role;
    }
  };

  return (
    <header className="bg-card border-b border-border sticky top-0 z-50 shadow-sm">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          <div className="flex items-center space-x-4">
            <i className="fas fa-hotel text-primary text-2xl" data-testid="logo-icon"></i>
            <h1 className="text-xl font-bold text-foreground" data-testid="app-title">
              Governança Hoteleira
            </h1>
          </div>
          
          <div className="flex items-center space-x-4">
            {/* User Role Indicator */}
            <div className="flex items-center space-x-2">
              <span className="text-sm text-muted-foreground">Usuário:</span>
              <Badge 
                className={`${getRoleBadgeColor(user.role)} font-medium`}
                data-testid="user-role-badge"
              >
                {getRoleText(user.role)}
              </Badge>
            </div>
            
            {/* Notifications */}
            <Button 
              variant="ghost" 
              size="icon" 
              className="relative text-muted-foreground hover:text-foreground"
              data-testid="notifications-button"
            >
              <i className="fas fa-bell text-lg"></i>
              <span className="absolute -top-1 -right-1 bg-destructive text-destructive-foreground text-xs rounded-full h-5 w-5 flex items-center justify-center">
                3
              </span>
            </Button>
            
            {/* User Menu */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button 
                  variant="ghost" 
                  className="flex items-center space-x-2 p-2"
                  data-testid="user-menu-trigger"
                >
                  <div className="w-8 h-8 bg-primary text-primary-foreground rounded-full flex items-center justify-center">
                    <i className="fas fa-user text-sm"></i>
                  </div>
                  <span className="hidden sm:block text-sm font-medium" data-testid="user-name">
                    {user.name}
                  </span>
                  <i className="fas fa-chevron-down text-xs"></i>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem data-testid="menu-profile">
                  <i className="fas fa-user mr-2"></i>
                  Perfil
                </DropdownMenuItem>
                <DropdownMenuItem data-testid="menu-settings">
                  <i className="fas fa-cog mr-2"></i>
                  Configurações
                </DropdownMenuItem>
                <DropdownMenuItem data-testid="menu-logout">
                  <i className="fas fa-sign-out-alt mr-2"></i>
                  Sair
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </div>
    </header>
  );
}
