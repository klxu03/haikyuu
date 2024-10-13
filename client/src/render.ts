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
    #entityManager: EntityManager;

    constructor() {
        Renderer.#instance = this;
        this.#gameWindow = document.getElementById("render-target")!;
        this.scene = new THREE.Scene();
        this.#renderer = new THREE.WebGLRenderer();
        this.#renderer.setSize(this.#gameWindow.offsetWidth, this.#gameWindow.offsetHeight);
        this.#renderer.setClearColor(0x000000, 0);
        this.#gameWindow.appendChild(this.#renderer.domElement);

        this.#camera = (new Camera()).cameraInstance.camera;

        this.#renderer.setAnimationLoop(this.#animate.bind(this));

        window.addEventListener("contextmenu", (event) => {
            event.preventDefault();
        }, false);

        // Initialize singletons
        this.#assetManager = new AssetManager();
        this.#entityManager = new EntityManager();

        this.#init();
        initLights();
    }

    async #init() {
        await this.#assetManager.initModels();

        const mesh = this.#assetManager.getMesh("volleyballCourt").clone();
        mesh.position.set(136, 0, -0.4);
        this.scene.add(mesh);

        this.scene.add(this.#entityManager.mainPlayer.mesh);
        setTimeout(() => {
            console.log("Setting player position");
            this.#entityManager.mainPlayer.updatePositionDeltas({ z: 3 });
        }, 2000);
    }

    #animate() {
        this.#entityManager.mainPlayer.update();
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