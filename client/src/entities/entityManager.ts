import Player from "./player";

class EntityManager {
    static #instance: EntityManager;
    mainPlayer: Player;
    players: Player[];

    constructor() {
        EntityManager.#instance = this;

        this.mainPlayer = new Player();
        this.players = [];
    }

    public static get getInstance(): EntityManager {
        return EntityManager.#instance;
    }
}

export default EntityManager;