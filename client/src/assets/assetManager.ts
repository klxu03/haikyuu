import * as THREE from 'three';
import { GLTF, GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader';
import { FBXLoader } from 'three/examples/jsm/loaders/FBXLoader';
import models from './models.json';
import animations from './animations.json';
import Renderer from "../render";

type ModelOptions = {
    recieveShadow?: boolean;
    castShadow?: boolean;
    rotation?: number;
    scale?: number;
}

interface GLTFResult extends GLTF {
    scene: THREE.Group;
    nodes?: { [key: string]: THREE.Object3D };
    materials?: { [key: string]: THREE.Material };
}

class AssetManager {
    static #instance: AssetManager;
    #glbLoader: GLTFLoader;
    #textureLoader: THREE.TextureLoader;

    public textures: Map<string, THREE.Texture>;

    #meshFactory: Map<string, GLTFResult>;
    #renderer: Renderer;
    public animations: Map<string, THREE.AnimationClip>;

    readonly #playerScale = 0.65;

    constructor() {
        AssetManager.#instance = this;
        this.#renderer = Renderer.getInstance;
        this.#glbLoader = new GLTFLoader();
        this.#textureLoader = new THREE.TextureLoader();

        this.textures = new Map<string, THREE.Texture>();
        this.#initTextures();

        this.#meshFactory = new Map<string, GLTFResult>();

        this.animations = new Map<string, THREE.AnimationClip>();
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

    async #loadModel(name: string, url: string, options: ModelOptions, type: string) {
        const recieveShadow = options.recieveShadow ?? true;
        const castShadow = options.castShadow ?? true;
        const rotation = options.rotation ?? 0;
        const scale = options.scale ?? 1;

        const glb: GLTFResult = await this.#glbLoader.loadAsync(url);

        if (type === "mesh") {
            let scene = glb.scene;

            scene.traverse((obj: THREE.Object3D) => {
                if (obj instanceof THREE.Mesh) {
                    obj.receiveShadow = recieveShadow;
                    obj.castShadow = castShadow;
                }
            });

            scene.rotation.set(0, THREE.MathUtils.degToRad(rotation), 0);
            scene.scale.set(scale, scale, scale);

            scene.name = name;

            console.log("finished loading model", name, "mesh is ", scene);
            this.#meshFactory.set(name, glb);
        } else if (type === "avatar") {
            const processed = this.#processAvatar(glb);
            processed.scene.scale.set(this.#playerScale, this.#playerScale, this.#playerScale);

            console.log("finished loading model", name, "avatar is ", processed);
            this.#meshFactory.set(name, processed);
        } else {
            console.log("finished loading model", name, "glb is ", glb);
            glb.scene.scale.set(this.#playerScale, this.#playerScale, this.#playerScale);

            this.#meshFactory.set(name, glb);
        }
    }

    async #loadAnimation(name: string, url: string) {
        try {
            const glb = await this.#glbLoader.loadAsync(url);
            const animation = glb.animations[0];
            if (animation) {
                this.animations.set(name, animation);
                console.log(`Animation '${name}' loaded successfully`);
            } else {
                console.warn(`No animation found in the GLB animation file: ${url}`);
            }
        } catch (error) {
            console.error(`Error loading animation '${name}':`, error);
        }
    }

    #processAvatar(gltf: GLTF): GLTFResult {
        const nodes: { [key: string]: THREE.Object3D } = {};
        const materials: { [key: string]: THREE.Material } = {};

        gltf.scene.traverse((obj: THREE.Object3D) => {
            if (obj.name) {
                nodes[obj.name] = obj;
            }

            if (obj instanceof THREE.Mesh) {
                if (Array.isArray(obj.material)) {
                    obj.material.forEach((material) => {
                        if (material.name) {
                            materials[material.name] = material;
                        }
                    });
                } else if (obj.material.name) {
                    materials[obj.material.name] = obj.material;
                }
            }
        });

        return { ...gltf, nodes, materials };
    }

    /**
   * Loads all models, returns true when all models are loaded
   * @returns Promise<boolean>
   */
    public async initModels(): Promise<boolean> {
        for (const [key, value] of Object.entries(models)) {
            await this.#loadModel(key, value.url, value.options, value.type);
        }

        for (const [key, value] of Object.entries(animations)) {
            await this.#loadAnimation(key, value.url);
        }

        return true;
    }

    #getPlayerObject(): GLTFResult {
        const armature = this.#meshFactory.get("armature")!;
        this.#renderer.scene.add(armature.scene);

        const skinnedMesh = armature.nodes!.Plane as THREE.SkinnedMesh;
        const skeleton = skinnedMesh.skeleton as THREE.Skeleton;

        const assets = ["head1", "hair1", "eyes1", "nose1", "top1", "bottom1", "shoes2"];

        assets.forEach((asset) => {
            const model = this.#meshFactory.get(asset)!;
            let scene = model.scene;

            const group = new THREE.Group();

            scene.traverse((child: THREE.Object3D) => {
                if (child instanceof THREE.Mesh) {
                    const skinnedMesh = new THREE.SkinnedMesh(child.geometry, child.material);
                    skinnedMesh.castShadow = true;
                    skinnedMesh.receiveShadow = true;

                    skinnedMesh.bind(skeleton);
                    group.add(skinnedMesh);
                }
            });

            this.#renderer.scene.add(group);
        })

        skeleton.update();

        return armature;
    }

    public getGLTF(id: string): GLTFResult {
        if (id === "player") {
            return this.#getPlayerObject();
        }

        return this.#meshFactory.get(id)!;
    }

    public static get getInstance(): AssetManager {
        return AssetManager.#instance;
    }
}

export default AssetManager;
export type { GLTFResult };