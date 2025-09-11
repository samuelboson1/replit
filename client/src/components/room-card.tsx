import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import RoomStatusModal from "@/components/room-status-modal";
import type { Room, User, CleaningSession } from "@/lib/types";

interface RoomCardProps {
  room: Room;
  currentUser: User;
  users: User[];
  onOpenChecklist: (room: Room) => void;
  onOpenProblemReport: (room: Room) => void;
  onTimerUpdate: (session: CleaningSession | null) => void;
}

// Mapeamento dos status internos para os nomes em português
const getStatusLabel = (status: string) => {
  const statusMap = {
    dirty: "Ocupado e Sujo",
    clean: "Limpo", 
    occupied: "Ocupado Limpo",
    cleaning: "Vazio",
    inspection: "Disponível para o check in",
    approved: "Aprovado"
  } as const;
  return statusMap[status as keyof typeof statusMap] || status;
};

export default function RoomCard({
  room,
  currentUser,
  users,
  onOpenChecklist,
  onOpenProblemReport,
  onTimerUpdate,
}: RoomCardProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [elapsedTime, setElapsedTime] = useState("00:00");

  // Get active cleaning session
  const { data: activeSession } = useQuery({
    queryKey: ["/api/cleaning-sessions/active", room.id],
    queryFn: async () => {
      const response = await fetch(`/api/cleaning-sessions/active/${room.id}`);
      if (!response.ok) return null;
      return response.json();
    },
    refetchInterval: room.status === "cleaning" ? 1000 : false,
  });

  // Calculate elapsed time for active sessions
  useState(() => {
    if (activeSession && activeSession.status === "active") {
      const interval = setInterval(() => {
        const start = new Date(activeSession.startTime);
        const now = new Date();
        const elapsed = Math.floor((now.getTime() - start.getTime()) / 1000) + (activeSession.pausedTime || 0);
        const minutes = Math.floor(elapsed / 60);
        const seconds = elapsed % 60;
        setElapsedTime(`${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`);
      }, 1000);

      return () => clearInterval(interval);
    }
  });

  // Start cleaning mutation
  const startCleaningMutation = useMutation({
    mutationFn: async () => {
      return await apiRequest("POST", "/api/cleaning-sessions", {
        roomId: room.id,
        housekeeperId: currentUser.id,
        startTime: new Date().toISOString(),
        status: "active",
      });
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["/api/rooms"] });
      queryClient.invalidateQueries({ queryKey: ["/api/cleaning-sessions/active", room.id] });
      onTimerUpdate(data);
      toast({
        title: "Limpeza iniciada",
        description: `Limpeza do quarto ${room.number} iniciada com sucesso.`,
      });
    },
    onError: (error) => {
      toast({
        title: "Erro",
        description: "Não foi possível iniciar a limpeza.",
        variant: "destructive",
      });
    },
  });

  // Pause cleaning mutation
  const pauseCleaningMutation = useMutation({
    mutationFn: async () => {
      if (!activeSession) throw new Error("No active session");
      return await apiRequest("PATCH", `/api/cleaning-sessions/${activeSession.id}`, {
        status: "paused",
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/cleaning-sessions/active", room.id] });
      toast({
        title: "Limpeza pausada",
        description: `Limpeza do quarto ${room.number} pausada.`,
      });
    },
  });

  // Complete cleaning mutation
  const completeCleaningMutation = useMutation({
    mutationFn: async () => {
      if (!activeSession) throw new Error("No active session");
      const now = new Date();
      const start = new Date(activeSession.startTime);
      const totalTime = Math.floor((now.getTime() - start.getTime()) / 1000) + (activeSession.pausedTime || 0);
      
      return await apiRequest("PATCH", `/api/cleaning-sessions/${activeSession.id}`, {
        status: "completed",
        endTime: now.toISOString(),
        totalTime,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/rooms"] });
      queryClient.invalidateQueries({ queryKey: ["/api/cleaning-sessions/active", room.id] });
      onTimerUpdate(null);
      toast({
        title: "Limpeza concluída",
        description: `Limpeza do quarto ${room.number} concluída.`,
      });
    },
  });

  const getStatusColor = (status: string) => {
    switch (status) {
      case "dirty":
        return "status-dirty border-red-500";
      case "cleaning":
        return "status-cleaning border-yellow-500";
      case "inspection":
        return "status-inspection border-orange-500";
      case "clean":
        return "status-clean border-green-500";
      case "occupied":
        return "status-occupied border-gray-500";
      default:
        return "border-border";
    }
  };

  const getStatusBadge = (status: string) => {
    const label = getStatusLabel(status);
    const statusBadge = (() => {
      switch (status) {
        case "dirty":
          return <Badge className="bg-red-500 text-white">{label}</Badge>;
        case "cleaning":
          return <Badge className="bg-yellow-500 text-white timer-running">{label}</Badge>;
        case "inspection":
          return <Badge className="bg-orange-500 text-white">{label}</Badge>;
        case "clean":
          return <Badge className="bg-green-500 text-white">{label}</Badge>;
        case "occupied":
          return <Badge className="bg-gray-500 text-white">{label}</Badge>;
        default:
          return <Badge variant="secondary">{label}</Badge>;
      }
    })();

    // Se o usuário é manager, permite alterar status
    if (currentUser.role === "manager") {
      return (
        <RoomStatusModal room={room}>
          <button className="cursor-pointer" data-testid={`change-status-${room.id}`}>
            {statusBadge}
          </button>
        </RoomStatusModal>
      );
    }
    
    return statusBadge;
  };

  const getAssignedUserName = () => {
    const assignedUser = users.find(u => u.id === room.assignedTo);
    return assignedUser?.name || "Não atribuído";
  };

  const getRoomTypeText = (type: string) => {
    switch (type) {
      case "standard":
        return "Standard";
      case "deluxe":
        return "Deluxe";
      case "suite":
        return "Suite";
      default:
        return type;
    }
  };

  return (
    <Card 
      className={`${getStatusColor(room.status)} border-2 rounded-xl shadow-lg hover:shadow-xl transition-all duration-300`}
      data-testid={`room-card-${room.number}`}
    >
      <CardContent className="p-6">
        <div className="flex justify-between items-start mb-4">
          <div>
            <h3 className="text-xl font-bold text-gray-800" data-testid={`room-number-${room.number}`}>
              Quarto {room.number}
            </h3>
            <p className="text-sm text-gray-600">
              Andar {room.floor} • {getRoomTypeText(room.type)}
            </p>
          </div>
          {getStatusBadge(room.status)}
        </div>
        
        <div className="space-y-3 mb-4">
          <div className="flex justify-between text-sm">
            <span className="text-gray-600">Camareira:</span>
            <span className="font-medium" data-testid={`assigned-user-${room.number}`}>
              {getAssignedUserName()}
            </span>
          </div>
          
          {room.status === "cleaning" && activeSession && (
            <>
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">Tempo decorrido:</span>
                <span className="font-mono text-yellow-700 font-bold" data-testid={`elapsed-time-${room.number}`}>
                  {elapsedTime}
                </span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">Iniciado:</span>
                <span>
                  {new Date(activeSession.startTime).toLocaleTimeString('pt-BR', { 
                    hour: '2-digit', 
                    minute: '2-digit' 
                  })}
                </span>
              </div>
            </>
          )}
          
          {room.lastCleaned && room.status !== "cleaning" && (
            <div className="flex justify-between text-sm">
              <span className="text-gray-600">Última limpeza:</span>
              <span>
                {new Date(room.lastCleaned).toLocaleDateString('pt-BR')}
              </span>
            </div>
          )}
          
          {room.priority && room.status === "dirty" && (
            <div className="flex justify-between text-sm">
              <span className="text-gray-600">Prioridade:</span>
              <span className={`font-medium ${
                room.priority === "alta" || room.priority === "urgente" ? "text-red-600" : 
                room.priority === "media" ? "text-yellow-600" : "text-green-600"
              }`}>
                {room.priority.charAt(0).toUpperCase() + room.priority.slice(1)}
              </span>
            </div>
          )}
        </div>
        
        <div className="space-y-2">
          {/* Main action button */}
          {room.status === "dirty" && (
            <Button
              className="w-full bg-blue-600 text-white hover:bg-blue-700"
              onClick={() => startCleaningMutation.mutate()}
              disabled={startCleaningMutation.isPending}
              data-testid={`button-start-cleaning-${room.number}`}
            >
              <i className="fas fa-play mr-2"></i>
              {startCleaningMutation.isPending ? "Iniciando..." : "Iniciar Limpeza"}
            </Button>
          )}
          
          {room.status === "cleaning" && (
            <div className="flex space-x-2">
              <Button
                variant="outline"
                className="flex-1 border-yellow-600 text-yellow-700 hover:bg-yellow-50"
                onClick={() => pauseCleaningMutation.mutate()}
                disabled={pauseCleaningMutation.isPending}
                data-testid={`button-pause-cleaning-${room.number}`}
              >
                <i className="fas fa-pause mr-1"></i>
                Pausar
              </Button>
              <Button
                className="flex-1 bg-green-600 text-white hover:bg-green-700"
                onClick={() => completeCleaningMutation.mutate()}
                disabled={completeCleaningMutation.isPending}
                data-testid={`button-complete-cleaning-${room.number}`}
              >
                <i className="fas fa-check mr-1"></i>
                Concluir
              </Button>
            </div>
          )}
          
          {room.status === "inspection" && currentUser.role === "manager" && (
            <Button
              className="w-full bg-orange-600 text-white hover:bg-orange-700"
              data-testid={`button-approve-room-${room.number}`}
            >
              <i className="fas fa-clipboard-check mr-2"></i>
              Aprovar Quarto
            </Button>
          )}
          
          {room.status === "clean" && (
            <Button
              className="w-full bg-green-600 text-white hover:bg-green-700"
              data-testid={`button-mark-available-${room.number}`}
            >
              <i className="fas fa-home mr-2"></i>
              Disponibilizar
            </Button>
          )}
          
          {room.status === "occupied" && (
            <Button
              className="w-full bg-gray-400 text-white cursor-not-allowed opacity-75"
              disabled
              data-testid={`button-occupied-${room.number}`}
            >
              <i className="fas fa-lock mr-2"></i>
              Quarto Ocupado
            </Button>
          )}
          
          {/* Secondary action buttons */}
          {room.status !== "occupied" && (
            <div className="flex space-x-2">
              <Button
                variant="outline"
                className="flex-1 border-orange-200 text-orange-700 hover:bg-orange-50"
                onClick={() => onOpenProblemReport(room)}
                data-testid={`button-report-problem-${room.number}`}
              >
                <i className="fas fa-exclamation-triangle mr-1"></i>
                Reportar
              </Button>
              <Button
                variant="outline"
                className="flex-1 border-purple-200 text-purple-700 hover:bg-purple-50"
                onClick={() => onOpenChecklist(room)}
                data-testid={`button-checklist-${room.number}`}
              >
                <i className="fas fa-list-check mr-1"></i>
                Checklist
              </Button>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
