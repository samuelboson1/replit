import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { CheckCircle, X } from "lucide-react";
import type { Room, User } from "@shared/schema";

interface ApprovalModalProps {
  isOpen: boolean;
  onClose: () => void;
  room: Room;
  onApprovalComplete: () => void;
}

export function ApprovalModal({ isOpen, onClose, room, onApprovalComplete }: ApprovalModalProps) {
  const { toast } = useToast();
  

  // Fetch completed checklist for this room
  const { data: checklistCompletion, isLoading: checklistLoading, error: checklistError } = useQuery({
    queryKey: ["/api/checklist-completions/room", room.id],
    queryFn: async () => {
      const response = await fetch(`/api/checklist-completions/room/${room.id}`);
      if (!response.ok) {
        if (response.status === 404) {
          return null; // No completed checklist found
        }
        throw new Error(`Failed to fetch checklist: ${response.status}`);
      }
      return response.json();
    },
    enabled: isOpen && !!room?.id,
    retry: false,
  });

  // Fetch checklist template
  const { data: template, isLoading: templateLoading } = useQuery({
    queryKey: ["/api/checklist-template", "Limpeza 5 Estrelas"],
    queryFn: async () => {
      const response = await fetch("/api/checklist-template/Limpeza 5 Estrelas");
      if (!response.ok) throw new Error("Failed to fetch template");
      return response.json();
    },
    enabled: isOpen && !!checklistCompletion,
  });

  // Fetch users for housekeeper/supervisor names
  const { data: users = [] } = useQuery({
    queryKey: ["/api/users"],
    enabled: isOpen && !!checklistCompletion,
  });

  const approveRoomMutation = useMutation({
    mutationFn: async () => {
      return await apiRequest("PATCH", `/api/rooms/${room.id}/status`, {
        status: "approved"
      });
    },
    onSuccess: () => {
      toast({
        title: "Quarto aprovado",
        description: `Quarto ${room.number} foi aprovado com sucesso.`,
      });
      onApprovalComplete();
      onClose();
    },
    onError: (error) => {
      toast({
        title: "Erro",
        description: error.message || "Falha ao aprovar o quarto.",
        variant: "destructive",
      });
    },
  });

  const getStepName = (step: string) => {
    const stepNames: Record<string, string> = {
      arrumacao: "Arrumação",
      limpeza: "Limpeza",
      organizacao: "Organização",
      verificacao: "Verificação",
      finalizacao: "Finalização"
    };
    return stepNames[step] || step;
  };

  const isLoading = checklistLoading || templateLoading;

  if (isLoading) {
    return (
      <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden">
          <DialogHeader>
            <DialogTitle>Carregando Aprovação - Quarto {room.number}</DialogTitle>
            <DialogDescription>
              Aguarde enquanto carregamos os dados do checklist...
            </DialogDescription>
          </DialogHeader>
          <div className="flex items-center justify-center p-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            <span className="ml-2">Carregando checklist...</span>
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  // Handle errors
  if (checklistError) {
    return (
      <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Erro ao Carregar</DialogTitle>
            <DialogDescription>
              Erro ao carregar dados do checklist para o quarto {room.number}: {checklistError.message}
            </DialogDescription>
          </DialogHeader>
          <div className="flex justify-end">
            <Button onClick={onClose}>Fechar</Button>
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  if (!checklistCompletion) {
    return (
      <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Checklist Não Encontrado</DialogTitle>
            <DialogDescription>
              Nenhum checklist finalizado encontrado para o quarto {room.number}.
            </DialogDescription>
          </DialogHeader>
          <div className="flex justify-end">
            <Button onClick={onClose}>Fechar</Button>
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  const housekeeper = (users as User[]).find((u: User) => u.id === checklistCompletion.housekeeperId);
  const supervisor = (users as User[]).find((u: User) => u.id === checklistCompletion.supervisorId);
  
  // Normalize data before use to prevent crashes
  const completedItems = checklistCompletion?.completedItems ?? {};
  const templateItems = (template?.items && typeof template.items === 'object') ? template.items as Record<string, { title: string; items: any[] }> : {};
  const totalItems = Object.values(templateItems).reduce((sum, stepObj) => sum + (stepObj?.items?.length || 0), 0);
  const completedCount = Object.values(completedItems).filter(Boolean).length;
  

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden" data-testid="approval-modal">
        <DialogHeader className="pb-4 border-b">
          <DialogTitle className="text-2xl font-bold flex items-center">
            <CheckCircle className="h-6 w-6 text-green-600 mr-2" />
            Aprovação - Quarto {room.number}
          </DialogTitle>
          <DialogDescription>
            Revise o checklist concluído antes de aprovar o quarto
          </DialogDescription>
        </DialogHeader>
        
        <div className="overflow-y-auto max-h-[calc(90vh-200px)] p-6">
          {/* Checklist Info */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6 p-4 bg-secondary rounded-lg">
            <div>
              <p className="text-sm font-medium text-muted-foreground">Camareira(o):</p>
              <p className="font-semibold">{housekeeper?.name || 'N/A'}</p>
            </div>
            <div>
              <p className="text-sm font-medium text-muted-foreground">Supervisor:</p>
              <p className="font-semibold">{supervisor?.name || 'N/A'}</p>
            </div>
            <div>
              <p className="text-sm font-medium text-muted-foreground">Concluído em:</p>
              <p className="font-semibold">
                {checklistCompletion.completedAt 
                  ? new Date(checklistCompletion.completedAt).toLocaleDateString('pt-BR')
                  : 'N/A'
                }
              </p>
            </div>
          </div>

          {/* Progress Summary */}
          <div className="mb-6 p-4 bg-green-50 border border-green-200 rounded-lg">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-green-800">Status do Checklist</p>
                <p className="text-lg font-bold text-green-900">
                  {completedCount}/{totalItems} itens concluídos
                </p>
              </div>
              <Badge variant="outline" className="bg-green-100 text-green-800 border-green-300">
                100% Completo
              </Badge>
            </div>
          </div>

          {/* Checklist Items */}
          {Object.entries(templateItems).map(([stepKey, stepObj]) => {
            const safeItems = Array.isArray(stepObj?.items) ? stepObj.items : [];
            return (
              <div key={stepKey} className="mb-6">
                <h3 className="text-lg font-semibold mb-3 flex items-center">
                  <CheckCircle className="h-5 w-5 text-green-600 mr-2" />
                  {stepObj?.title || getStepName(stepKey)}
                </h3>
                <div className="space-y-2">
                  {safeItems.map((item: any, index: number) => {
                    const itemKey = item?.id || `${stepKey}-${index}`;
                    const isCompleted = !!completedItems[itemKey];
                    return (
                      <div key={itemKey} className="flex items-center p-3 bg-white border rounded-lg">
                      <div className="flex-shrink-0 mr-3">
                        <CheckCircle className="h-5 w-5 text-green-600" />
                      </div>
                      <div className="flex-grow">
                        <p className="font-medium">{item?.text || item?.title || 'Item'}</p>
                        {item?.description && (
                          <p className="text-sm text-muted-foreground">{item.description}</p>
                        )}
                      </div>
                      <Badge variant="outline" className="bg-green-100 text-green-800">
                        Concluído
                      </Badge>
                      </div>
                    );
                  })}
                </div>
                {stepKey !== Object.keys(templateItems)[Object.keys(templateItems).length - 1] && (
                  <Separator className="mt-4" />
                )}
              </div>
            );
          })}
        </div>

        {/* Action Buttons */}
        <div className="flex justify-between pt-4 border-t bg-background">
          <Button
            variant="outline"
            onClick={onClose}
            data-testid="button-cancel-approval"
          >
            <X className="h-4 w-4 mr-2" />
            Cancelar
          </Button>
          <Button
            className="bg-green-600 text-white hover:bg-green-700"
            onClick={() => approveRoomMutation.mutate()}
            disabled={approveRoomMutation.isPending}
            data-testid="button-confirm-approval"
          >
            <CheckCircle className="h-4 w-4 mr-2" />
            {approveRoomMutation.isPending ? "Aprovando..." : "Aprovar Quarto"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}