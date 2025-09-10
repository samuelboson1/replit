import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import NavigationHeader from "@/components/navigation-header";
import RoomCard from "@/components/room-card";
import ChecklistModal from "@/components/checklist-modal";
import ProblemReportModal from "@/components/problem-report-modal";
import TimerWidget from "@/components/timer-widget";
import { useWebSocket } from "@/hooks/use-websocket";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import type { Room, User, CleaningSession } from "@/lib/types";

export default function Dashboard() {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  
  const [selectedRoom, setSelectedRoom] = useState<Room | null>(null);
  const [isChecklistOpen, setIsChecklistOpen] = useState(false);
  const [isProblemModalOpen, setIsProblemModalOpen] = useState(false);
  const [activeTimer, setActiveTimer] = useState<CleaningSession | null>(null);
  const [filter, setFilter] = useState<"all" | "assigned" | "floor">("all");

  // WebSocket connection for real-time updates
  useWebSocket();

  // Fetch rooms based on user role and filter
  const { data: rooms = [], isLoading, refetch } = useQuery({
    queryKey: ["/api/rooms", currentUser?.role === "manager" ? null : currentUser?.id],
    queryFn: async () => {
      if (!currentUser) return [];
      const params = new URLSearchParams();
      if (currentUser.role === "housekeeper") {
        params.append("assignedTo", currentUser.id);
      }
      
      const response = await fetch(`/api/rooms?${params}`);
      if (!response.ok) throw new Error("Failed to fetch rooms");
      return response.json();
    },
    enabled: !!currentUser,
  });

  // Fetch users for assignment
  const { data: users = [] } = useQuery({
    queryKey: ["/api/users"],
    queryFn: async () => {
      const response = await fetch("/api/users");
      if (!response.ok) throw new Error("Failed to fetch users");
      return response.json();
    },
  });

  // Set current user to the first manager if not set
  useEffect(() => {
    if (!currentUser && users.length > 0) {
      const manager = users.find((user: User) => user.role === "manager");
      if (manager) {
        setCurrentUser(manager);
      }
    }
  }, [users, currentUser]);

  // Calculate statistics
  const stats = {
    dirty: rooms.filter((r: Room) => r.status === "dirty").length,
    cleaning: rooms.filter((r: Room) => r.status === "cleaning").length,
    inspection: rooms.filter((r: Room) => r.status === "inspection").length,
    clean: rooms.filter((r: Room) => r.status === "clean").length,
    occupied: rooms.filter((r: Room) => r.status === "occupied").length,
  };

  const handleOpenChecklist = (room: Room) => {
    setSelectedRoom(room);
    setIsChecklistOpen(true);
  };

  const handleOpenProblemReport = (room: Room) => {
    setSelectedRoom(room);
    setIsProblemModalOpen(true);
  };

  const handleTimerUpdate = (session: CleaningSession | null) => {
    setActiveTimer(session);
    refetch();
  };

  if (isLoading || !currentUser) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Carregando dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <NavigationHeader user={currentUser} />
      
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        
        {/* Dashboard Statistics */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-8">
          <Card className="border shadow-sm">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Sujos</p>
                  <p className="text-2xl font-bold text-red-600" data-testid="stats-dirty">{stats.dirty}</p>
                </div>
                <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center">
                  <i className="fas fa-exclamation-triangle text-red-600"></i>
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card className="border shadow-sm">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Em Limpeza</p>
                  <p className="text-2xl font-bold text-yellow-600" data-testid="stats-cleaning">{stats.cleaning}</p>
                </div>
                <div className="w-12 h-12 bg-yellow-100 rounded-full flex items-center justify-center">
                  <i className="fas fa-clock text-yellow-600"></i>
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card className="border shadow-sm">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Inspeção</p>
                  <p className="text-2xl font-bold text-orange-600" data-testid="stats-inspection">{stats.inspection}</p>
                </div>
                <div className="w-12 h-12 bg-orange-100 rounded-full flex items-center justify-center">
                  <i className="fas fa-search text-orange-600"></i>
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card className="border shadow-sm">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Limpos</p>
                  <p className="text-2xl font-bold text-green-600" data-testid="stats-clean">{stats.clean}</p>
                </div>
                <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center">
                  <i className="fas fa-check-circle text-green-600"></i>
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card className="border shadow-sm">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Ocupados</p>
                  <p className="text-2xl font-bold text-gray-600" data-testid="stats-occupied">{stats.occupied}</p>
                </div>
                <div className="w-12 h-12 bg-gray-100 rounded-full flex items-center justify-center">
                  <i className="fas fa-bed text-gray-600"></i>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Filters and Actions */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 space-y-4 sm:space-y-0">
          <div className="flex flex-wrap gap-2">
            <Button
              variant={filter === "all" ? "default" : "secondary"}
              onClick={() => setFilter("all")}
              data-testid="filter-all"
            >
              Todos os Quartos
            </Button>
            <Button
              variant={filter === "assigned" ? "default" : "secondary"}
              onClick={() => setFilter("assigned")}
              data-testid="filter-assigned"
            >
              Apenas Atribuídos
            </Button>
            <Button
              variant={filter === "floor" ? "default" : "secondary"}
              onClick={() => setFilter("floor")}
              data-testid="filter-floor"
            >
              Por Andar
            </Button>
          </div>
          
          <div className="flex items-center space-x-2">
            <Button variant="outline" data-testid="button-filters">
              <i className="fas fa-filter mr-2"></i>Filtros
            </Button>
            {currentUser?.role === "manager" && (
              <Button data-testid="button-new-assignment">
                <i className="fas fa-plus mr-2"></i>Nova Atribuição
              </Button>
            )}
          </div>
        </div>

        {/* Rooms Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {rooms.map((room: Room) => (
            <RoomCard
              key={room.id}
              room={room}
              currentUser={currentUser}
              users={users}
              onOpenChecklist={handleOpenChecklist}
              onOpenProblemReport={handleOpenProblemReport}
              onTimerUpdate={handleTimerUpdate}
            />
          ))}
        </div>

        {rooms.length === 0 && (
          <div className="text-center py-12">
            <i className="fas fa-bed text-4xl text-muted-foreground mb-4"></i>
            <h3 className="text-lg font-medium text-foreground mb-2">Nenhum quarto encontrado</h3>
            <p className="text-muted-foreground">
              {currentUser?.role === "housekeeper" 
                ? "Você não tem quartos atribuídos no momento."
                : "Nenhum quarto está cadastrado no sistema."
              }
            </p>
          </div>
        )}
      </main>

      {/* Modals */}
      {isChecklistOpen && selectedRoom && (
        <ChecklistModal
          room={selectedRoom}
          currentUser={currentUser}
          isOpen={isChecklistOpen}
          onClose={() => setIsChecklistOpen(false)}
        />
      )}

      {isProblemModalOpen && selectedRoom && (
        <ProblemReportModal
          room={selectedRoom}
          currentUser={currentUser}
          isOpen={isProblemModalOpen}
          onClose={() => setIsProblemModalOpen(false)}
        />
      )}

      {/* Timer Widget */}
      {activeTimer && (
        <TimerWidget
          session={activeTimer}
          onUpdate={handleTimerUpdate}
        />
      )}
    </div>
  );
}
