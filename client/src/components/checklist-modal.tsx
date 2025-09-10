import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import type { Room, User, ChecklistTemplate } from "@/lib/types";

interface ChecklistModalProps {
  room: Room;
  currentUser: User;
  isOpen: boolean;
  onClose: () => void;
}

export default function ChecklistModal({
  room,
  currentUser,
  isOpen,
  onClose,
}: ChecklistModalProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  const [completedItems, setCompletedItems] = useState<Record<string, boolean>>({});
  const [supervisorId, setSupervisorId] = useState<string>("");
  const [housekeeperName, setHousekeeperName] = useState(currentUser.name);
  const [releaseTime, setReleaseTime] = useState("");

  // Fetch checklist template
  const { data: template, isLoading } = useQuery({
    queryKey: ["/api/checklist-template", "Limpeza 5 Estrelas"],
    queryFn: async () => {
      const response = await fetch("/api/checklist-template/Limpeza 5 Estrelas");
      if (!response.ok) throw new Error("Failed to fetch template");
      return response.json();
    },
    enabled: isOpen,
  });

  // Fetch supervisors
  const { data: users = [] } = useQuery({
    queryKey: ["/api/users"],
    enabled: isOpen,
  });

  const supervisors = users.filter((user: User) => user.role === "supervisor");

  // Save checklist progress mutation
  const saveProgressMutation = useMutation({
    mutationFn: async () => {
      if (!template) throw new Error("No template available");
      
      return await apiRequest("POST", "/api/checklist-completions", {
        roomId: room.id,
        templateId: template.id,
        housekeeperId: currentUser.id,
        completedItems,
        isCompleted: false,
      });
    },
    onSuccess: () => {
      toast({
        title: "Progresso salvo",
        description: "O progresso do checklist foi salvo com sucesso.",
      });
    },
  });

  // Submit checklist mutation
  const submitChecklistMutation = useMutation({
    mutationFn: async () => {
      if (!template) throw new Error("No template available");
      
      const totalItems = getTotalItemCount();
      const completedCount = Object.values(completedItems).filter(Boolean).length;
      
      if (completedCount < totalItems) {
        throw new Error("Todos os itens devem ser completados antes de finalizar.");
      }
      
      if (!supervisorId) {
        throw new Error("Um supervisor deve ser selecionado.");
      }

      return await apiRequest("POST", "/api/checklist-completions", {
        roomId: room.id,
        templateId: template.id,
        housekeeperId: currentUser.id,
        supervisorId,
        completedItems,
        isCompleted: true,
        completedAt: new Date().toISOString(),
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/rooms"] });
      toast({
        title: "Checklist finalizado",
        description: "O checklist foi finalizado e enviado para aprovação.",
      });
      onClose();
    },
    onError: (error) => {
      toast({
        title: "Erro",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const handleItemToggle = (itemId: string, checked: boolean) => {
    setCompletedItems(prev => ({
      ...prev,
      [itemId]: checked
    }));
  };

  const getTotalItemCount = () => {
    if (!template?.items) return 0;
    
    return Object.values(template.items).reduce((total: number, step: any) => {
      return total + (step.items?.length || 0);
    }, 0);
  };

  const getCompletedCount = () => {
    return Object.values(completedItems).filter(Boolean).length;
  };

  const getProgressPercentage = () => {
    const total = getTotalItemCount();
    const completed = getCompletedCount();
    return total > 0 ? Math.round((completed / total) * 100) : 0;
  };

  useEffect(() => {
    if (isOpen) {
      setReleaseTime(new Date().toTimeString().slice(0, 5));
    }
  }, [isOpen]);

  if (isLoading) {
    return (
      <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden">
          <div className="flex items-center justify-center p-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            <span className="ml-2">Carregando checklist...</span>
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  if (!template) {
    return (
      <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Erro</DialogTitle>
            <DialogDescription>
              Não foi possível carregar o template do checklist.
            </DialogDescription>
          </DialogHeader>
          <div className="flex justify-end">
            <Button onClick={onClose}>Fechar</Button>
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden" data-testid="checklist-modal">
        <DialogHeader className="pb-4 border-b">
          <DialogTitle className="text-2xl font-bold">
            Protocolo "Limpeza 5 Estrelas"
          </DialogTitle>
          <DialogDescription>
            Quarto {room.number} - {room.type}
          </DialogDescription>
        </DialogHeader>
        
        <div className="overflow-y-auto max-h-[calc(90vh-200px)] p-6">
          
          {/* Checklist Header Info */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6 p-4 bg-secondary rounded-lg">
            <div>
              <Label htmlFor="housekeeper" className="text-sm font-medium text-muted-foreground">
                Camareira(o):
              </Label>
              <Input
                id="housekeeper"
                value={housekeeperName}
                onChange={(e) => setHousekeeperName(e.target.value)}
                className="mt-1"
                data-testid="input-housekeeper"
              />
            </div>
            <div>
              <Label htmlFor="date" className="text-sm font-medium text-muted-foreground">
                Data:
              </Label>
              <Input
                id="date"
                type="date"
                defaultValue={new Date().toISOString().split('T')[0]}
                className="mt-1"
                data-testid="input-date"
              />
            </div>
            <div>
              <Label htmlFor="releaseTime" className="text-sm font-medium text-muted-foreground">
                Hora da Liberação:
              </Label>
              <Input
                id="releaseTime"
                type="time"
                value={releaseTime}
                onChange={(e) => setReleaseTime(e.target.value)}
                className="mt-1"
                data-testid="input-release-time"
              />
            </div>
          </div>

          {/* Checklist Steps */}
          {Object.entries(template.items).map(([stepKey, step]: [string, any], stepIndex) => (
            <div key={stepKey} className="mb-8">
              <div className="flex items-center mb-4">
                <div className={`w-8 h-8 text-white rounded-full flex items-center justify-center text-sm font-bold mr-3 ${
                  stepIndex === 0 ? 'bg-blue-600' :
                  stepIndex === 1 ? 'bg-green-600' :
                  stepIndex === 2 ? 'bg-purple-600' : 'bg-orange-600'
                }`}>
                  {stepIndex + 1}
                </div>
                <h3 className="text-lg font-bold text-foreground">{step.title}</h3>
              </div>
              
              <div className="space-y-3 ml-11">
                {step.items.map((item: any) => (
                  <div key={item.id} className="flex items-start space-x-3">
                    <Checkbox
                      id={item.id}
                      checked={completedItems[item.id] || false}
                      onCheckedChange={(checked) => handleItemToggle(item.id, !!checked)}
                      className="mt-1"
                      data-testid={`checkbox-${item.id}`}
                    />
                    <Label
                      htmlFor={item.id}
                      className="text-sm text-foreground cursor-pointer flex-1"
                    >
                      {item.text}
                    </Label>
                  </div>
                ))}
              </div>
            </div>
          ))}

          {/* Supervisor Selection */}
          <div className="mb-8">
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
              <Label className="block text-sm font-medium text-yellow-800 mb-2">
                Supervisor(a) Responsável:
              </Label>
              <select
                className="w-full px-3 py-2 border border-yellow-300 rounded-md text-sm mb-3"
                value={supervisorId}
                onChange={(e) => setSupervisorId(e.target.value)}
                data-testid="select-supervisor"
              >
                <option value="">Selecionar supervisor...</option>
                {supervisors.map((supervisor: User) => (
                  <option key={supervisor.id} value={supervisor.id}>
                    {supervisor.name}
                  </option>
                ))}
              </select>
              
              <Label className="block text-sm font-medium text-yellow-800 mb-2">
                Assinatura Digital:
              </Label>
              <div className="border-2 border-dashed border-yellow-300 rounded-lg p-8 text-center bg-yellow-25">
                <i className="fas fa-signature text-3xl text-yellow-600 mb-2"></i>
                <p className="text-sm text-yellow-700">Assinatura será processada automaticamente</p>
              </div>
            </div>
          </div>

          {/* Progress Indicator */}
          <div className="bg-secondary rounded-lg p-4 mb-6">
            <div className="flex justify-between items-center mb-2">
              <span className="text-sm font-medium text-foreground">Progresso do Checklist</span>
              <span className="text-sm text-muted-foreground" data-testid="progress-text">
                {getCompletedCount()}/{getTotalItemCount()} itens
              </span>
            </div>
            <Progress value={getProgressPercentage()} className="w-full" data-testid="progress-bar" />
          </div>
        </div>
        
        <div className="flex justify-between items-center p-6 border-t border-border bg-secondary">
          <Button
            variant="ghost"
            onClick={() => saveProgressMutation.mutate()}
            disabled={saveProgressMutation.isPending}
            data-testid="button-save-progress"
          >
            <i className="fas fa-save mr-2"></i>
            {saveProgressMutation.isPending ? "Salvando..." : "Salvar Progresso"}
          </Button>
          <div className="flex space-x-3">
            <Button variant="outline" onClick={onClose} data-testid="button-cancel">
              Cancelar
            </Button>
            <Button
              onClick={() => submitChecklistMutation.mutate()}
              disabled={submitChecklistMutation.isPending || getProgressPercentage() < 100}
              data-testid="button-submit-checklist"
            >
              <i className="fas fa-check-circle mr-2"></i>
              {submitChecklistMutation.isPending ? "Finalizando..." : "Finalizar Checklist"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
