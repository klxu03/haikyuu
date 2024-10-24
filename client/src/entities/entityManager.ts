import Player, { Position } from "./player";
import { io, Socket } from "socket.io-client";

interface ServerToClientEvents {
    position_update: (socketId: string, position: Position) => void;
    player_id: (socketId: string, position: Position) => void;
    player_connected: (socketId: string) => void;
    player_disconnected: (socketId: string) => void;
    initial_players: (players: Record<string, Player>) => void;
    error: (errorMessage: string) => void;
}

interface ClientToServerEvents {
    client_movement: (movement: Position) => void;
}

class EntityManager {
    static #instance: EntityManager;
    mainPlayer!: Player;
    players: Map<string, Player>;

    socket: Socket<ServerToClientEvents, ClientToServerEvents>;
    socketId!: string;

    constructor() {
        EntityManager.#instance = this;

        this.socket = io("http://localhost:3000", {
            withCredentials: true,
        });

        this.socket.on("connect", () => {
            console.log("Client connected to server");
        });

        this.socket.on("player_id", (socketId: string, position: Position) => {
            this.socketId = socketId;
            this.mainPlayer = new Player(position, true);
        });

        this.socket.on("error", (errorMessage: string) => {
            console.error("Error from server:", errorMessage);
        });

        this.players = new Map();

        this.socket.on("initial_players", (players: Record<string, Player>) => {
            console.log("initial_players", players);
            for (const [socketId, player] of Object.entries(players)) {
                if (socketId === this.socketId) continue;
                console.log("Adding player", socketId);
                const newPlayer = new Player(player.position, false);
                this.players.set(socketId, newPlayer);
            }
        });
    }

    public static get getInstance(): EntityManager {
        return EntityManager.#instance;
    }

    public update(deltaTime: number) {
        if (this.mainPlayer) {
            this.mainPlayer.update(deltaTime);
        }

        for (const player of this.players.values()) {
            player.update(deltaTime);
        }
    }
}

export default EntityManager;