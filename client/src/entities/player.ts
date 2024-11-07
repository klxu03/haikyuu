import * as THREE from "three";
import AssetManager from "../assets/assetManager";
import { InputManager } from "../input";
import type { GLTFResult } from "../assets/assetManager";
import AnimationChain, { type AnimationLink } from "../assets/animationChain";
import EntityManager from "./entityManager";
import { Socket } from "socket.io-client";
import Renderer from "../render";
import Ball from "./ball";

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

interface JumpPayload {
    rotation: number; // ending rotation of the player, in radians, -1 means no change
    jumpVelocity: number;
}

interface HitBallPayload {
    ballPosition: Position;
    initialBallVelocity: [number, number, number];
}

interface ServerToClientEvents {
    player_id: (socketId: string) => void;
}

interface ClientToServerEvents {
    client_movement: (movement: Position) => void;
    client_animation: (animation: string) => void;
    client_jump: (payload: JumpPayload) => void;
    client_hit_ball: (payload: HitBallPayload) => void;
}

class Player {
    public gltfResult: GLTFResult;

    #inputManager: InputManager;

    readonly #moveSpeed = 0.1;
    readonly #moveSpeedDiagonal = this.#moveSpeed * Math.sqrt(2) / 2;

    readonly #groundHeight = 0;

    public position: Position;
    #isMainPlayer: boolean;

    #assetManager: AssetManager;
    #animationMixer: THREE.AnimationMixer;

    #idleLink: AnimationLink;
    #animationChain: AnimationChain | null = null;
    #currentlyPlayingIdle: boolean = false;
    #currentlyPlayingAnimationChain: boolean = false;
    #animationChainManager: Map<string, AnimationChain> = new Map();

    #socket: Socket<ServerToClientEvents, ClientToServerEvents>;

    #renderer: Renderer;

    #boundingCylinder: THREE.Mesh;
    #ball: Ball;

    /**
     * The team number of the player. 1 means team that hits towards negative z, 2 means team that hits towards positive z
     */
    #team: number;

