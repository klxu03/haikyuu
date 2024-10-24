interface Position {
    x: number;
    y: number;
    z: number;
}

interface Player {
    id: string;
    position: Position;
}

class PlayerManager {
    #players: Map<string, Player> = new Map();
    #numberOfPlayerSlots: number;
    #numberOfPlayers: number;

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
            console.log("Updating player", id, "position to", position);
        }
    }

    public getPlayer(id: string): Player | undefined {
        return this.#players.get(id);
    }

    public getAllPlayers(): Record<string, Player> {
        return Object.fromEntries(this.#players.entries());
    }
}

export default PlayerManager;
export type { Position, Player };