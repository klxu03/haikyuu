import * as THREE from "three";

class Renderer {
    static #instance: Renderer;
    public scene: THREE.Scene;
    #renderer: THREE.WebGLRenderer;
    #camera: THREE.PerspectiveCamera;
    #gameWindow: HTMLElement;

    #cube: THREE.Mesh;

    constructor() {
        Renderer.#instance = this;
        this.#gameWindow = document.getElementById("render-target")!;
        this.scene = new THREE.Scene();
        this.#renderer = new THREE.WebGLRenderer();
        this.#renderer.setSize(this.#gameWindow.offsetWidth, this.#gameWindow.offsetHeight);
        this.#renderer.setClearColor(0x000000, 0);
        this.#gameWindow.appendChild(this.#renderer.domElement);

        this.#camera = new THREE.PerspectiveCamera(75, this.#gameWindow.offsetWidth / this.#gameWindow.offsetHeight, 0.1, 1000);
        this.#camera.position.z = 5;

        this.#renderer.setAnimationLoop(this.#animate.bind(this));

        window.addEventListener("contextmenu", (event) => {
            event.preventDefault();
        }, false);

        this.#cube = new THREE.Mesh(new THREE.BoxGeometry(1, 1, 1), new THREE.MeshBasicMaterial({color: 0x00ff00}));
        this.#init();
    }

    #init() {
        this.scene.add(this.#cube);
    }

    #animate() {
        this.#cube.rotation.x += 0.01;
        this.#cube.rotation.y += 0.01;
        this.#cube.rotation.z += 0.01;

        this.#renderer.render(this.scene, this.#camera);
    }

    public static get getInstance(): Renderer {
        if (!Renderer.#instance) {
            Renderer.#instance = new Renderer();
        }

        return Renderer.#instance;
    }
}

declare global {
    interface Window {
        renderer: Renderer;
    }
}

window.onload = () => {
    window.renderer = Renderer.getInstance;
}

export default Renderer;