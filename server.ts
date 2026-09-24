import express, { Request, Response, NextFunction } from 'express';
import { createServer } from 'http';
import { WebSocketServer, WebSocket } from 'ws';
import path from 'path';
import { fileURLToPath } from 'url';
import { createServer as createViteServer } from 'vite';
import type {
  CellData,
  PlayerId,
  OnlineRoomState,
  OnlineRoomInfo,
  OnlinePlayer,
  ChatMessage,
} from './src/types/game.ts';
import {
  createEmptyBoard,
  isValidMove,
  processOneExplosionWave,
} from './src/logic/gameLogic.ts';
import { DEFAULT_PLAYERS_CONFIG, ALL_PLAYER_IDS } from './src/logic/constants.ts';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

interface ClientSocket extends WebSocket {
  id?: string;
  roomCode?: string;
  isAlive?: boolean;
  messageCount?: number;
  lastMessageReset?: number;
  lastChatTime?: number;
  createdRoomsCount?: number;
  createdRoomsReset?: number;
}

interface ServerRoom {
  roomCode: string;
  hostId: string;
  boardSize: number;
  maxPlayers: number;
  isPrivate?: boolean;
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
  lastActivity: number;
}

const rooms = new Map<string, ServerRoom>();
const MAX_GLOBAL_ROOMS = 500;

