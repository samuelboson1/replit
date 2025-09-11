import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import type { Room } from "@/lib/types";

interface RoomStatusModalProps {
  room: Room;
  children: React.ReactNode;
}

// Mapeamento dos status internos para os nomes em português
const statusMap = {
  dirty: "Ocupado e Sujo",
  clean: "Limpo", 
  occupied: "Ocupado Limpo",
  cleaning: "Vazio",
  inspection: "Disponível para o check in",
  approved: "Aprovado"
} as const;

const statusOptions = [
  { value: "dirty", label: "Ocupado e Sujo" },
  { value: "clean", label: "Limpo" },
  { value: "occupied", label: "Ocupado Limpo" },
  { value: "cleaning", label: "Vazio" },
  { value: "inspection", label: "Disponível para o check in" },
  { value: "approved", label: "Aprovado" }
];

export default function RoomStatusModal({ room, children }: RoomStatusModalProps) {
  const [open, setOpen] = useState(false);
  const [selectedStatus, setSelectedStatus] = useState(room.status);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const updateStatusMutation = useMutation({
    mutationFn: async (newStatus: string) => {
      return apiRequest("PATCH", `/api/rooms/${room.id}/status`, { status: newStatus });
    },
    onSuccess: () => {
      // Invalidate all room queries (including those with user-specific keys)
      queryClient.invalidateQueries({ queryKey: ["/api/rooms"] });
      // Also force a refetch on the specific room data
      queryClient.refetchQueries({ queryKey: ["/api/rooms"] });
      toast({
        title: "Status atualizado",
        description: `Quarto ${room.number} alterado para: ${statusMap[selectedStatus as keyof typeof statusMap]}`,
      });
      setOpen(false);
    },
    onError: (error: any) => {
      toast({
        title: "Erro",
        description: "Falha ao atualizar status do quarto",
        variant: "destructive",
      });
      console.error("Error updating room status:", error);
    },
  });

  const handleStatusUpdate = () => {
    if (selectedStatus !== room.status) {
      updateStatusMutation.mutate(selectedStatus);
    } else {
      setOpen(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {children}
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Alterar Status - Quarto {room.number}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <label className="text-sm font-medium">Status Atual:</label>
            <p className="text-sm text-muted-foreground">
              {statusMap[room.status as keyof typeof statusMap]}
            </p>
          </div>
          
          <div className="space-y-2">
            <label className="text-sm font-medium">Novo Status:</label>
            <Select value={selectedStatus} onValueChange={setSelectedStatus}>
              <SelectTrigger data-testid="status-select">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {statusOptions.map((option) => (
                  <SelectItem 
                    key={option.value} 
                    value={option.value}
                    data-testid={`status-option-${option.value}`}
                  >
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
        
        <div className="flex justify-end space-x-2">
          <Button
            variant="outline"
            onClick={() => setOpen(false)}
            data-testid="cancel-status-change"
          >
            Cancelar
          </Button>
          <Button
            onClick={handleStatusUpdate}
            disabled={updateStatusMutation.isPending}
            data-testid="confirm-status-change"
          >
            {updateStatusMutation.isPending ? "Alterando..." : "Confirmar"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}