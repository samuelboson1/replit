import { useEffect, useRef } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import type { WSMessage } from "@shared/schema";

export function useWebSocket() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const wsRef = useRef<WebSocket | null>(null);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const reconnectAttempts = useRef(0);
  const maxReconnectAttempts = 5;
  const reconnectDelay = 3000;

  useEffect(() => {
    const connect = () => {
      try {
        const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
        const wsUrl = `${protocol}//${window.location.host}/ws`;
        
        wsRef.current = new WebSocket(wsUrl);

        wsRef.current.onopen = () => {
          console.log("WebSocket connected");
          reconnectAttempts.current = 0;
        };

        wsRef.current.onmessage = (event) => {
          try {
            const message: WSMessage = JSON.parse(event.data);
            handleWebSocketMessage(message);
          } catch (error) {
            console.error("Error parsing WebSocket message:", error);
          }
        };

        wsRef.current.onclose = (event) => {
          console.log("WebSocket disconnected:", event.code, event.reason);
          
          // Attempt to reconnect if not manually closed
          if (event.code !== 1000 && reconnectAttempts.current < maxReconnectAttempts) {
            reconnectAttempts.current++;
            console.log(`Attempting to reconnect (${reconnectAttempts.current}/${maxReconnectAttempts})...`);
            
            reconnectTimeoutRef.current = setTimeout(() => {
              connect();
            }, reconnectDelay);
          }
        };

        wsRef.current.onerror = (error) => {
          console.error("WebSocket error:", error);
        };
      } catch (error) {
        console.error("Error creating WebSocket connection:", error);
      }
    };

    const handleWebSocketMessage = (message: WSMessage) => {
      switch (message.type) {
        case "room_status_update":
          // Invalidate rooms query to trigger refetch
          queryClient.invalidateQueries({ queryKey: ["/api/rooms"] });
          
          toast({
            title: "Status do quarto atualizado",
            description: `Quarto ${message.data.room?.number || "desconhecido"} foi atualizado para ${message.data.status}.`,
          });
          break;

        case "timer_update":
          // Invalidate cleaning sessions queries
          queryClient.invalidateQueries({ queryKey: ["/api/cleaning-sessions"] });
          
          if (message.data.action === "start") {
            toast({
              title: "Limpeza iniciada",
              description: "Uma nova sessão de limpeza foi iniciada.",
            });
          }
          break;

        case "checklist_update":
          // Invalidate checklist queries
          queryClient.invalidateQueries({ queryKey: ["/api/checklist-completions"] });
          
          if (message.data.action === "update" && message.data.completion?.isCompleted) {
            toast({
              title: "Checklist finalizado",
              description: "Um checklist foi finalizado e aprovado.",
            });
          }
          break;

        case "problem_report":
          // Invalidate problem reports and rooms queries
          queryClient.invalidateQueries({ queryKey: ["/api/problem-reports"] });
          queryClient.invalidateQueries({ queryKey: ["/api/rooms"] });
          
          if (message.data.action === "create") {
            toast({
              title: "Novo problema reportado",
              description: "Um novo problema foi reportado e requer atenção.",
              variant: "destructive",
            });
          }
          break;

        default:
          console.log("Unknown WebSocket message type:", message.type);
      }
    };

    connect();

    return () => {
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
      }
      
      if (wsRef.current) {
        wsRef.current.close(1000, "Component unmounting");
        wsRef.current = null;
      }
    };
  }, [queryClient, toast]);

  return {
    isConnected: wsRef.current?.readyState === WebSocket.OPEN,
    send: (message: WSMessage) => {
      if (wsRef.current?.readyState === WebSocket.OPEN) {
        wsRef.current.send(JSON.stringify(message));
      }
    },
  };
}
