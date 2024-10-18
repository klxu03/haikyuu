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
    #currentlyPlayingIdle: boolean = false;
    #currentlyPlayingAnimationChain: boolean = false;
    #animationChainManager: Map<string, AnimationChain> = new Map();

    constructor() {
        this.gltfResult = AssetManager.getInstance.getGLTF("player");
        this.#inputManager = InputManager.getInstance;

        this.#assetManager = AssetManager.getInstance;
        this.#animationMixer = new THREE.AnimationMixer(this.gltfResult.scene);

        this.#idleLink = { clip: (this.#assetManager.animations.get("idle")!)[0], update: (deltaTime: number) => { }, start: () => { 
            this.#currentlyPlayingAnimationChain = false; 
            this.#currentlyPlayingIdle = true;
        }, end: () => { 
            this.#currentlyPlayingIdle = false;
        }, loopable: true };
        this.#initAnimationChainManager();

        this.#queueAnimation("idle");
        window.addEventListener("keyup", this.#handleKeyUp.bind(this));
    }

    /**
     * Update the player's position and animations
     * @param deltaTime The time since the last update
     */
    public update(deltaTime: number) {
        this.#handleMovement();
        this.#updateAnimations(deltaTime);
    }

    #handleKeyUp(event: KeyboardEvent) {
        const movementKeys = ["w", "a", "s", "d"];
        if (movementKeys.includes(event.key)) {
            this.#queueAnimation("idle");
        }
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

        if (moveX !== 0 || moveZ !== 0) {
            if (this.#currentlyPlayingIdle) {
                this.#queueAnimation("slow_run");
            }
            this.updatePositionDeltas({ x: moveX, z: moveZ });

            // Calculate rotation based on movement direction
            const angle = Math.atan2(moveX, moveZ);
            this.gltfResult.scene.rotation.y = angle;
        }

        // Handle space key
        if (this.#inputManager.keysPressed.space) {
            this.#animationChain!.stop();
            this.#currentlyPlayingAnimationChain = true;
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

        this.gltfResult.scene.position.add(new THREE.Vector3(position.x ?? 0, position.y ?? 0, position.z ?? 0));
    }

    #initAnimationChainManager() {
        // idle animation
        const idleAnimationChain = new AnimationChain(this.#animationMixer, [this.#idleLink]);
        this.#animationChainManager.set("idle", idleAnimationChain);

        // jump animation
        const [jumpAnimation, jumpAnimationOptions] = this.#assetManager.animations.get("jump")!;
        let start = () => {
            this.#currentlyPlayingAnimationChain = true;
            this.#jumpTime = 0;
            // move the player up a bit to account for jumping forward
            const jumpMagnitude = 0.65;
            const dX = Math.sin(this.gltfResult.scene.rotation.y) * jumpMagnitude;
            const dZ = Math.cos(this.gltfResult.scene.rotation.y) * jumpMagnitude;
            this.updatePositionDeltas({ x: dX, y: 0, z: dZ });

            this.gltfResult.scene.rotation.y += THREE.MathUtils.degToRad(jumpAnimationOptions.rotation!);
        }

        let update = (deltaTime: number) => {
            this.#jumpTime += deltaTime;
            if (this.#jumpTime < 1.28) return;

            if (this.#jumpTime < 1.57) {
                this.updatePositionDeltas({ y: this.#jumpSpeed });
            } else {
                if (this.position.y - this.#groundHeight <= this.#fallSpeed) {
                    this.position.y = this.#groundHeight;
                } else {
                    this.updatePositionDeltas({ y: -this.#fallSpeed });
                }
            }
        }

        let end = () => {
            this.gltfResult.scene.rotation.y -= THREE.MathUtils.degToRad(jumpAnimationOptions.rotation!);
            this.#currentlyPlayingAnimationChain = false;
        }
        
        const jumpAnimationChain = new AnimationChain(this.#animationMixer, [{ clip: jumpAnimation, update, start, end, loopable: jumpAnimationOptions.loopable! }, this.#idleLink]);
        this.#animationChainManager.set("jump", jumpAnimationChain);

        // slow_run animation
        const [slowRunAnimation, slowRunAnimationOptions] = this.#assetManager.animations.get("slow_run")!;
        start = () => {
            this.#currentlyPlayingIdle = false;
        };

        end = () => {
        }

        const slowRunAnimationChain = new AnimationChain(this.#animationMixer, [{ clip: slowRunAnimation, update: (deltaTime: number) => { }, start, end, loopable: slowRunAnimationOptions.loopable! }, this.#idleLink]);
        this.#animationChainManager.set("slow_run", slowRunAnimationChain);

        // TODO: Add other animations
    }

    #jumpTime = 0;
    #queueAnimation(name: string) {
        if (this.#animationMixer && this.#animationChainManager.has(name)) {
            this.#animationChain?.stop();
            this.#animationChain = this.#animationChainManager.get(name)!;
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