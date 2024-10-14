import * as THREE from "three";
import Camera from "./utils/camera/camera";
import AssetManager from "./assets/assetManager";
import initLights from "./utils/initLights";
import EntityManager from "./entities/entityManager";

class Renderer {
    static #instance: Renderer;
    public scene: THREE.Scene;
    #renderer: THREE.WebGLRenderer;
    #camera: THREE.PerspectiveCamera;
    #gameWindow: HTMLElement;

    #assetManager: AssetManager;
    #entityManager!: EntityManager;

    #clock: THREE.Clock;

    constructor() {
        Renderer.#instance = this;
        this.#gameWindow = document.getElementById("render-target")!;
        this.scene = new THREE.Scene();
        this.#renderer = new THREE.WebGLRenderer();
        this.#renderer.setSize(this.#gameWindow.offsetWidth, this.#gameWindow.offsetHeight);
        this.#renderer.setClearColor(0x000000, 0);
        this.#gameWindow.appendChild(this.#renderer.domElement);

        this.#camera = (new Camera()).cameraInstance.camera;
        this.#clock = new THREE.Clock();

        window.addEventListener("contextmenu", (event) => {
            event.preventDefault();
        }, false);

        // Initialize singletons
        this.#assetManager = new AssetManager();

        this.#init();
        initLights();
    }

    async #init() {
        await this.#assetManager.initModels();
        this.#entityManager = new EntityManager();

        const mesh = this.#assetManager.getGLTF("volleyballCourt").scene.clone();
        mesh.position.set(136, 0, -0.4);
        this.scene.add(mesh);

        this.#renderer.setAnimationLoop(this.#animate.bind(this));
    }

    #animate() {
        this.#entityManager.update(this.#clock.getDelta());
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