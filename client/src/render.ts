import * as THREE from "three";
import Camera from "./utils/camera/camera";
import AssetManager from "./assets/assetManager";
import initLights from "./utils/initLights";

class Renderer {
    static #instance: Renderer;
    public scene: THREE.Scene;
    #renderer: THREE.WebGLRenderer;
    #camera: THREE.PerspectiveCamera;
    #gameWindow: HTMLElement;

    #cube: THREE.Mesh;

    #assetManager: AssetManager;

    constructor() {
        Renderer.#instance = this;
        this.#gameWindow = document.getElementById("render-target")!;
        this.scene = new THREE.Scene();
        this.#renderer = new THREE.WebGLRenderer();
        this.#renderer.setSize(this.#gameWindow.offsetWidth, this.#gameWindow.offsetHeight);
        this.#renderer.setClearColor(0x000000, 0);
        this.#gameWindow.appendChild(this.#renderer.domElement);

        this.#camera = Camera.getInstance.cameraInstance.camera;

        this.#renderer.setAnimationLoop(this.#animate.bind(this));

        window.addEventListener("contextmenu", (event) => {
            event.preventDefault();
        }, false);

        this.#cube = new THREE.Mesh(new THREE.BoxGeometry(2, 2, 2), new THREE.MeshBasicMaterial({color: 0x00ff00}));
        this.#init();

        this.#assetManager = AssetManager.getInstance;
        initLights();
    }

    #init() {
        this.scene.add(this.#cube);

        // wait 2 seconds before adding the volleyball court
        setTimeout(() => {
            const mesh = this.#assetManager.getMesh("volleyballCourt").clone();
            console.log("Adding volleyball court", mesh);
            mesh.position.set(137, -1, -0.8);
            this.scene.add(mesh);
        }, 2000);
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