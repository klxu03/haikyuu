import Fastify from "fastify";
import { Server as HTTPServer } from "http";
import { Server, Socket } from "socket.io";
import cors from "@fastify/cors";

import PlayerManager from "./player";
import { Position, Player } from "./player";

interface ServerToClientEvents {
    position_update: (socketId: string, position: Position) => void;
    animation_update: (socketId: string, animation: string) => void;
    player_id: (socketId: string, position: Position) => void;
    player_connected: (socketId: string, position: Position) => void;
    player_disconnected: (socketId: string) => void;
    initial_players: (players: Record<string, Player>) => void;
    error: (errorMessage: string) => void;
}

interface ClientToServerEvents {
    client_movement: (movement: Position) => void;
    client_animation: (animation: string) => void;
}

class GameState {
    #numberOfPlayerSlots: number;
    playerManager: PlayerManager;

    constructor() {
        this.#numberOfPlayerSlots = 2;
        this.playerManager = new PlayerManager(this.#numberOfPlayerSlots);
    }

    public addPlayer(id: string): boolean {
        return this.playerManager.addPlayer(id, { x: 0, y: 0, z: 0 });
    }
}

const gameState = new GameState(); 

const server = Fastify({ logger: true });

const io = new Server<ClientToServerEvents, ServerToClientEvents>(server.server as HTTPServer, {
    cors: {
        origin: "http://localhost:5173",
        credentials: true,
    },
});

await server.register(cors, {
    origin: "http://localhost:5173",
    credentials: true,
});

io.on("connection", (socket: Socket<ClientToServerEvents, ServerToClientEvents>) => {
    console.log("Client connected:", socket.id);

    if (!gameState.addPlayer(socket.id)) {
        socket.emit("error", "The game is full");
        socket.disconnect(true);
        return;
    }

    socket.emit("player_id", socket.id, gameState.playerManager.getPlayer(socket.id)!.position);

    socket.broadcast.emit("player_connected", socket.id, gameState.playerManager.getPlayer(socket.id)!.position);
    socket.emit("initial_players", gameState.playerManager.getAllPlayers());

    socket.on("client_movement", (position: Position) => {
        gameState.playerManager.updatePlayerPosition(socket.id, position);
        socket.broadcast.emit("position_update", socket.id, {
            x: position.x,
            y: position.y,
            z: position.z,
        });
    });

    socket.on("client_animation", (animation: string) => {
        console.log("server received client_animation", socket.id, animation);
        socket.broadcast.emit("animation_update", socket.id, animation);
    });

    socket.on("disconnect", () => {
        console.log("Client disconnected:", socket.id);
        gameState.playerManager.removePlayer(socket.id);
        socket.broadcast.emit("player_disconnected", socket.id);
    });
});

try {
    await server.listen({ port: 3000 });
    console.log("Server is running on port 3000");
} catch (error) {
    server.log.error(error);
    process.exit(1);
}
