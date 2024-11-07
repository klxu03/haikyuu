import Fastify from "fastify";
import { Server as HTTPServer } from "http";
import { Server, Socket } from "socket.io";
import cors from "@fastify/cors";

import PlayerManager from "./player";
import { Player } from "./player";

interface Position {
    x: number;
    y: number;
    z: number;
}

interface JumpPayload {
    rotation: number; // ending rotation of the player, in radians, -1 means no change
    jumpVelocity: number;
}

interface HitBallPayload {
    ballPosition: Position;
    initialBallVelocity: [number, number, number];
}

interface ServerToClientEvents {
    position_update: (socketId: string, position: Position) => void;
    animation_update: (socketId: string, animation: string) => void;
    player_id: (socketId: string, position: Position) => void;
    player_connected: (socketId: string, position: Position) => void;
    player_disconnected: (socketId: string) => void;
    initial_players: (players: Record<string, Player>) => void;
    error: (errorMessage: string) => void;
    player_jump: (socketId: string, jumpPayload: JumpPayload) => void;
    player_hit_ball: (socketId: string, hitBallPayload: HitBallPayload) => void;
}

interface ClientToServerEvents {
    client_movement: (movement: Position) => void;
    client_animation: (animation: string) => void;
    client_jump: (payload: JumpPayload) => void;
    client_hit_ball: (payload: HitBallPayload) => void;
}

class GameState {
    #numberOfPlayerSlots: number;
    #socket: Server<ClientToServerEvents, ServerToClientEvents>;
    playerManager: PlayerManager;

    ballActive: boolean;
    ballPosition: Position;
    ballVelocity: [number, number, number];

    readonly GRAVITY = 0.015;
    readonly BALL_GRAVITY = 0.015;
    readonly BALL_RADIUS = 0.2;

    constructor(socket: Server<ClientToServerEvents, ServerToClientEvents>) {
        this.#numberOfPlayerSlots = 2;
        this.playerManager = new PlayerManager(this.#numberOfPlayerSlots);

        this.#socket = socket;

        this.ballActive = false;
        this.ballPosition = { x: 0, y: 4, z: 0 };
        this.ballVelocity = [0, 0.2, 0];
    }

    public addPlayer(id: string): boolean {
        return this.playerManager.addPlayer(id, { x: 0, y: 0, z: 0 });
    }

    public startBallSimulation() {
        this.ballActive = true;
        this.#simulateBallStep();
    }

    public stopBallSimulation() {
        this.ballActive = false;
    }

    #simulateBallStep() {
        if (!this.ballActive) {
            return;
        }

        setTimeout(() => {
            this.#simulateBallStep();
        }, 30);
    }
}

const server = Fastify({ logger: true });

const io = new Server<ClientToServerEvents, ServerToClientEvents>(server.server as HTTPServer, {
    cors: {
        origin: "http://localhost:5173",
        credentials: true,
    },
});

const gameState = new GameState(io);
gameState.startBallSimulation();

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

    socket.on("client_jump", (payload: JumpPayload) => {
        socket.broadcast.emit("player_jump", socket.id, payload);
    });

    socket.on("client_hit_ball", (payload: HitBallPayload) => {
        socket.broadcast.emit("player_hit_ball", socket.id, payload);
    });
});

try {
    await server.listen({ port: 3000 });
    console.log("Server is running on port 3000");
} catch (error) {
    server.log.error(error);
    process.exit(1);
}

export type { Position };
