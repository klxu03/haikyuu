import * as THREE from "three";
import AssetManager from "../assets/assetManager";
import { InputManager } from "../input";

interface Position {
    x: number;
    y: number;
    z: number;
}

interface UpdatePosition {
    x?: number;
    y?: number;
    z?: number;
}

class Player {
    public mesh: THREE.Mesh;

    #inputManager: InputManager;

    readonly #moveSpeed = 0.1;
    readonly #jumpSpeed = this.#moveSpeed * 2;
    readonly #fallSpeed = this.#moveSpeed * 4;

    readonly #groundHeight = 0.5;

    public position: Position = { x: 0, y: this.#groundHeight, z: 0 };

    constructor() {
        this.mesh = AssetManager.getInstance.getMesh("player") as THREE.Mesh;
        this.#inputManager = InputManager.getInstance;
    }

    public update() {
        this.#handleMovement();
    }

    #handleMovement() {
        let moveX = 0;
        let moveZ = 0;

        if (this.#inputManager.keysPressed.w) moveZ -= this.#moveSpeed;
        if (this.#inputManager.keysPressed.s) moveZ += this.#moveSpeed;
        if (this.#inputManager.keysPressed.a) moveX -= this.#moveSpeed;
        if (this.#inputManager.keysPressed.d) moveX += this.#moveSpeed;

        // Normalize diagonal movement
        if (moveX !== 0 && moveZ !== 0) {
            const normalizer = Math.sqrt(2) / 2;
            moveX *= normalizer;
            moveZ *= normalizer;
        }

        this.position.x += moveX;
        this.position.z += moveZ;

        // Calculate rotation based on movement direction
        if (moveX !== 0 || moveZ !== 0) {
            const angle = Math.atan2(-moveX, -moveZ);
            this.mesh.rotation.y = angle;
        }

        // Handle space key
        if (this.#inputManager.keysPressed.space) {
            this.updatePositionDeltas({ y: this.#jumpSpeed });
        } else if (this.position.y > this.#groundHeight) {
            if (this.position.y - this.#groundHeight <= this.#fallSpeed) {
                this.position.y = this.#groundHeight;
            } else {
                this.updatePositionDeltas({ y: -this.#fallSpeed });
            }
        }

        this.mesh.position.set(this.position.x, this.position.y, this.position.z);
    }

    /**
     * Update the player's position by the given deltas
     * @param position UpdatePosition interface with optional parameters for x y z
     */
    public updatePositionDeltas(position: UpdatePosition) {
        console.log("positions", {position}, this.position);
        if (position.x !== undefined) this.position.x += position.x;
        if (position.y !== undefined) this.position.y += position.y;
        if (position.z !== undefined) this.position.z += position.z;
        console.log("updated position", this.position);

        this.mesh.position.set(this.position.x, this.position.y, this.position.z);
    }
}

export default Player;