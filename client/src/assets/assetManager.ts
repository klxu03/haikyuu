import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader';
import models from './models.json';

type ModelOptions = {
    recieveShadow?: boolean;
    castShadow?: boolean;
    rotation?: number;
    scale?: number;
}

class AssetManager {
    static #instance: AssetManager;
    #glbLoader: GLTFLoader;
    #textureLoader: THREE.TextureLoader;

    public textures: Map<string, THREE.Texture>;

    #meshFactory: Map<string, THREE.Object3D>;

    constructor() {
        AssetManager.#instance = this;
        this.#glbLoader = new GLTFLoader();
        this.#textureLoader = new THREE.TextureLoader();

        this.textures = new Map<string, THREE.Texture>();
        this.#initTextures();

        this.#meshFactory = new Map<string, THREE.Object3D>();
        this.initModels();
    }

    #loadTexture(url: string) {
        const texture = this.#textureLoader.load(url);
        texture.wrapS = THREE.RepeatWrapping;
        texture.wrapT = THREE.RepeatWrapping;
        texture.repeat.set(1, 1);

        texture.generateMipmaps = true;
        texture.minFilter = THREE.LinearMipMapLinearFilter;
        texture.magFilter = THREE.LinearFilter;

        return texture;
    }

    #initTextures() {
        this.textures.set("base", this.#loadTexture("/textures/base.png"));
        this.textures.set("specular", this.#loadTexture("/textures/specular.png"));
    }

    async #loadModel(name: string, url: string, options: ModelOptions) {
        const recieveShadow = options.recieveShadow ?? true;
        const castShadow = options.castShadow ?? true;
        const rotation = options.rotation ?? 0;
        const scale = options.scale ?? 1;

        const glb = await this.#glbLoader.loadAsync(url);

        let mesh = glb.scene;

        mesh.traverse((obj: THREE.Mesh) => {
            if (obj instanceof THREE.Mesh) {
            //     obj.material = new THREE.MeshLambertMaterial({
            //         map: this.textures.get("base"),
            //         specularMap: this.textures.get("specular"),
            //     })

                obj.receiveShadow = recieveShadow;
                obj.castShadow = castShadow;
            }

            mesh.rotation.set(0, THREE.MathUtils.degToRad(rotation), 0);
            mesh.scale.set(scale, scale, scale);
        })

        mesh.name = name;

        console.log("finished loading model", name, "mesh is ", mesh);
        this.#meshFactory.set(name, mesh);
    }

    /**
   * Loads all models, returns true when all models are loaded
   * @returns Promise<boolean>
   */
    public async initModels(): Promise<boolean> {
        for (const [key, value] of Object.entries(models)) {
            await this.#loadModel(key, value.url, value.options);
        }

        return true;
    }

    public getMesh(id: string): THREE.Object3D {
        return this.#meshFactory.get(id)!;
    }

    public static get getInstance(): AssetManager {
        if (!AssetManager.#instance) {
            AssetManager.#instance = new AssetManager();
        }

        return AssetManager.#instance;
    }
}

export default AssetManager;