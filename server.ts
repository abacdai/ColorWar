import express from 'express';
import { createServer } from 'http';
import { WebSocketServer, WebSocket } from 'ws';
import path from 'path';
import { fileURLToPath } from 'url';
import { createServer as createViteServer } from 'vite';
import {
  CellData,
  PlayerId,
  OnlineRoomState,
  OnlineRoomInfo,
  OnlinePlayer,
  ChatMessage,
  Projectile,
} from './src/types/game.js';
import {
  createEmptyBoard,
  cloneBoard,
  isValidMove,
  processOneExplosionWave,
} from './src/logic/gameLogic.js';
import { DEFAULT_PLAYERS_CONFIG } from './src/logic/constants.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

interface ClientSocket extends WebSocket {
  id?: string;
  roomCode?: string;
  isAlive?: boolean;
}

interface ServerRoom {
  roomCode: string;
  hostId: string;
  boardSize: number;
  maxPlayers: number;
  status: 'waiting' | 'placement' | 'playing' | 'gameover';
  players: (OnlinePlayer & { ws: ClientSocket })[];
  board: CellData[][];
  activePlayerIds: PlayerId[];
  currentTurnIndex: number;
  winnerPlayerId: PlayerId | null;
  totalTurns: number;
  maxCombo: number;
  messages: ChatMessage[];
  isCascading?: boolean;
}

const rooms = new Map<string, ServerRoom>();

