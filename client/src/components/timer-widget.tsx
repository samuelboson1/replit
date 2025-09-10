import { useState, useEffect } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import type { CleaningSession } from "@/lib/types";

interface TimerWidgetProps {
  session: CleaningSession;
  onUpdate: (session: CleaningSession | null) => void;
}

export default function TimerWidget({ session, onUpdate }: TimerWidgetProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [elapsedTime, setElapsedTime] = useState("00:00");
  const [isVisible, setIsVisible] = useState(true);

  // Update elapsed time every second
  useEffect(() => {
    if (session?.status === "active") {
      const interval = setInterval(() => {
        const start = new Date(session.startTime);
        const now = new Date();
        const elapsed = Math.floor((now.getTime() - start.getTime()) / 1000) + (session.pausedTime || 0);
        const minutes = Math.floor(elapsed / 60);
        const seconds = elapsed % 60;
        setElapsedTime(`${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`);
      }, 1000);

      return () => clearInterval(interval);
    }
  }, [session]);

  // Pause cleaning mutation
  const pauseCleaningMutation = useMutation({
    mutationFn: async () => {
      return await apiRequest("PATCH", `/api/cleaning-sessions/${session.id}`, {
        status: "paused",
      });
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["/api/cleaning-sessions/active", session.roomId] });
      onUpdate(data);
      toast({
        title: "Limpeza pausada",
        description: "A limpeza foi pausada com sucesso.",
      });
    },
  });

  // Complete cleaning mutation
  const completeCleaningMutation = useMutation({
    mutationFn: async () => {
      const now = new Date();
      const start = new Date(session.startTime);
      const totalTime = Math.floor((now.getTime() - start.getTime()) / 1000) + (session.pausedTime || 0);
      
      return await apiRequest("PATCH", `/api/cleaning-sessions/${session.id}`, {
        status: "completed",
        endTime: now.toISOString(),
        totalTime,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/rooms"] });
      queryClient.invalidateQueries({ queryKey: ["/api/cleaning-sessions/active", session.roomId] });
      onUpdate(null);
      toast({
        title: "Limpeza concluída",
        description: "A limpeza foi concluída com sucesso.",
      });
    },
  });

  if (!isVisible) {
    return null;
  }

  return (
    <Card 
      className="fixed bottom-6 right-6 min-w-[250px] z-40 shadow-2xl border"
      data-testid="timer-widget"
    >
      <CardContent className="p-4">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center space-x-2">
            <div className="w-3 h-3 bg-yellow-500 rounded-full timer-running"></div>
            <span className="text-sm font-medium text-foreground">Limpeza em Andamento</span>
          </div>
          <Button
            variant="ghost"
            size="sm"
            className="p-1 h-auto text-muted-foreground hover:text-foreground"
            onClick={() => setIsVisible(false)}
            data-testid="button-close-timer"
          >
            <i className="fas fa-times text-sm"></i>
          </Button>
        </div>
        
        <div className="text-center">
          <p className="text-xs text-muted-foreground mb-1">
            Quarto <span data-testid="timer-room-number">{session.roomId}</span>
          </p>
          <p 
            className="text-2xl font-mono font-bold text-yellow-600" 
            data-testid="timer-elapsed"
          >
            {elapsedTime}
          </p>
          <p className="text-xs text-muted-foreground">
            Iniciado às{" "}
            <span data-testid="timer-start-time">
              {new Date(session.startTime).toLocaleTimeString('pt-BR', { 
                hour: '2-digit', 
                minute: '2-digit' 
              })}
            </span>
          </p>
        </div>
        
        <div className="flex space-x-2 mt-4">
          <Button
            variant="outline"
            className="flex-1 border-yellow-600 text-yellow-700 hover:bg-yellow-50"
            onClick={() => pauseCleaningMutation.mutate()}
            disabled={pauseCleaningMutation.isPending}
            data-testid="button-pause-timer"
          >
            <i className="fas fa-pause mr-1"></i>
            Pausar
          </Button>
          <Button
            className="flex-1 bg-green-600 text-white hover:bg-green-700"
            onClick={() => completeCleaningMutation.mutate()}
            disabled={completeCleaningMutation.isPending}
            data-testid="button-complete-timer"
          >
            <i className="fas fa-check mr-1"></i>
            Concluir
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
