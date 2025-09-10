import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
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
import { Textarea } from "@/components/ui/textarea";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import type { Room, User } from "@/lib/types";

interface ProblemReportModalProps {
  room: Room;
  currentUser: User;
  isOpen: boolean;
  onClose: () => void;
}

export default function ProblemReportModal({
  room,
  currentUser,
  isOpen,
  onClose,
}: ProblemReportModalProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  const [formData, setFormData] = useState({
    type: "",
    priority: "media",
    description: "",
    location: "",
  });

  const problemTypes = [
    { value: "eletrico", label: "Problema Elétrico" },
    { value: "hidraulico", label: "Problema Hidráulico" },
    { value: "ar_condicionado", label: "Ar Condicionado" },
    { value: "moveis", label: "Móveis/Decoração" },
    { value: "eletronicos", label: "Eletrônicos" },
    { value: "limpeza_especial", label: "Limpeza Especial" },
    { value: "outros", label: "Outros" },
  ];

  const priorities = [
    { value: "baixa", label: "Baixa", color: "text-green-600" },
    { value: "media", label: "Média", color: "text-yellow-600" },
    { value: "alta", label: "Alta", color: "text-red-600" },
    { value: "urgente", label: "Urgente", color: "text-red-800 font-bold" },
  ];

  // Submit problem report mutation
  const submitProblemMutation = useMutation({
    mutationFn: async () => {
      if (!formData.type || !formData.description.trim()) {
        throw new Error("Tipo e descrição são obrigatórios.");
      }

      return await apiRequest("POST", "/api/problem-reports", {
        roomId: room.id,
        reportedBy: currentUser.id,
        type: formData.type,
        priority: formData.priority,
        description: formData.description,
        location: formData.location,
        photos: [], // TODO: Implement photo upload
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/rooms"] });
      queryClient.invalidateQueries({ queryKey: ["/api/problem-reports"] });
      toast({
        title: "Problema reportado",
        description: `Problema no quarto ${room.number} reportado com sucesso. O status foi alterado para "Para Inspeção".`,
      });
      onClose();
      resetForm();
    },
    onError: (error) => {
      toast({
        title: "Erro",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const resetForm = () => {
    setFormData({
      type: "",
      priority: "media",
      description: "",
      location: "",
    });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    submitProblemMutation.mutate();
  };

  const handleClose = () => {
    onClose();
    resetForm();
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="max-w-2xl" data-testid="problem-report-modal">
        <DialogHeader className="pb-4 border-b">
          <DialogTitle className="text-xl font-bold">
            Reportar Problema
          </DialogTitle>
          <DialogDescription>
            Quarto {room.number}
          </DialogDescription>
        </DialogHeader>
        
        <form onSubmit={handleSubmit} className="space-y-6 p-6">
          
          <div>
            <Label htmlFor="problemType" className="text-sm font-medium text-foreground mb-2 block">
              Tipo de Problema
            </Label>
            <Select
              value={formData.type}
              onValueChange={(value) => setFormData(prev => ({ ...prev, type: value }))}
            >
              <SelectTrigger data-testid="select-problem-type">
                <SelectValue placeholder="Selecionar tipo..." />
              </SelectTrigger>
              <SelectContent>
                {problemTypes.map((type) => (
                  <SelectItem key={type.value} value={type.value}>
                    {type.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          
          <div>
            <Label className="text-sm font-medium text-foreground mb-2 block">
              Prioridade
            </Label>
            <RadioGroup
              value={formData.priority}
              onValueChange={(value) => setFormData(prev => ({ ...prev, priority: value }))}
              className="flex space-x-4"
            >
              {priorities.map((priority) => (
                <div key={priority.value} className="flex items-center space-x-2">
                  <RadioGroupItem
                    value={priority.value}
                    id={priority.value}
                    data-testid={`radio-priority-${priority.value}`}
                  />
                  <Label 
                    htmlFor={priority.value}
                    className={`text-sm ${priority.color}`}
                  >
                    {priority.label}
                  </Label>
                </div>
              ))}
            </RadioGroup>
          </div>
          
          <div>
            <Label htmlFor="description" className="text-sm font-medium text-foreground mb-2 block">
              Descrição do Problema
            </Label>
            <Textarea
              id="description"
              value={formData.description}
              onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
              className="h-32 resize-none"
              placeholder="Descreva detalhadamente o problema encontrado..."
              required
              data-testid="textarea-description"
            />
          </div>
          
          <div>
            <Label htmlFor="location" className="text-sm font-medium text-foreground mb-2 block">
              Localização Específica
            </Label>
            <Input
              id="location"
              value={formData.location}
              onChange={(e) => setFormData(prev => ({ ...prev, location: e.target.value }))}
              placeholder="Ex: Banheiro, próximo à janela, lado direito da cama..."
              data-testid="input-location"
            />
          </div>
          
          <div>
            <Label className="text-sm font-medium text-foreground mb-2 block">
              Fotos (opcional)
            </Label>
            <div className="border-2 border-dashed border-border rounded-lg p-6 text-center">
              <i className="fas fa-camera text-3xl text-muted-foreground mb-2"></i>
              <p className="text-sm text-muted-foreground mb-2">Clique para adicionar fotos do problema</p>
              <Button 
                type="button" 
                variant="secondary" 
                className="text-sm"
                data-testid="button-upload-photo"
              >
                Selecionar Fotos
              </Button>
            </div>
          </div>
          
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
            <div className="flex items-start space-x-3">
              <i className="fas fa-exclamation-triangle text-yellow-600 mt-1"></i>
              <div>
                <h4 className="text-sm font-medium text-yellow-800">Atenção</h4>
                <p className="text-sm text-yellow-700 mt-1">
                  Ao reportar este problema, o status do quarto será alterado para "Para Inspeção" 
                  e a equipe de manutenção será notificada automaticamente.
                </p>
              </div>
            </div>
          </div>
        </form>
        
        <div className="flex justify-end space-x-3 p-6 border-t border-border">
          <Button 
            type="button" 
            variant="outline" 
            onClick={handleClose}
            data-testid="button-cancel"
          >
            Cancelar
          </Button>
          <Button 
            type="submit" 
            variant="destructive"
            onClick={handleSubmit}
            disabled={submitProblemMutation.isPending || !formData.type || !formData.description.trim()}
            data-testid="button-submit-problem"
          >
            <i className="fas fa-exclamation-triangle mr-2"></i>
            {submitProblemMutation.isPending ? "Reportando..." : "Reportar Problema"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
