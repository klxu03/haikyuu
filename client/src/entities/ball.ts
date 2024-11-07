import * as THREE from "three";
import { Position } from "./player";
import Renderer from "../render";

class Ball {
    public position: Position;
    public velocity: [number, number, number];

    readonly #gravity: number;

    #renderer: Renderer;
    #ball: THREE.Mesh;

    /**
     * The timestamp of the last collision
     */
    #lastCollision: number;

    /**
     * The initial position of the ball from the last collision
     */
    #initialPosition: Position;

    constructor(gravity: number) {
        this.#gravity = gravity;
        this.position = { x: 0, y: 3, z: 2 };
        this.velocity = [0, 0, 0];

        const ballRadius = 0.2;
        const ballGeometry = new THREE.SphereGeometry(ballRadius);
        const ballMaterial = new THREE.MeshPhongMaterial({ color: 0xff0000 });
        this.#ball = new THREE.Mesh(ballGeometry, ballMaterial);
        this.#ball.position.set(this.position.x, this.position.y, this.position.z);

        this.#renderer = Renderer.getInstance;
        this.#renderer.scene.add(this.#ball);

        this.#lastCollision = 0;
        this.#initialPosition = { ...this.position };
    }

    public updatePosition() {
        const elapsedTime = (Date.now() - this.#lastCollision) / 50;
        const newPosition = {
            x: this.#initialPosition.x + this.velocity[0] * elapsedTime,
            z: this.#initialPosition.z + this.velocity[2] * elapsedTime,
            y: this.#initialPosition.y + (this.velocity[1] * elapsedTime) + (-0.5 * this.#gravity * elapsedTime ** 2)
        };

        if (newPosition.y <= 0.2) {
            newPosition.y = 0.2;
            this.#initialPosition = { ...newPosition };
            this.velocity = [0, 0, 0];

            // wait 8 seconds before resetting the initial position
            setTimeout(() => {
                this.#initialPosition = { x: 0, y: 3, z: 2 };
            }, 8000);
        }

        this.#ball.position.set(newPosition.x, newPosition.y, newPosition.z);

        console.log("new ball position", newPosition);
    }

    public updateVelocity(velocity: [number, number, number]) {
        this.#lastCollision = Date.now();
        this.#initialPosition = { ...this.position };

        this.velocity = velocity;
    }
}

export default Ball;