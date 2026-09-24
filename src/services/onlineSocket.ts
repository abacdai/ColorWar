import { OnlineRoomState, OnlineRoomInfo, ChatMessage, PlayerId, Projectile } from '../types/game';

type EventCallback<T = any> = (data: T) => void;

class OnlineSocketService {
  private socket: WebSocket | null = null;
  private listeners: Record<string, Set<EventCallback>> = {};
  private reconnectTimer: any = null;
  public isConnected: boolean = false;
  public myPlayerId: PlayerId | null = null;
  public myClientId: string | null = null;

  constructor() {
    this.listeners = {
      room_joined: new Set(),
      room_update: new Set(),
      rooms_list: new Set(),
      cascade_wave: new Set(),
      chat_message: new Set(),
      error: new Set(),
      connection_change: new Set(),
    };
  }

  public connect(): void {
    if (this.socket && (this.socket.readyState === WebSocket.OPEN || this.socket.readyState === WebSocket.CONNECTING)) {
      return;
    }

    const customWsUrl = (import.meta as any).env.VITE_WS_URL || (import.meta as any).env.VITE_BACKEND_URL;
    let wsUrl = '';
    if (customWsUrl) {
      const cleanBase = String(customWsUrl).trim().replace(/\/+$/, '');
      wsUrl = cleanBase.endsWith('/api/ws') ? cleanBase : `${cleanBase}/api/ws`;
    } else {
      const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
      const host = window.location.host;
      wsUrl = `${protocol}//${host}/api/ws`;
    }

    try {
      this.socket = new WebSocket(wsUrl);

      this.socket.onopen = () => {
        this.isConnected = true;
        this.emit('connection_change', true);
        if (this.reconnectTimer) {
          clearTimeout(this.reconnectTimer);
          this.reconnectTimer = null;
        }
      };

      this.socket.onmessage = (event) => {
        try {
          const msg = JSON.parse(event.data);
          const { type, ...payload } = msg;

          if (type === 'room_joined') {
            this.myPlayerId = payload.myPlayerId;
            this.myClientId = payload.myClientId;
          }

          this.emit(type, payload);
        } catch (e) {
          console.error('Failed to parse websocket message:', e);
        }
      };

      this.socket.onclose = () => {
        this.isConnected = false;
        this.emit('connection_change', false);
        // Try auto reconnect after 3 seconds
        if (!this.reconnectTimer) {
          this.reconnectTimer = setTimeout(() => {
            this.reconnectTimer = null;
            this.connect();
          }, 3000);
        }
      };

      this.socket.onerror = (err) => {
        console.warn('WebSocket connection error:', err);
      };
    } catch (e) {
      console.error('Error instantiating WebSocket:', e);
    }
  }

  public send(action: string, payload?: any): void {
    if (!this.socket || this.socket.readyState !== WebSocket.OPEN) {
      this.connect();
      // Retry send once connected
      setTimeout(() => {
        if (this.socket && this.socket.readyState === WebSocket.OPEN) {
          this.socket.send(JSON.stringify({ action, payload }));
        }
      }, 500);
      return;
    }
    this.socket.send(JSON.stringify({ action, payload }));
  }

  public createRoom(playerName: string, boardSize: number, maxPlayers: number, isPrivate = false): void {
    this.send('create_room', { playerName, boardSize, maxPlayers, isPrivate });
  }

  public joinRoom(roomCode: string, playerName: string): void {
    this.send('join_room', { roomCode, playerName });
  }

  public leaveRoom(): void {
    this.send('leave_room');
    this.myPlayerId = null;
  }

  public toggleReady(): void {
    this.send('toggle_ready');
  }

  public startGame(): void {
    this.send('start_game');
  }

  public makeMove(row: number, col: number): void {
    this.send('make_move', { row, col });
  }

  public restartGame(): void {
    this.send('restart_game');
  }

  public sendChat(text: string): void {
    this.send('send_chat', { text });
  }

  public getRooms(): void {
    this.send('get_rooms');
  }

  public on(event: string, callback: EventCallback): () => void {
    if (!this.listeners[event]) {
      this.listeners[event] = new Set();
    }
    this.listeners[event].add(callback);
    return () => {
      this.listeners[event].delete(callback);
    };
  }

  private emit(event: string, data: any): void {
    if (this.listeners[event]) {
      this.listeners[event].forEach((cb) => cb(data));
    }
  }
}

export const onlineSocket = new OnlineSocketService();
