import * as THREE from "three";
import AssetManager from "../assets/assetManager";
import { InputManager } from "../input";
import type { GLTFResult } from "../assets/assetManager";

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
    public gltfResult: GLTFResult;

    #inputManager: InputManager;

    readonly #moveSpeed = 0.1;
    readonly #jumpSpeed = this.#moveSpeed * 2;
    readonly #fallSpeed = this.#moveSpeed * 4;

    readonly #groundHeight = 0;

    public position: Position = { x: 0, y: this.#groundHeight, z: 0 };

    #assetManager: AssetManager;
    #animationMixer: THREE.AnimationMixer;

    constructor() {
        this.gltfResult = AssetManager.getInstance.getGLTF("player");
        this.#inputManager = InputManager.getInstance;

        this.#assetManager = AssetManager.getInstance;
        this.#animationMixer = new THREE.AnimationMixer(this.gltfResult.scene);
    }

    /**
     * Update the player's position and animations
     * @param deltaTime The time since the last update
     */
    public update(deltaTime: number) {
        this.#handleMovement();
        this.#updateAnimations(deltaTime);
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
            const angle = Math.atan2(moveX, moveZ);
            this.gltfResult.scene.rotation.y = angle;
        }

        // Handle space key
        if (this.#inputManager.keysPressed.space) {
            this.#playAnimation("jump");
            this.updatePositionDeltas({ y: this.#jumpSpeed });
        } else if (this.position.y > this.#groundHeight) {
            if (this.position.y - this.#groundHeight <= this.#fallSpeed) {
                this.position.y = this.#groundHeight;
            } else {
                this.updatePositionDeltas({ y: -this.#fallSpeed });
            }
        }

        this.gltfResult.scene.position.set(this.position.x, this.position.y, this.position.z);
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

        this.gltfResult.scene.position.set(this.position.x, this.position.y, this.position.z);
    }

    #playAnimation(name: string) {
        if (this.#animationMixer && this.#assetManager.animations.has(name)) {
            const animation = this.#assetManager.animations.get(name)!;
            const action = this.#animationMixer.clipAction(animation);
            action.play();
            console.log(`Playing animation: ${name}`);
        } else {
            console.warn(`Animation '${name}' not found or animation mixer not initialized`);
        }
    }

    #updateAnimations(deltaTime: number) {
        if (this.#animationMixer) {
            this.#animationMixer.update(deltaTime);
        }
    }
}

export default Player;