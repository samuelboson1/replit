import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export default function Landing() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-white dark:from-gray-900 dark:to-gray-800 flex items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <CardTitle className="text-3xl font-bold text-primary">
            Governança Hoteleira
          </CardTitle>
          <CardDescription className="text-lg mt-2">
            Sistema de gestão de limpeza hoteleira com protocolo "Limpeza 5 Estrelas"
          </CardDescription>
        </CardHeader>
        
        <CardContent className="space-y-6">
          <div className="text-center space-y-4">
            <p className="text-sm text-muted-foreground">
              Gerencie quartos, monitore limpeza em tempo real e mantenha os mais altos padrões de qualidade.
            </p>
            
            <div className="grid grid-cols-1 gap-3 text-sm">
              <div className="flex items-center space-x-2">
                <span className="text-green-500">✓</span>
                <span>Dashboard em tempo real</span>
              </div>
              <div className="flex items-center space-x-2">
                <span className="text-green-500">✓</span>
                <span>Protocolo "Limpeza 5 Estrelas"</span>
              </div>
              <div className="flex items-center space-x-2">
                <span className="text-green-500">✓</span>
                <span>Cronômetro de limpeza</span>
              </div>
              <div className="flex items-center space-x-2">
                <span className="text-green-500">✓</span>
                <span>Relatório de problemas</span>
              </div>
            </div>
          </div>

          <Button 
            onClick={() => window.location.href = '/api/login'}
            className="w-full py-6 text-lg font-semibold"
            data-testid="button-login"
          >
            Entrar no Sistema
          </Button>
          
          <p className="text-xs text-center text-muted-foreground">
            Sistema seguro com autenticação integrada
          </p>
        </CardContent>
      </Card>
    </div>
  );
}