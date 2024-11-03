import { Position } from "./player";

class Ball {
    public position: Position;

    constructor() {
        this.position = { x: 0, y: 0, z: 0 };
    }
}

export default Ball;