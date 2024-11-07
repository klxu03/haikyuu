import * as THREE from "three";
import { Position } from "./player";
import Renderer from "../render";

class Ball {
    public position: Position;
    public velocity: [number, number, number];

    #renderer: Renderer;
    #ball: THREE.Mesh;

    constructor() {
        this.position = { x: 0, y: 3, z: 0 };
        this.velocity = [0, 0, 0];

        const ballRadius = 0.2;
        const ballGeometry = new THREE.SphereGeometry(ballRadius);
        const ballMaterial = new THREE.MeshPhongMaterial({ color: 0xff0000 });
        this.#ball = new THREE.Mesh(ballGeometry, ballMaterial);
        this.#ball.position.set(this.position.x, this.position.y, this.position.z);

        this.#renderer = Renderer.getInstance;
        this.#renderer.scene.add(this.#ball);
    }

    public updatePosition() {
        // this.position = position;
        this.#ball.position.set(this.position.x, this.position.y, this.position.z);
    }
}

export default Ball;