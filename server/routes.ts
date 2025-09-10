import type { Express } from "express";
import { createServer, type Server } from "http";
import { WebSocketServer, WebSocket } from "ws";
import { storage } from "./storage";
import { z } from "zod";
import { insertRoomSchema, insertCleaningSessionSchema, insertChecklistCompletionSchema, insertProblemReportSchema, type WSMessage } from "@shared/schema";

// WebSocket clients storage
const wsClients = new Set<WebSocket>();

// Broadcast to all connected clients
function broadcast(message: WSMessage) {
  const messageStr = JSON.stringify(message);
  wsClients.forEach(client => {
    if (client.readyState === WebSocket.OPEN) {
      client.send(messageStr);
    }
  });
}

export async function registerRoutes(app: Express): Promise<Server> {
  // Initialize checklist template if it doesn't exist
  const initializeChecklistTemplate = async () => {
    const existing = await storage.getChecklistTemplate("Limpeza 5 Estrelas");
    if (!existing) {
      const template = {
        name: "Limpeza 5 Estrelas",
        items: {
          "step1": {
            title: "Teste de Funcionalidade (Tudo a funcionar)",
            items: [
              { id: "lighting", text: "Iluminação: Ligar e desligar TODAS as luzes do quarto e banheiro." },
              { id: "shower", text: "Chuveiro: Ligar e testar a pressão e a temperatura da água (quente e fria)." },
              { id: "ac", text: "Ar Condicionado: Ligar, verificar se gela e se não há vazamentos ou ruídos estranhos." },
              { id: "tv", text: "TV e Controlo Remoto: Ligar a TV, verificar canais e funcionamento do controlo (pilhas OK)." },
              { id: "outlets", text: "Tomadas: Testar pelo menos duas tomadas com um carregador." },
              { id: "minibar", text: "Frigobar: Verificar se está a gelar e se a porta fecha corretamente." },
              { id: "toilet_flush", text: "Descarga: Acionar a descarga e verificar se há vazamentos." }
            ]
          },
          "step2": {
            title: "Limpeza Profunda (Brilhando e cheiroso)",
            items: [
              { id: "ac_filters", text: "Filtros do Ar Condicionado: Limpos." },
              { id: "drains", text: "Ralos (Banheiro e Box): Limpos e desinfetados com produto anti-odor." },
              { id: "toilet", text: "Vaso Sanitário: Limpo por dentro e por fora, com lacre de higienização." },
              { id: "shower_box", text: "Box: Vidros/acrílicos transparentes, sem manchas de água ou sabão." },
              { id: "mirror", text: "Espelho: Limpo e sem manchas." },
              { id: "floor", text: "Piso: Varrido e lavado, sem cabelos ou sujidade nos cantos." },
              { id: "surfaces", text: "Superfícies: Móveis, bancadas e telefone limpos, sem pó." },
              { id: "closets", text: "Interior de Armários e Gavetas: Verificados e limpos." },
              { id: "windows", text: "Janelas e Cortinas: Vidros limpos e cortinas/blackout a funcionar corretamente." },
              { id: "bed", text: "Cama: Feita com enxoval limpo, esticado e sem manchas." }
            ]
          },
          "step3": {
            title: "Inspeção Visual e Finalização (Aparência impecável)",
            items: [
              { id: "guest_test", text: "\"Teste do Hóspede\": Entrar no quarto com um novo olhar. O cheiro é agradável? A aparência é convidativa?" },
              { id: "amenities", text: "Amenidades: Sabonetes, champô e papel higiénico repostos." },
              { id: "towels", text: "Toalhas: Limpas, dobradas e posicionadas corretamente." },
              { id: "organization", text: "Organização: Objetos (controlo, copos) alinhados e no lugar padrão." },
              { id: "minibar_stock", text: "Frigobar: Organizado e abastecido conforme o padrão." }
            ]
          },
          "step4": {
            title: "Dupla Verificação (Assinatura do Supervisor)",
            items: [
              { id: "supervisor_check", text: "Checklist Conferido: O supervisor verificou todos os itens acima." }
            ]
          }
        }
      };
      await storage.createChecklistTemplate(template);
    }
  };

  // Initialize sample data
  const initializeSampleData = async () => {
    const users = await storage.getAllUsers();
    if (users.length === 0) {
      // Create sample users
      await storage.createUser({ name: "Maria Silva", email: "maria@hotel.com", role: "manager" });
      await storage.createUser({ name: "Ana Costa", email: "ana@hotel.com", role: "housekeeper" });
      await storage.createUser({ name: "Maria Santos", email: "maria.santos@hotel.com", role: "housekeeper" });
      await storage.createUser({ name: "João Silva", email: "joao@hotel.com", role: "housekeeper" });
      await storage.createUser({ name: "Carla Mendes", email: "carla@hotel.com", role: "housekeeper" });
      await storage.createUser({ name: "Supervisor A", email: "supervisor@hotel.com", role: "supervisor" });
    }

    const rooms = await storage.getAllRooms();
    if (rooms.length === 0) {
      const housekeepers = await storage.getAllUsers();
      const housekeeper1 = housekeepers.find(u => u.name === "Ana Costa");
      const housekeeper2 = housekeepers.find(u => u.name === "Maria Santos");
      const housekeeper3 = housekeepers.find(u => u.name === "João Silva");
      const housekeeper4 = housekeepers.find(u => u.name === "Carla Mendes");

      // Create sample rooms
      await storage.createRoom({ number: "101", floor: 1, type: "standard", status: "dirty", assignedTo: housekeeper1?.id, priority: "alta" });
      await storage.createRoom({ number: "102", floor: 1, type: "standard", status: "clean", assignedTo: housekeeper1?.id });
      await storage.createRoom({ number: "205", floor: 2, type: "deluxe", status: "cleaning", assignedTo: housekeeper2?.id });
      await storage.createRoom({ number: "206", floor: 2, type: "deluxe", status: "dirty", assignedTo: housekeeper2?.id });
      await storage.createRoom({ number: "312", floor: 3, type: "suite", status: "inspection", assignedTo: housekeeper3?.id });
      await storage.createRoom({ number: "408", floor: 4, type: "standard", status: "clean", assignedTo: housekeeper4?.id });
      await storage.createRoom({ number: "505", floor: 5, type: "deluxe", status: "occupied" });
    }
  };

  await initializeChecklistTemplate();
  await initializeSampleData();

  // Rooms API
  app.get("/api/rooms", async (req, res) => {
    try {
      const { assignedTo } = req.query;
      let rooms;
      
      if (assignedTo) {
        rooms = await storage.getRoomsByAssignedUser(assignedTo as string);
      } else {
        rooms = await storage.getAllRooms();
      }
      
      res.json(rooms);
    } catch (error) {
      console.error("Error fetching rooms:", error);
      res.status(500).json({ message: "Failed to fetch rooms" });
    }
  });

  app.patch("/api/rooms/:id/status", async (req, res) => {
    try {
      const { id } = req.params;
      const { status } = req.body;
      
      const room = await storage.updateRoomStatus(id, status);
      
      // Broadcast room status update
      broadcast({
        type: 'room_status_update',
        data: { roomId: id, status, room }
      });
      
      res.json(room);
    } catch (error) {
      console.error("Error updating room status:", error);
      res.status(500).json({ message: "Failed to update room status" });
    }
  });

  // Cleaning sessions API
  app.post("/api/cleaning-sessions", async (req, res) => {
    try {
      const sessionData = insertCleaningSessionSchema.parse(req.body);
      const session = await storage.startCleaningSession(sessionData);
      
      // Update room status to cleaning
      await storage.updateRoomStatus(sessionData.roomId, 'cleaning');
      
      // Broadcast timer update
      broadcast({
        type: 'timer_update',
        data: { action: 'start', session }
      });
      
      res.json(session);
    } catch (error) {
      console.error("Error starting cleaning session:", error);
      res.status(500).json({ message: "Failed to start cleaning session" });
    }
  });

  app.patch("/api/cleaning-sessions/:id", async (req, res) => {
    try {
      const { id } = req.params;
      const updates = req.body;
      
      const session = await storage.updateCleaningSession(id, updates);
      
      // Broadcast timer update
      broadcast({
        type: 'timer_update',
        data: { action: 'update', session }
      });
      
      res.json(session);
    } catch (error) {
      console.error("Error updating cleaning session:", error);
      res.status(500).json({ message: "Failed to update cleaning session" });
    }
  });

  app.get("/api/cleaning-sessions/active/:roomId", async (req, res) => {
    try {
      const { roomId } = req.params;
      const session = await storage.getActiveCleaningSession(roomId);
      res.json(session);
    } catch (error) {
      console.error("Error fetching active cleaning session:", error);
      res.status(500).json({ message: "Failed to fetch active cleaning session" });
    }
  });

  // Checklist API
  app.get("/api/checklist-template/:name", async (req, res) => {
    try {
      const { name } = req.params;
      const template = await storage.getChecklistTemplate(name);
      if (!template) {
        return res.status(404).json({ message: "Template not found" });
      }
      res.json(template);
    } catch (error) {
      console.error("Error fetching checklist template:", error);
      res.status(500).json({ message: "Failed to fetch checklist template" });
    }
  });

  app.post("/api/checklist-completions", async (req, res) => {
    try {
      const completionData = insertChecklistCompletionSchema.parse(req.body);
      const completion = await storage.saveChecklistCompletion(completionData);
      
      // Broadcast checklist update
      broadcast({
        type: 'checklist_update',
        data: { action: 'save', completion }
      });
      
      res.json(completion);
    } catch (error) {
      console.error("Error saving checklist completion:", error);
      res.status(500).json({ message: "Failed to save checklist completion" });
    }
  });

  app.patch("/api/checklist-completions/:id", async (req, res) => {
    try {
      const { id } = req.params;
      const updates = req.body;
      
      const completion = await storage.updateChecklistCompletion(id, updates);
      
      // If checklist is completed and approved, update room status
      if (completion.isCompleted && completion.supervisorSignature) {
        await storage.updateRoomStatus(completion.roomId, 'clean');
      }
      
      // Broadcast checklist update
      broadcast({
        type: 'checklist_update',
        data: { action: 'update', completion }
      });
      
      res.json(completion);
    } catch (error) {
      console.error("Error updating checklist completion:", error);
      res.status(500).json({ message: "Failed to update checklist completion" });
    }
  });

  // Problem reports API
  app.post("/api/problem-reports", async (req, res) => {
    try {
      const reportData = insertProblemReportSchema.parse(req.body);
      const report = await storage.createProblemReport(reportData);
      
      // Update room status to inspection
      await storage.updateRoomStatus(reportData.roomId, 'inspection');
      
      // Broadcast problem report
      broadcast({
        type: 'problem_report',
        data: { action: 'create', report }
      });
      
      res.json(report);
    } catch (error) {
      console.error("Error creating problem report:", error);
      res.status(500).json({ message: "Failed to create problem report" });
    }
  });

  app.get("/api/problem-reports", async (req, res) => {
    try {
      const { roomId } = req.query;
      let reports;
      
      if (roomId) {
        reports = await storage.getProblemReportsByRoom(roomId as string);
      } else {
        reports = await storage.getAllProblemReports();
      }
      
      res.json(reports);
    } catch (error) {
      console.error("Error fetching problem reports:", error);
      res.status(500).json({ message: "Failed to fetch problem reports" });
    }
  });

  // Users API
  app.get("/api/users", async (req, res) => {
    try {
      const users = await storage.getAllUsers();
      res.json(users);
    } catch (error) {
      console.error("Error fetching users:", error);
      res.status(500).json({ message: "Failed to fetch users" });
    }
  });

  // Create HTTP server
  const httpServer = createServer(app);

  // Setup WebSocket server
  const wss = new WebSocketServer({ server: httpServer, path: '/ws' });

  wss.on('connection', (ws) => {
    console.log('WebSocket client connected');
    wsClients.add(ws);

    ws.on('close', () => {
      console.log('WebSocket client disconnected');
      wsClients.delete(ws);
    });

    ws.on('error', (error) => {
      console.error('WebSocket error:', error);
      wsClients.delete(ws);
    });
  });

  return httpServer;
}
