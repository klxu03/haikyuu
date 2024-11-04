import * as THREE from "three";
import { Position } from "./player";
import Renderer from "../render";

class Ball {
    public position: Position;

    #renderer: Renderer;
    #ball: THREE.Mesh;

    constructor() {
        this.position = { x: 0, y: 0.5, z: 0 };

        const ballRadius = 0.2;
        const ballGeometry = new THREE.SphereGeometry(ballRadius);
        const ballMaterial = new THREE.MeshPhongMaterial({ color: 0xff0000 });
        this.#ball = new THREE.Mesh(ballGeometry, ballMaterial);
        this.#ball.position.set(this.position.x, this.position.y, this.position.z);

        this.#renderer = Renderer.getInstance;
        this.#renderer.scene.add(this.#ball);
    }
}

export default Ball;