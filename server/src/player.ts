import type { JumpPayload, JumpCollision, Position } from "./index";

interface Player {
    id: string;
    position: Position;
}

class PlayerManager {
    #players: Map<string, Player> = new Map();
    #numberOfPlayerSlots: number;
    #numberOfPlayers: number;
    readonly #JUMP_PEAK_DURATION = 0.75 * 1000;

    constructor(numberOfPlayerSlots: number) {
        this.#players = new Map();
        this.#numberOfPlayerSlots = numberOfPlayerSlots;
        this.#numberOfPlayers = 0;
    }

    /**
     * 
     * @param id the socketId of the player 
     * @param position the initial position of the player
     * @returns true if the player was added, false if the player slots are full
     */
    public addPlayer(id: string, position: Position): boolean {
        if (this.#numberOfPlayers >= this.#numberOfPlayerSlots) {
            return false;
        }

        this.#players.set(id, { id, position });
        this.#numberOfPlayers++;
        return true;
    }

    public removePlayer(id: string): void {
        if (this.#players.delete(id)) {
            this.#numberOfPlayers--;
        }
    }

    public updatePlayerPosition(id: string, position: Position): void {
        const player = this.#players.get(id);
        if (player) {
            player.position = position;
            // console.log("Updating player", id, "position to", position);
        }
    }

    public getPlayer(id: string): Player | undefined {
        return this.#players.get(id);
    }

    public getAllPlayers(): Record<string, Player> {
        return Object.fromEntries(this.#players.entries());
    }

    public calculateJumpCollision(id: string, gravity: number, ballPosition: Position, jumpPayload: JumpPayload): JumpCollision {
        const player = this.#players.get(id)!;

        const playerPosition = {
            x: player.position.x + jumpPayload.dX,
            y: player.position.y,
            z: player.position.z + jumpPayload.dZ,
        };

        const distance = Math.sqrt((playerPosition.x - ballPosition.x) ** 2 + (playerPosition.y - ballPosition.y) ** 2 + (playerPosition.z - ballPosition.z) ** 2);
        const jumpCollision: JumpCollision = {
            ballVelocity: null,
            jumpVelocity: 0.2, // max jump force
            rotation: -1,
        };

        if (distance <= 2.5) {
            let jumpVector = [ballPosition.x - playerPosition.x, ballPosition.y - playerPosition.y, ballPosition.z - playerPosition.z];

            // normalize jumpVector to magnitude of 1
            const jumpMagnitude = Math.sqrt(jumpVector[0] ** 2 + jumpVector[1] ** 2 + jumpVector[2] ** 2);
            jumpVector = [jumpVector[0] / jumpMagnitude, jumpVector[1] / jumpMagnitude, jumpVector[2] / jumpMagnitude];

            jumpCollision.ballVelocity = [jumpVector[0] * 0.5, 0.4, -0.6];

            jumpCollision.rotation = Math.atan2(jumpVector[0], jumpVector[2]);

            const heightDiff = (ballPosition.y - 0.5) - playerPosition.y;
            console.log("heightDiff", heightDiff);
            const requiredJumpForce = Math.sqrt(2 * gravity * (heightDiff + 0.5));
            jumpCollision.jumpVelocity = Math.min(requiredJumpForce, jumpCollision.jumpVelocity);
        }

        return jumpCollision;
    }
}

export default PlayerManager;
export type { Player };