    constructor(position: Position = { x: 0, y: this.#groundHeight, z: 0 }, isMainPlayer: boolean = false, team: number = 0) {
        this.position = position;
        this.gltfResult = AssetManager.getInstance.getPlayerObject();
        this.gltfResult.scene.position.set(this.position.x, this.position.y, this.position.z);
        
        this.#renderer = Renderer.getInstance;
        this.#renderer.scene.add(this.gltfResult.scene);
        
        console.log("constructed main player", isMainPlayer, "placed at position", this.position);

        this.#isMainPlayer = isMainPlayer;

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
        
        this.#socket = EntityManager.getInstance.socket;
        this.#ball = EntityManager.getInstance.ball;

        const playerRadius = 0.5;
        const playerHeight = false ? 3.1 : 0.1;
        const cylinderGeometry = new THREE.CylinderGeometry(playerRadius, playerRadius, playerHeight, 32);
        const cylinderMaterial = new THREE.MeshBasicMaterial({ 
            transparent: true, 
            opacity: 0.2,
            depthWrite: false 
        });
        this.#boundingCylinder = new THREE.Mesh(cylinderGeometry, cylinderMaterial);
        this.#renderer.scene.add(this.#boundingCylinder);
    }

    /**
     * Update the player's position and animations
     * @param deltaTime The time since the last update
     */
    public update(deltaTime: number, position: Position, jumpVelocity: number) {
        this.handleMovement(position, jumpVelocity);
        this.#updateAnimations(deltaTime);

        const worldPosition = new THREE.Vector3();
        this.gltfResult.scene.getWorldPosition(worldPosition);
        this.#boundingCylinder.position.copy(worldPosition);
    }

    #handleKeyUp(event: KeyboardEvent) {
        if (this.#currentlyPlayingAnimationChain) return;

        const movementKeys = ["w", "a", "s", "d"];
        if (movementKeys.includes(event.key)) {
            this.#queueAnimation("idle");
        }
    }

    #jumpVelocity = 0;

    /**
     * Calculate the rotation of the player to face the ball while jumping
     * @returns The rotation of the player to face the ball (before and after jump), in radians
     * @returns -1 if the player will not hit the ball
     */
    #calculateJumpPayload(): JumpPayload {
        let rotation = -1;
        const distance = Math.sqrt((this.position.x - this.#ball.position.x) ** 2 + (this.position.z - this.#ball.position.z) ** 2);

        if (distance <= 2 && this.#ball.position.y <= 4) {
            let jumpVector = [this.#ball.position.x - this.position.x, this.#ball.position.y - this.position.y, this.#ball.position.z - this.position.z];
            const jumpMagnitude = Math.sqrt(jumpVector[0] ** 2 + jumpVector[1] ** 2 + jumpVector[2] ** 2);
            jumpVector = [jumpVector[0] / jumpMagnitude, jumpVector[1] / jumpMagnitude, jumpVector[2] / jumpMagnitude];

            rotation = Math.atan2(jumpVector[0], jumpVector[2]);

            this.#ball.velocity = [jumpVector[0] * 0.5, 0.4, this.#team === 1 ? -0.6 : 0.6];

            const heightDiff = this.#ball.position.y - this.position.y;
            const requiredJumpForce = Math.sqrt(2 * EntityManager.getInstance.gravity * (heightDiff + 0.5));
            this.#jumpVelocity = Math.min(0.2, requiredJumpForce);
        }

        return { rotation, jumpVelocity: this.#jumpVelocity };
    }

    public async handleJump(jumpVelocity: number = 0, rotation: number = -1) {
        if (this.#isMainPlayer) {
            const jumpMagnitude = 0.42;
            const dX = Math.sin(this.gltfResult.scene.rotation.y) * jumpMagnitude;
            const dZ = Math.cos(this.gltfResult.scene.rotation.y) * jumpMagnitude;

            this.updatePositionDeltas({ x: dX, y: 0, z: dZ });

            const jumpPayload = this.#calculateJumpPayload();
            if (jumpPayload.rotation !== -1) {
                this.gltfResult.scene.rotation.y = jumpPayload.rotation;
            }

            this.#socket.emit("client_jump", jumpPayload);
        } else {
            this.#jumpVelocity = jumpVelocity;

            if (rotation !== -1) {
                console.log("server sent rotation", rotation);
                this.gltfResult.scene.rotation.y = rotation;
            }
        }

        this.#queueAnimation("jump");
    }

    public handleMovement(position: Position, jumpVelocity: number) {
        if (this.#currentlyPlayingAnimationChain) return;
        let changedPosition = false;

        let moveX = 0;
        let moveZ = 0;
        this.#jumpVelocity = jumpVelocity;

        if (this.#isMainPlayer) {
            if (this.#inputManager.keysPressed.w) moveZ -= this.#moveSpeed;
            if (this.#inputManager.keysPressed.s) moveZ += this.#moveSpeed;
            if (this.#inputManager.keysPressed.a) moveX -= this.#moveSpeed;
            if (this.#inputManager.keysPressed.d) moveX += this.#moveSpeed;

            // Handle space key
            if (this.#inputManager.keysPressed.space) {
                this.#animationChain!.stop();
                this.#currentlyPlayingAnimationChain = true;
                this.handleJump();
            }
        } 

        // Normalize diagonal movement
        if (moveX !== 0 && moveZ !== 0) {
            const normalizer = Math.sqrt(2) / 2;
            moveX *= normalizer;
            moveZ *= normalizer;
        }

        if (!this.#isMainPlayer) {
            moveX = position.x - this.position.x;
            moveZ = position.z - this.position.z;
        }

        if (moveX !== 0 || moveZ !== 0) {
            if ((Math.abs(Math.abs(moveX) - this.#moveSpeed) < 0.001 || Math.abs(Math.abs(moveZ) - this.#moveSpeed) < 0.001) || 
                (Math.abs(Math.abs(moveX) - this.#moveSpeedDiagonal) < 0.001 && Math.abs(Math.abs(moveZ) - this.#moveSpeedDiagonal) < 0.001)) {
                if (this.#currentlyPlayingIdle) {
                    this.#queueAnimation("slow_run");
                }

                // Calculate rotation based on movement direction
                const angle = Math.atan2(moveX, moveZ);
                this.gltfResult.scene.rotation.y = angle;
                changedPosition = true;
            }

            this.updatePositionDeltas({ x: moveX, z: moveZ });
        }

        if (changedPosition) {
            this.gltfResult.scene.position.set(this.position.x, this.position.y, this.position.z);
        }
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
        if (this.#isMainPlayer) {
            // if jumping, don't need to send movement updates
            if (position.y !== undefined && position.y !== 0) return;

            this.#socket.emit("client_movement", this.position);
        }
    }

    #initAnimationChainManager() {
        // idle animation
        const idleAnimationChain = new AnimationChain(this.#animationMixer, false, [this.#idleLink]);
        this.#animationChainManager.set("idle", idleAnimationChain);

        // jump animation
        const [jumpAnimation, jumpAnimationOptions] = this.#assetManager.animations.get("jump3")!;
        let start = () => {
            this.#currentlyPlayingAnimationChain = true;
            this.#jumpTime = 0;
            // move the player up a bit to account for jumping forward
            console.log("starting jump rotation", this.gltfResult.scene.rotation.y);
            this.gltfResult.scene.rotation.y += THREE.MathUtils.degToRad(jumpAnimationOptions.rotation!);
        }

        let update = (deltaTime: number) => {
            this.#jumpTime += deltaTime;
            if (this.#jumpTime < 0.54 - 0.09) return;

            if (this.#jumpTime > 0.75 && this.position.y - this.#groundHeight <= -this.#jumpVelocity) {
                this.updatePositionDeltas({ y: -(this.position.y - this.#groundHeight) });
            } else {
                this.updatePositionDeltas({ y: this.#jumpVelocity });
                this.#jumpVelocity -= EntityManager.getInstance.gravity;
            }
        }

        let end = () => {
            this.gltfResult.scene.rotation.y -= THREE.MathUtils.degToRad(jumpAnimationOptions.rotation!);
            console.log("ending jump rotation", this.gltfResult.scene.rotation.y);
            this.#currentlyPlayingAnimationChain = false;
        }
        
        const jumpAnimationChain = new AnimationChain(this.#animationMixer, false, [{ clip: jumpAnimation, update, start, end, loopable: jumpAnimationOptions.loopable! }, this.#idleLink]);
        this.#animationChainManager.set("jump", jumpAnimationChain);

        // slow_run animation
        const [slowRunAnimation, slowRunAnimationOptions] = this.#assetManager.animations.get("slow_run")!;
        start = () => {
            this.#currentlyPlayingIdle = false;
            console.log("started slow run, currently playing idle:", this.#currentlyPlayingIdle);
        };

        end = () => {
        }

        const slowRunAnimationChain = new AnimationChain(this.#animationMixer, true, [{ clip: slowRunAnimation, update: (deltaTime: number) => { }, start, end, loopable: slowRunAnimationOptions.loopable! }, this.#idleLink]);
        this.#animationChainManager.set("slow_run", slowRunAnimationChain);

        // TODO: Add other animations
    }

    /**
     * Start an animation
     * @param name The name of the animation to start
     */
    public async startAnimation(name: string) {
        if (name === "slow_run") return;
        if (name === "jump") return;
        console.log("startAnimation", name);

        await this.#queueAnimation(name);
    }

    #jumpTime = 0;

    async #queueAnimation(name: string) {
        if (this.#animationMixer && this.#animationChainManager.has(name)) {
            try {
                if (this.#isMainPlayer) {
                    this.#socket.emit("client_animation", name);
                    console.log("emitted client_animation", name);
                }
            } catch (error) {
                console.error("Error emitting client_animation", error);
            }

            if (!this.#currentlyPlayingIdle) {
                await this.#animationChain?.stop();
            } else {
                this.#animationChain?.stop();
            }
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
export type { Position };