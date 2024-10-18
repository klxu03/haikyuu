import * as THREE from "three";
import AssetManager from "../assets/assetManager";
import { InputManager } from "../input";
import type { GLTFResult } from "../assets/assetManager";
import AnimationChain, { type AnimationLink } from "../assets/animationChain";

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
    readonly #jumpSpeed = this.#moveSpeed * 0.5;
    readonly #fallSpeed = this.#jumpSpeed * 1.35;

    readonly #groundHeight = 0;

    public position: Position = { x: 0, y: this.#groundHeight, z: 0 };

    #assetManager: AssetManager;
    #animationMixer: THREE.AnimationMixer;

    #idleLink: AnimationLink;
    #animationChain: AnimationChain | null = null;
    #currentlyPlayingAnimationChain: boolean = false;

    constructor() {
        this.gltfResult = AssetManager.getInstance.getGLTF("player");
        this.#inputManager = InputManager.getInstance;

        this.#assetManager = AssetManager.getInstance;
        this.#animationMixer = new THREE.AnimationMixer(this.gltfResult.scene);

        this.#idleLink = {clip: (this.#assetManager.animations.get("idle")!)[0], update: (deltaTime: number) => {}, start: () => {}, end: () => {}};

        this.#animationChain = null;
        this.#queueAnimation("idle");
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
        if (this.#currentlyPlayingAnimationChain) return;

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
            console.log({moveX, moveZ});
            const angle = Math.atan2(moveX, moveZ);
            console.log("rad:", angle, THREE.MathUtils.radToDeg(angle));
            this.gltfResult.scene.rotation.y = angle;
        }

        // Handle space key
        if (this.#inputManager.keysPressed.space) {
            console.log("space", {moveX, moveZ});
            this.#animationChain!.stop();
            this.#queueAnimation("jump");
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
        if (position.x !== undefined) this.position.x += position.x;
        if (position.y !== undefined) this.position.y += position.y;
        if (position.z !== undefined) this.position.z += position.z;

        this.gltfResult.scene.position.set(this.position.x, this.position.y, this.position.z);
    }

    #jumpTime = 0;
    #queueAnimation(name: string) {
        if (this.#animationMixer && this.#assetManager.animations.has(name)) {
            const [animation, animationOptions] = this.#assetManager.animations.get(name)!;

            let update = (deltaTime: number) => {};
            let start = () => {};
            let end = () => {};

            // TODO: Use a speed up factor, or something else to make the jump go less high, lower point of contact
            const speedUpFactor = 1;

            if (name === "jump") {
                start = () => {
                    this.#currentlyPlayingAnimationChain = true;
                    this.#jumpTime = 0;
                    // move the player up a bit to account for jumping forward
                    const jumpMagnitude = 0.65;
                    const dX = Math.sin(this.gltfResult.scene.rotation.y) * jumpMagnitude;
                    const dZ = Math.cos(this.gltfResult.scene.rotation.y) * jumpMagnitude;
                    this.updatePositionDeltas({x: dX, y: 0, z: dZ});

                    this.gltfResult.scene.rotation.y += THREE.MathUtils.degToRad(animationOptions.rotation!);
                }

                update = (deltaTime: number) => {
                    this.#jumpTime += deltaTime;
                    console.log("deltaTime:", deltaTime, "jumpTime:", this.#jumpTime);
                    if (this.#jumpTime < 1.28/speedUpFactor) return;
                    
                    if (this.#jumpTime < 1.57/speedUpFactor) {
                        this.updatePositionDeltas({ y: this.#jumpSpeed });
                    } else {
                        if (this.position.y - this.#groundHeight <= this.#fallSpeed) {
                            this.position.y = this.#groundHeight;
                        } else {
                            this.updatePositionDeltas({ y: -this.#fallSpeed });
                        }
                    }
                }

                end = () => {
                    this.gltfResult.scene.rotation.y -= THREE.MathUtils.degToRad(animationOptions.rotation!);
                    this.#currentlyPlayingAnimationChain = false;
                }
            }

            this.#animationChain = new AnimationChain(this.#animationMixer, [{clip: animation, update, start, end}, this.#idleLink]);
            this.#animationChain.start();
        } else {
            console.warn(`Animation '${name}' not found or animtion mixer not initialized`);
        }
    }

    #updateAnimations(deltaTime: number) {
        if (this.#animationChain) {
            this.#animationChain.update(deltaTime);
        }
    }
}

export default Player;