// Security Helper: Sanitize Strings against XSS, control-char injections & HTML Injection while preserving emojis & unicode
function sanitizeText(raw: any, maxLength = 120): string {
  if (typeof raw !== 'string') return '';
  return raw
    .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F-\u009F]/g, '') // Strip binary control characters
    .replace(/[<>{}`\\$%]/g, '') // Strip script, template injection and HTML delimiters
    .trim()
    .substring(0, maxLength);
}

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
    isPrivate: Boolean(room.isPrivate),
    status: room.status,
    players: room.players.map((p) => ({
      id: p.id,
      name: p.name,
      playerId: p.playerId,
      color: p.color,
      lightColor: p.lightColor,
      boardBgColor: p.boardBgColor,
      borderGlow: p.borderGlow,
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
      try {
        p.ws.send(msg);
      } catch (err) {
        console.error('Broadcast error:', err);
      }
    }
  });
}

function getPublicRoomsList(): OnlineRoomInfo[] {
  const list: OnlineRoomInfo[] = [];
  rooms.forEach((r) => {
    // Only include public rooms in the open lobby list
    if (r.isPrivate) return;

    const host = r.players.find((p) => p.id === r.hostId);
    list.push({
      roomCode: r.roomCode,
      hostName: host ? host.name : 'Room Host',
      maxPlayers: r.maxPlayers,
      playerCount: r.players.length,
      boardSize: r.boardSize,
      status: r.status === 'waiting' ? 'waiting' : r.status === 'gameover' ? 'finished' : 'in_game',
      isPrivate: false,
    });
  });
  return list;
}

// Memory Cleanup: Prune abandoned rooms older than 30 minutes
setInterval(() => {
  const now = Date.now();
  const maxIdleTime = 30 * 60 * 1000;
  rooms.forEach((room, code) => {
    if (room.players.length === 0 || now - room.lastActivity > maxIdleTime) {
      rooms.delete(code);
    }
  });
}, 5 * 60 * 1000);

async function startServer() {
  const app = express();
  const server = createServer(app);

  // WebSocket Server with Payload Security Limit (max 32KB per frame)
  // Use noServer mode so Vite's internal HMR upgrade is never intercepted or broken
  const wss = new WebSocketServer({
    noServer: true,
    maxPayload: 32 * 1024,
  });

  server.on('upgrade', (request, socket, head) => {
    // Ignore Vite HMR WebSocket connections (which use 'vite-hmr' protocol or /@vite paths)
    const protocol = request.headers['sec-websocket-protocol'];
    if (
      protocol === 'vite-hmr' ||
      request.url?.includes('vite-hmr') ||
      request.url?.startsWith('/@vite') ||
      request.url?.startsWith('/@id')
    ) {
      return;
    }

    const rawPath = request.url ? new URL(request.url, 'http://localhost').pathname : '/';
    const pathname = rawPath.replace(/\/+/g, '/');
    if (pathname === '/api/ws' || pathname === '/' || pathname === '') {
      wss.handleUpgrade(request, socket, head, (ws) => {
        wss.emit('connection', ws, request);
      });
    } else {
      socket.destroy();
    }
  });

  // Disable technology stack fingerprinting
  app.disable('x-powered-by');

  // Security Middleware: Safe HTTP Headers (Compatible with iframes and development)
  app.use((req: Request, res: Response, next: NextFunction) => {
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
    res.setHeader('X-XSS-Protection', '1; mode=block');
    next();
  });

  app.use(express.json({ limit: '32kb' }));

  // Heartbeat interval (Drop dead sockets)
  const pingInterval = setInterval(() => {
    wss.clients.forEach((ws) => {
      const client = ws as ClientSocket;
      if (client.isAlive === false) {
        return client.terminate();
      }
      client.isAlive = false;
      client.ping();
    });
  }, 25000);

  wss.on('close', () => {
    clearInterval(pingInterval);
  });

  wss.on('connection', (ws: ClientSocket) => {
    ws.isAlive = true;
    ws.id = 'usr_' + Math.random().toString(36).substring(2, 9);
    ws.messageCount = 0;
    ws.lastMessageReset = Date.now();
    ws.lastChatTime = 0;
    ws.createdRoomsCount = 0;
    ws.createdRoomsReset = Date.now();

    ws.on('pong', () => {
      ws.isAlive = true;
    });

    ws.on('message', async (raw) => {
      // 1. Rate Limiting Protection (Anti-Spam / Anti-Flooding)
      const now = Date.now();
      if (!ws.lastMessageReset || now - ws.lastMessageReset > 1000) {
        ws.messageCount = 0;
        ws.lastMessageReset = now;
      }
      ws.messageCount = (ws.messageCount || 0) + 1;
      if (ws.messageCount > 25) {
        // Exceeded 25 actions/second
        ws.send(JSON.stringify({ type: 'error', message: 'Action rate limit exceeded. Please slow down.' }));
        return;
      }

      try {
        const textData = raw.toString();
        if (textData.length > 4096) {
          ws.send(JSON.stringify({ type: 'error', message: 'Payload too large.' }));
          return;
        }

        // Prototype Pollution Protection
        if (textData.includes('__proto__') || textData.includes('constructor') || textData.includes('prototype')) {
          ws.send(JSON.stringify({ type: 'error', message: 'Malformed payload.' }));
          return;
        }

        const data = JSON.parse(textData);
        if (!data || typeof data !== 'object') return;

        const { action, payload } = data;
        if (!action || typeof action !== 'string') return;

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
          // Global capacity check to prevent memory exhaustion
          if (rooms.size >= MAX_GLOBAL_ROOMS) {
            ws.send(JSON.stringify({ type: 'error', message: 'Server room capacity reached. Please join existing rooms.' }));
            return;
          }

          // Per-socket room creation throttle (max 5 rooms per minute)
          if (!ws.createdRoomsReset || now - ws.createdRoomsReset > 60000) {
            ws.createdRoomsCount = 0;
            ws.createdRoomsReset = now;
          }
          ws.createdRoomsCount = (ws.createdRoomsCount || 0) + 1;
          if (ws.createdRoomsCount > 5) {
            ws.send(JSON.stringify({ type: 'error', message: 'Too many rooms created. Please wait a minute.' }));
            return;
          }

          const rawName = payload?.playerName;
          const rawSize = Number(payload?.boardSize);
          const rawMax = Number(payload?.maxPlayers);
          const isPrivate = Boolean(payload?.isPrivate);

          const playerName = sanitizeText(rawName, 18) || 'Player 1';
          const boardSize = Math.min(Math.max(rawSize || 5, 3), 10);
          const maxPlayers = Math.min(Math.max(rawMax || 2, 2), 10);

          let roomCode = generateRoomCode();
          while (rooms.has(roomCode)) {
            roomCode = generateRoomCode();
          }

          const p1Config = DEFAULT_PLAYERS_CONFIG.p1;
          const hostPlayer: OnlinePlayer & { ws: ClientSocket } = {
            id: ws.id!,
            name: playerName,
            playerId: 'p1',
            color: p1Config.color,
            lightColor: p1Config.lightColor,
            boardBgColor: p1Config.boardBgColor,
            borderGlow: p1Config.borderGlow,
            isHost: true,
            isReady: true,
            ws,
          };

          const newRoom: ServerRoom = {
            roomCode,
            hostId: ws.id!,
            boardSize,
            maxPlayers,
            isPrivate,
            status: 'waiting',
            players: [hostPlayer],
            board: createEmptyBoard(boardSize),
            activePlayerIds: ['p1'],
            currentTurnIndex: 0,
            winnerPlayerId: null,
            totalTurns: 0,
            maxCombo: 0,
            messages: [
              {
                id: 'sys_' + Date.now(),
                senderName: 'System',
                senderColor: '#f97316',
                text: `Room ${roomCode} (${isPrivate ? 'Private' : 'Public'}) created! Invite friends to join.`,
                time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
              },
            ],
            lastActivity: Date.now(),
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
          const rawCode = payload?.roomCode;
          const rawName = payload?.playerName;

          const normalizedCode = sanitizeText(rawCode, 12).toUpperCase();
          const playerName = sanitizeText(rawName, 18) || 'Player';

          if (!/^CW-[A-Z0-9]{4}$/.test(normalizedCode)) {
            ws.send(JSON.stringify({ type: 'error', message: 'Invalid room code format!' }));
            return;
          }

          const room = rooms.get(normalizedCode);
          if (!room) {
            ws.send(JSON.stringify({ type: 'error', message: 'No room found with this code!' }));
            return;
          }

          if (room.status !== 'waiting') {
            ws.send(JSON.stringify({ type: 'error', message: 'Match in this room has already started!' }));
            return;
          }

          if (room.players.length >= room.maxPlayers) {
            ws.send(JSON.stringify({ type: 'error', message: 'Room is already full!' }));
            return;
          }

          // Assign next available playerId
          const usedPids = new Set(room.players.map((p) => p.playerId));
          const nextPid = ALL_PLAYER_IDS.find((id) => !usedPids.has(id)) || 'p2';
          const cfg = DEFAULT_PLAYERS_CONFIG[nextPid];

          const newPlayer: OnlinePlayer & { ws: ClientSocket } = {
            id: ws.id!,
            name: playerName || `Player ${room.players.length + 1}`,
            playerId: nextPid,
            color: cfg.color,
            lightColor: cfg.lightColor,
            boardBgColor: cfg.boardBgColor,
            borderGlow: cfg.borderGlow,
            isHost: false,
            isReady: false,
            ws,
          };

          room.players.push(newPlayer);
          room.activePlayerIds = room.players.map((p) => p.playerId);
          room.lastActivity = Date.now();
          ws.roomCode = normalizedCode;

          room.messages.push({
            id: 'sys_' + Date.now(),
            senderName: 'System',
            senderColor: '#f97316',
            text: `${newPlayer.name} has joined the room!`,
            time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          });

          ws.send(
            JSON.stringify({
              type: 'room_joined',
              room: getSanitizedRoomState(room),
              myPlayerId: nextPid,
              myClientId: ws.id,
            })
          );

          broadcastToRoom(room, {
            type: 'room_update',
            room: getSanitizedRoomState(room),
          });
          return;
        }

        // Verify that client belongs to a valid room
        const room = ws.roomCode ? rooms.get(ws.roomCode) : null;
        if (!room) return;
        room.lastActivity = Date.now();

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
            ws.send(JSON.stringify({ type: 'error', message: 'Only host can start match!' }));
            return;
          }
          if (room.players.length < 2) {
            ws.send(JSON.stringify({ type: 'error', message: 'Need at least 2 players to start!' }));
            return;
          }

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
            senderName: 'System',
            senderColor: '#f97316',
            text: `Match started! First turn goes to ${startingPlayer.name}.`,
            time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          });

          broadcastToRoom(room, {
            type: 'room_update',
            room: getSanitizedRoomState(room),
          });
          return;
        }

        // 6. Make Move (Server-authoritative move validation & anti-cheat)
        if (action === 'make_move') {
          if (room.isCascading) return;

          const row = Number(payload?.row);
          const col = Number(payload?.col);

          // Boundary validation
          if (!Number.isInteger(row) || !Number.isInteger(col) || row < 0 || row >= room.boardSize || col < 0 || col >= room.boardSize) {
            ws.send(JSON.stringify({ type: 'error', message: 'Move coordinates out of bounds!' }));
            return;
          }

          const currentPid = room.activePlayerIds[room.currentTurnIndex];
          const senderPlayer = room.players.find((p) => p.id === ws.id);

          // Anti-Cheat: Verify exact turn
          if (!senderPlayer || senderPlayer.playerId !== currentPid) {
            ws.send(JSON.stringify({ type: 'error', message: 'Not your turn!' }));
            return;
          }

          const currentPhase = room.status === 'placement' ? 'placement' : 'playing';
          const validation = isValidMove(room.board, row, col, currentPid, currentPhase);

          if (!validation.valid) {
            ws.send(JSON.stringify({ type: 'error', message: validation.reason || 'Invalid move!' }));
            return;
          }

          // Case A: Placement Phase
          if (room.status === 'placement') {
            room.board[row][col].playerId = currentPid;
            room.board[row][col].dots = 3;
            room.totalTurns += 1;

            if (room.totalTurns >= room.activePlayerIds.length) {
              room.status = 'playing';
              room.messages.push({
                id: 'sys_' + Date.now(),
                senderName: 'System',
                senderColor: '#10b981',
                text: 'Placement phase complete! Let the chain reactions begin!',
                time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
              });
            }

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

            broadcastToRoom(room, {
              type: 'room_update',
              room: getSanitizedRoomState(room),
            });

            // If reached 4 dots, process chain reactions wave by wave
            if (room.board[row][col].dots >= 4) {
              let cascadeLevel = 1;
              const playerColorMap = {} as Record<PlayerId, string>;
              ALL_PLAYER_IDS.forEach((pid) => {
                playerColorMap[pid] = DEFAULT_PLAYERS_CONFIG[pid].color;
              });

              while (true) {
                const wave = processOneExplosionWave(room.board, cascadeLevel, playerColorMap);
                if (!wave) break;

                broadcastToRoom(room, {
                  type: 'cascade_wave',
                  cascadeLevel,
                  explodingCells: wave.explodingCells,
                  projectiles: wave.projectiles,
                  boardAfterStep: wave.boardAfterStep,
                });

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
            const tileCounts = {} as Record<PlayerId, number>;
            ALL_PLAYER_IDS.forEach((pid) => {
              tileCounts[pid] = 0;
            });
            const size = room.board.length;
            for (let r = 0; r < size; r++) {
              for (let c = 0; c < size; c++) {
                const pid = room.board[r][c].playerId;
                if (pid) tileCounts[pid] = (tileCounts[pid] || 0) + 1;
              }
            }

            // Check surviving players
            const survivingPids = room.activePlayerIds.filter((pid) => (tileCounts[pid] || 0) > 0);
            const totalCells = size * size;
            let winnerId: PlayerId | null = null;

            for (const pid of room.activePlayerIds) {
              if (tileCounts[pid] === totalCells) {
                winnerId = pid;
                break;
              }
            }

            if (!winnerId && survivingPids.length === 1 && room.activePlayerIds.length > 1) {
              winnerId = survivingPids[0];
            }

            if (winnerId) {
              room.status = 'gameover';
              room.winnerPlayerId = winnerId;
              const winPlayer = room.players.find((p) => p.playerId === winnerId);
              room.messages.push({
                id: 'sys_' + Date.now(),
                senderName: 'System',
                senderColor: '#f59e0b',
                text: `🏆 ${winPlayer ? winPlayer.name : 'Player'} has won!`,
                time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
              });
            } else {
              // Advance turn
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
            senderName: 'System',
            senderColor: '#f97316',
            text: 'A new match has begun!',
            time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          });

          broadcastToRoom(room, {
            type: 'room_update',
            room: getSanitizedRoomState(room),
          });
          return;
        }

        // 8. Send Chat Message (Instant Reaction & XSS Sanitized)
        if (action === 'send_chat') {
          const rawText = payload?.text;
          const sender = room.players.find((p) => p.id === ws.id);
          if (!sender) return;

          // Quick chat throttling (max 1 message per 250ms per player for responsive reactions)
          const chatNow = Date.now();
          if (ws.lastChatTime && chatNow - ws.lastChatTime < 250) {
            return;
          }
          ws.lastChatTime = chatNow;

          const cleanText = sanitizeText(rawText, 120);
          if (!cleanText) return;

          const chatItem: ChatMessage = {
            id: 'chat_' + Date.now() + '_' + Math.random().toString(36).substring(2, 6),
            senderName: sender.name,
            senderColor: sender.color,
            text: cleanText,
            time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          };

          room.messages.push(chatItem);
          if (room.messages.length > 60) room.messages.shift();
          room.lastActivity = Date.now();

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
                senderName: 'System',
                senderColor: '#ef4444',
                text: `${leftPlayer.name} has left the room.`,
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
        console.error('WebSocket security catch:', err);
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
                senderName: 'System',
                senderColor: '#ef4444',
                text: `${leftPlayer.name} disconnected.`,
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

  // REST API Health Check with Security Protection
  app.get('/api/health', (req, res) => {
    res.json({ ok: true, activeRooms: rooms.size, timestamp: Date.now() });
  });

  // Mount Vite or serve static assets
  if (process.env.NODE_ENV === 'production') {
    app.use(express.static(path.join(__dirname, 'dist')));
    app.get('*', (req, res) => {
      res.sendFile(path.join(__dirname, 'dist', 'index.html'));
    });
  } else {
    const vite = await createViteServer({
      server: {
        middlewareMode: true,
        hmr: process.env.DISABLE_HMR === 'true' ? false : undefined,
      },
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
