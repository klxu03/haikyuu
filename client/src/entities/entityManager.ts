import Player, { Position } from "./player";
import Ball from "./ball";
import { io, Socket } from "socket.io-client";

interface JumpCollision {
    ballVelocity: [number, number, number] | null; // null if ball is not being hit
    jumpVelocity: number;
    rotation: number; // ending rotation of the player, in radians
}

interface ServerToClientEvents {
    position_update: (socketId: string, position: Position) => void;
    animation_update: (socketId: string, animation: string) => void;
    player_id: (socketId: string, position: Position) => void;
    player_connected: (socketId: string, position: Position) => void;
    player_disconnected: (socketId: string) => void;
    initial_players: (players: Record<string, Player>) => void;
    error: (errorMessage: string) => void;
    player_jump: (socketId: string, jumpCollision: JumpCollision) => void;
    ball_position: (position: Position) => void;
}

interface ClientToServerEvents {
    client_movement: (movement: Position) => void;
    client_animation: (animation: string) => void;
}

class EntityManager {
    static #instance: EntityManager;
    mainPlayer!: Player;
    players: Map<string, [Player, Position]>;
    ball: Ball;
    #ballPosition: Position;
    public readonly gravity = 0.015;

    socket: Socket<ServerToClientEvents, ClientToServerEvents>;
    socketId!: string;

    constructor() {
        EntityManager.#instance = this;
        this.ball = new Ball();
        this.#ballPosition = { x: 0, y: 0.5, z: 0 };

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
                this.players.set(socketId, [newPlayer, player.position]);
            }
        });

        this.socket.on("player_connected", (socketId: string, position: Position) => {
            const newPlayer = new Player(position, false);
            this.players.set(socketId, [newPlayer, position]);
        });

        this.socket.on("position_update", (socketId: string, position: Position) => {
            if (socketId === this.socketId) return;
            const player = this.players.get(socketId);
            if (player) {
                player[1] = position;
            }
        });

        this.socket.on("animation_update", (socketId: string, animation: string) => {
            console.log("client received animation_update", { socketId, animation });
            if (socketId === this.socketId) return;
            const player = this.players.get(socketId);
            if (player) {
                player[0].startAnimation(animation);
            }
        });

        this.socket.on("player_jump", (socketId: string, jumpCollision: JumpCollision) => {
            if (socketId === this.socketId) return;
            const player = this.players.get(socketId);
            if (player) {
                player[0].handleJump(jumpCollision.jumpVelocity, jumpCollision.rotation);
            }
        });

        this.socket.on("ball_position", (position: Position) => {
            console.log("server updated ball_position", position);
            this.#ballPosition = position;
        });
    }

    public static get getInstance(): EntityManager {
        return EntityManager.#instance;
    }

    public update(deltaTime: number) {
        if (this.mainPlayer) {
            this.mainPlayer.update(deltaTime, this.mainPlayer.position, 0.2);
        }

        for (const player of this.players.values()) {
            player[0].update(deltaTime, player[1], 0.2);
        }

        // update ball position
        this.ball.updatePosition(this.#ballPosition);
    }
}

export default EntityManager;