function generateRoomCode(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let code = '';
  for (let i = 0; i < 4; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return `CW-${code}`;
}

function getSanitizedRoomState(room: ServerRoom): OnlineRoomState {
  return {
    roomCode: room.roomCode,
    hostId: room.hostId,
    boardSize: room.boardSize,
    maxPlayers: room.maxPlayers,
    status: room.status,
    players: room.players.map((p) => ({
      id: p.id,
      name: p.name,
      playerId: p.playerId,
      color: p.color,
      lightColor: p.lightColor,
      isHost: p.isHost,
      isReady: p.isReady,
    })),
    board: room.board,
    activePlayerIds: room.activePlayerIds,
    currentTurnIndex: room.currentTurnIndex,
    winnerPlayerId: room.winnerPlayerId,
    totalTurns: room.totalTurns,
    maxCombo: room.maxCombo,
    messages: room.messages,
  };
}

function broadcastToRoom(room: ServerRoom, payload: any) {
  const msg = JSON.stringify(payload);
  room.players.forEach((p) => {
    if (p.ws.readyState === WebSocket.OPEN) {
      p.ws.send(msg);
    }
  });
}

function getPublicRoomsList(): OnlineRoomInfo[] {
  const list: OnlineRoomInfo[] = [];
  rooms.forEach((r) => {
    const host = r.players.find((p) => p.id === r.hostId);
    list.push({
      roomCode: r.roomCode,
      hostName: host ? host.name : 'Chủ phòng',
      maxPlayers: r.maxPlayers,
      playerCount: r.players.length,
      boardSize: r.boardSize,
      status: r.status === 'waiting' ? 'waiting' : r.status === 'gameover' ? 'finished' : 'in_game',
    });
  });
  return list;
}

async function startServer() {
  const app = express();
  const server = createServer(app);
  const wss = new WebSocketServer({ server });

  // Heartbeat interval
  const pingInterval = setInterval(() => {
    wss.clients.forEach((ws) => {
      const client = ws as ClientSocket;
      if (client.isAlive === false) {
        return client.terminate();
      }
      client.isAlive = false;
      client.ping();
    });
  }, 30000);

  wss.on('close', () => {
    clearInterval(pingInterval);
  });

  wss.on('connection', (ws: ClientSocket) => {
    ws.isAlive = true;
    ws.id = 'usr_' + Math.random().toString(36).substring(2, 9);

    ws.on('pong', () => {
      ws.isAlive = true;
    });

    ws.on('message', async (raw) => {
      try {
        const data = JSON.parse(raw.toString());
        const { action, payload } = data;

        // 1. Get List of Open Rooms
        if (action === 'get_rooms') {
          ws.send(
            JSON.stringify({
              type: 'rooms_list',
              rooms: getPublicRoomsList(),
            })
          );
          return;
        }

        // 2. Create Room
        if (action === 'create_room') {
          const { playerName = 'Người Chơi', boardSize = 5, maxPlayers = 2 } = payload || {};
          let roomCode = generateRoomCode();
          while (rooms.has(roomCode)) {
            roomCode = generateRoomCode();
          }

          const p1Config = DEFAULT_PLAYERS_CONFIG.p1;
          const hostPlayer: OnlinePlayer & { ws: ClientSocket } = {
            id: ws.id!,
            name: playerName.trim().substring(0, 16) || 'Người Chơi 1',
            playerId: 'p1',
            color: p1Config.color,
            lightColor: p1Config.lightColor,
            isHost: true,
            isReady: true,
            ws,
          };

          const newRoom: ServerRoom = {
            roomCode,
            hostId: ws.id!,
            boardSize: Number(boardSize) || 5,
            maxPlayers: Math.min(Math.max(Number(maxPlayers) || 2, 2), 4),
            status: 'waiting',
            players: [hostPlayer],
            board: createEmptyBoard(Number(boardSize) || 5),
            activePlayerIds: ['p1'],
            currentTurnIndex: 0,
            winnerPlayerId: null,
            totalTurns: 0,
            maxCombo: 0,
            messages: [
              {
                id: 'sys_' + Date.now(),
                senderName: 'Hệ Thống',
                senderColor: '#f97316',
                text: `Phòng ${roomCode} đã được tạo! Mời bạn bè tham gia.`,
                time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
              },
            ],
          };

          rooms.set(roomCode, newRoom);
          ws.roomCode = roomCode;

          ws.send(
            JSON.stringify({
              type: 'room_joined',
              room: getSanitizedRoomState(newRoom),
              myPlayerId: 'p1',
              myClientId: ws.id,
            })
          );
          return;
        }

        // 3. Join Room
        if (action === 'join_room') {
          const { roomCode, playerName = 'Người Chơi' } = payload || {};
          const normalizedCode = (roomCode || '').toUpperCase().trim();
          const room = rooms.get(normalizedCode);

          if (!room) {
            ws.send(
              JSON.stringify({
                type: 'error',
                message: 'Không tìm thấy phòng với mã này!',
              })
            );
            return;
          }

          if (room.status !== 'waiting') {
            ws.send(
              JSON.stringify({
                type: 'error',
                message: 'Trận đấu trong phòng này đã bắt đầu!',
              })
            );
            return;
          }

          if (room.players.length >= room.maxPlayers) {
            ws.send(
              JSON.stringify({
                type: 'error',
                message: 'Phòng đã đủ số lượng người chơi!',
              })
            );
            return;
          }

          // Assign next playerId
          const assignedPlayerIds: PlayerId[] = ['p1', 'p2', 'p3', 'p4'];
          const usedPids = new Set(room.players.map((p) => p.playerId));
          const nextPid = assignedPlayerIds.find((id) => !usedPids.has(id)) || 'p2';
          const cfg = DEFAULT_PLAYERS_CONFIG[nextPid];

          const newPlayer: OnlinePlayer & { ws: ClientSocket } = {
            id: ws.id!,
            name: playerName.trim().substring(0, 16) || `Người Chơi ${room.players.length + 1}`,
            playerId: nextPid,
            color: cfg.color,
            lightColor: cfg.lightColor,
            isHost: false,
            isReady: false,
            ws,
          };

          room.players.push(newPlayer);
          room.activePlayerIds = room.players.map((p) => p.playerId);
          ws.roomCode = normalizedCode;

          room.messages.push({
            id: 'sys_' + Date.now(),
            senderName: 'Hệ Thống',
            senderColor: '#f97316',
            text: `${newPlayer.name} đã vào phòng!`,
            time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          });

          // Send confirmation to joining user
          ws.send(
            JSON.stringify({
              type: 'room_joined',
              room: getSanitizedRoomState(room),
              myPlayerId: nextPid,
              myClientId: ws.id,
            })
          );

          // Broadcast updated room state to all in room
          broadcastToRoom(room, {
            type: 'room_update',
            room: getSanitizedRoomState(room),
          });
          return;
        }

        // Current client's room
        const room = ws.roomCode ? rooms.get(ws.roomCode) : null;
        if (!room) return;

        // 4. Toggle Ready Status
        if (action === 'toggle_ready') {
          const player = room.players.find((p) => p.id === ws.id);
          if (player && !player.isHost) {
            player.isReady = !player.isReady;
            broadcastToRoom(room, {
              type: 'room_update',
              room: getSanitizedRoomState(room),
            });
          }
          return;
        }

        // 5. Start Game (Host only)
        if (action === 'start_game') {
          if (room.hostId !== ws.id) {
            ws.send(JSON.stringify({ type: 'error', message: 'Chỉ chủ phòng mới có thể bắt đầu!' }));
            return;
          }
          if (room.players.length < 2) {
            ws.send(JSON.stringify({ type: 'error', message: 'Cần ít nhất 2 người để bắt đầu!' }));
            return;
          }

          // Random starting turn
          const randomStartIdx = Math.floor(Math.random() * room.players.length);
          room.status = 'placement';
          room.board = createEmptyBoard(room.boardSize);
          room.activePlayerIds = room.players.map((p) => p.playerId);
          room.currentTurnIndex = randomStartIdx;
          room.winnerPlayerId = null;
          room.totalTurns = 0;
          room.maxCombo = 0;
          room.isCascading = false;

          const startingPlayer = room.players[randomStartIdx];
          room.messages.push({
            id: 'sys_' + Date.now(),
            senderName: 'Hệ Thống',
            senderColor: '#f97316',
            text: `Trận đấu bắt đầu! Lượt đầu tiên thuộc về ${startingPlayer.name}.`,
            time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          });

          broadcastToRoom(room, {
            type: 'room_update',
            room: getSanitizedRoomState(room),
          });
          return;
        }

        // 6. Make Move (Placement or Playing)
        if (action === 'make_move') {
          if (room.isCascading) return;
          const { row, col } = payload || {};

          // Check if valid turn
          const currentPid = room.activePlayerIds[room.currentTurnIndex];
          const senderPlayer = room.players.find((p) => p.id === ws.id);
          if (!senderPlayer || senderPlayer.playerId !== currentPid) {
            ws.send(JSON.stringify({ type: 'error', message: 'Chưa tới lượt của bạn!' }));
            return;
          }

          const currentPhase = room.status === 'placement' ? 'placement' : 'playing';
          const validation = isValidMove(room.board, row, col, currentPid, currentPhase);

          if (!validation.valid) {
            ws.send(JSON.stringify({ type: 'error', message: validation.reason || 'Nước đi không hợp lệ!' }));
            return;
          }

          // Case A: Placement Phase
          if (room.status === 'placement') {
            room.board[row][col].playerId = currentPid;
            room.board[row][col].dots = 3;
            room.totalTurns += 1;

            // Check if all players have placed their piece
            if (room.totalTurns >= room.activePlayerIds.length) {
              room.status = 'playing';
              room.messages.push({
                id: 'sys_' + Date.now(),
                senderName: 'Hệ Thống',
                senderColor: '#10b981',
                text: 'Giai đoạn khởi đầu hoàn tất! Bắt đầu kích nổ!',
                time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
              });
            }

            // Advance turn
            room.currentTurnIndex = (room.currentTurnIndex + 1) % room.activePlayerIds.length;

            broadcastToRoom(room, {
              type: 'room_update',
              room: getSanitizedRoomState(room),
            });
            return;
          }

          // Case B: Playing Phase
          if (room.status === 'playing') {
            room.isCascading = true;
            room.board[row][col].dots += 1;
            room.totalTurns += 1;

            // Broadcast initial dot add
            broadcastToRoom(room, {
              type: 'room_update',
              room: getSanitizedRoomState(room),
            });

            // If reached 4 dots, process chain reactions wave by wave
            if (room.board[row][col].dots >= 4) {
              let cascadeLevel = 1;
              const playerColorMap: Record<PlayerId, string> = {
                p1: DEFAULT_PLAYERS_CONFIG.p1.color,
                p2: DEFAULT_PLAYERS_CONFIG.p2.color,
                p3: DEFAULT_PLAYERS_CONFIG.p3.color,
                p4: DEFAULT_PLAYERS_CONFIG.p4.color,
              };

              while (true) {
                const wave = processOneExplosionWave(room.board, cascadeLevel, playerColorMap);
                if (!wave) break;

                // Broadcast wave explosion animation
                broadcastToRoom(room, {
                  type: 'cascade_wave',
                  cascadeLevel,
                  explodingCells: wave.explodingCells,
                  projectiles: wave.projectiles,
                });

                // Wait for animation delay
                await new Promise((r) => setTimeout(r, 450));

                room.board = wave.boardAfterStep;
                if (cascadeLevel > room.maxCombo) {
                  room.maxCombo = cascadeLevel;
                }

                broadcastToRoom(room, {
                  type: 'room_update',
                  room: getSanitizedRoomState(room),
                });

                if (!wave.newExplosionsTriggered) break;
                cascadeLevel++;
                await new Promise((r) => setTimeout(r, 100));
              }
            }

            room.isCascading = false;

            // Check tile ownership
            const tileCounts: Record<PlayerId, number> = { p1: 0, p2: 0, p3: 0, p4: 0 };
            const size = room.board.length;
            for (let r = 0; r < size; r++) {
              for (let c = 0; c < size; c++) {
                const pid = room.board[r][c].playerId;
                if (pid) tileCounts[pid] = (tileCounts[pid] || 0) + 1;
              }
            }

            // Check eliminated players
            const survivingPids = room.activePlayerIds.filter((pid) => (tileCounts[pid] || 0) > 0);

            // Win condition 1: A player controls 100% of cells
            const totalCells = size * size;
            let winnerId: PlayerId | null = null;
            for (const pid of room.activePlayerIds) {
              if (tileCounts[pid] === totalCells) {
                winnerId = pid;
                break;
              }
            }

            // Win condition 2: Only 1 surviving player remains
            if (!winnerId && survivingPids.length === 1 && room.activePlayerIds.length > 1) {
              winnerId = survivingPids[0];
            }

            if (winnerId) {
              room.status = 'gameover';
              room.winnerPlayerId = winnerId;
              const winPlayer = room.players.find((p) => p.playerId === winnerId);
              room.messages.push({
                id: 'sys_' + Date.now(),
                senderName: 'Hệ Thống',
                senderColor: '#f59e0b',
                text: `🏆 ${winPlayer ? winPlayer.name : 'Người chơi'} đã giành chiến thắng vang dội!`,
                time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
              });
            } else {
              // Advance turn to next surviving player
              let nextIdx = (room.currentTurnIndex + 1) % room.activePlayerIds.length;
              let attempts = 0;
              while (tileCounts[room.activePlayerIds[nextIdx]] === 0 && attempts < room.activePlayerIds.length) {
                nextIdx = (nextIdx + 1) % room.activePlayerIds.length;
                attempts++;
              }
              room.currentTurnIndex = nextIdx;
            }

            broadcastToRoom(room, {
              type: 'room_update',
              room: getSanitizedRoomState(room),
            });
            return;
          }
        }

        // 7. Restart Game (Host only)
        if (action === 'restart_game') {
          if (room.hostId !== ws.id) return;
          const randomStartIdx = Math.floor(Math.random() * room.players.length);
          room.status = 'placement';
          room.board = createEmptyBoard(room.boardSize);
          room.currentTurnIndex = randomStartIdx;
          room.winnerPlayerId = null;
          room.totalTurns = 0;
          room.maxCombo = 0;
          room.isCascading = false;

          room.messages.push({
            id: 'sys_' + Date.now(),
            senderName: 'Hệ Thống',
            senderColor: '#f97316',
            text: 'Trận đấu mới đã bắt đầu!',
            time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          });

          broadcastToRoom(room, {
            type: 'room_update',
            room: getSanitizedRoomState(room),
          });
          return;
        }

        // 8. Send Chat Message / Quick Reaction
        if (action === 'send_chat') {
          const { text } = payload || {};
          const sender = room.players.find((p) => p.id === ws.id);
          if (!sender || !text) return;

          const chatItem: ChatMessage = {
            id: 'chat_' + Date.now() + Math.random().toString(36).substring(2, 5),
            senderName: sender.name,
            senderColor: sender.color,
            text: String(text).substring(0, 100),
            time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          };

          room.messages.push(chatItem);
          if (room.messages.length > 50) room.messages.shift();

          broadcastToRoom(room, {
            type: 'chat_message',
            message: chatItem,
          });
          return;
        }

        // 9. Leave Room
        if (action === 'leave_room') {
          const index = room.players.findIndex((p) => p.id === ws.id);
          if (index !== -1) {
            const leftPlayer = room.players[index];
            room.players.splice(index, 1);
            ws.roomCode = undefined;

            if (room.players.length === 0) {
              rooms.delete(room.roomCode);
            } else {
              // Reassign host if host left
              if (room.hostId === ws.id) {
                room.hostId = room.players[0].id;
                room.players[0].isHost = true;
              }

              room.activePlayerIds = room.players.map((p) => p.playerId);
              if (room.currentTurnIndex >= room.activePlayerIds.length) {
                room.currentTurnIndex = 0;
              }

              room.messages.push({
                id: 'sys_' + Date.now(),
                senderName: 'Hệ Thống',
                senderColor: '#ef4444',
                text: `${leftPlayer.name} đã rời phòng.`,
                time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
              });

              broadcastToRoom(room, {
                type: 'room_update',
                room: getSanitizedRoomState(room),
              });
            }
          }
          ws.send(JSON.stringify({ type: 'left_room' }));
          return;
        }
      } catch (err) {
        console.error('WebSocket message processing error:', err);
      }
    });

    ws.on('close', () => {
      if (ws.roomCode) {
        const room = rooms.get(ws.roomCode);
        if (room) {
          const index = room.players.findIndex((p) => p.id === ws.id);
          if (index !== -1) {
            const leftPlayer = room.players[index];
            room.players.splice(index, 1);

            if (room.players.length === 0) {
              rooms.delete(room.roomCode);
            } else {
              if (room.hostId === ws.id) {
                room.hostId = room.players[0].id;
                room.players[0].isHost = true;
              }
              room.activePlayerIds = room.players.map((p) => p.playerId);
              if (room.currentTurnIndex >= room.activePlayerIds.length) {
                room.currentTurnIndex = 0;
              }

              room.messages.push({
                id: 'sys_' + Date.now(),
                senderName: 'Hệ Thống',
                senderColor: '#ef4444',
                text: `${leftPlayer.name} đã ngắt kết nối.`,
                time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
              });

              broadcastToRoom(room, {
                type: 'room_update',
                room: getSanitizedRoomState(room),
              });
            }
          }
        }
      }
    });
  });

  // REST API endpoint to check health
  app.get('/api/health', (req, res) => {
    res.json({ ok: true, activeRooms: rooms.size });
  });

  // Mount Vite or serve static assets
  if (process.env.NODE_ENV === 'production') {
    app.use(express.static(path.join(__dirname, 'dist')));
    app.get('*', (req, res) => {
      res.sendFile(path.join(__dirname, 'dist', 'index.html'));
    });
  } else {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  }

  const PORT = Number(process.env.PORT) || 3000;
  server.listen(PORT, '0.0.0.0', () => {
    console.log(`Color Wars Server running at http://localhost:${PORT}`);
  });
}

startServer();
