import * as THREE from 'three';
import { GLTF, GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader';
import models from './models.json';
import animations from './animations.json';
import Renderer from "../render";
import * as SkeletonUtils from 'three/examples/jsm/utils/SkeletonUtils';

type ModelOptions = {
    recieveShadow?: boolean;
    castShadow?: boolean;
    rotation?: number;
    scale?: number;
}

interface GLTFResult extends GLTF {
    scene: THREE.Object3D<THREE.Object3DEventMap> & { isGroup: true };
    nodes?: { [key: string]: THREE.Object3D };
    materials?: { [key: string]: THREE.Material };
}

type AnimationOptions = {
    loopable?: boolean;
    rotation?: number;
}

class AssetManager {
    static #instance: AssetManager;
    #glbLoader: GLTFLoader;
    #textureLoader: THREE.TextureLoader;

    public textures: Map<string, THREE.Texture>;

    #meshFactory: Map<string, GLTFResult>;
    #renderer: Renderer;
    public animations: Map<string, [THREE.AnimationClip, AnimationOptions]>;

    readonly #playerScale = 0.65;

    constructor() {
        AssetManager.#instance = this;
        this.#renderer = Renderer.getInstance;
        this.#glbLoader = new GLTFLoader();
        this.#textureLoader = new THREE.TextureLoader();

        this.textures = new Map<string, THREE.Texture>();
        this.#initTextures();

        this.#meshFactory = new Map<string, GLTFResult>();

        this.animations = new Map<string, [THREE.AnimationClip, AnimationOptions]>();
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

    async #loadAnimation(name: string, url: string, options: AnimationOptions) {
        const animationOptions = {
            loopable: options.loopable ?? true,
            rotation: options.rotation ?? 0,
        }

        try {
            const glb = await this.#glbLoader.loadAsync(url);
            const animation = glb.animations[0];
            if (animation) {
                this.animations.set(name, [animation, animationOptions]);
                console.log(`Animation '${name}' loaded successfully`, animation);
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
            await this.#loadAnimation(key, value.url, value.options);
        }

        return true;
    }

    public getPlayerObject(): GLTFResult {
        const armature = this.#meshFactory.get("armature")!;
        const clonedScene = this.cloneSkinnedMesh(armature.scene);
    
        // Get the base mesh and skeleton from the cloned armature
        let baseMesh: THREE.SkinnedMesh | null = null;
        let skeleton: THREE.Skeleton | null = null;
    
        clonedScene.traverse((node: THREE.Object3D) => {
            if (node.name === 'Plane' && node instanceof THREE.SkinnedMesh) {
                baseMesh = node;
                skeleton = node.skeleton;
            }
        });
    
        if (!skeleton || !baseMesh) {
            console.error("Could not find base mesh or skeleton");
            return armature;
        }
    
        const assets = ["head1", "hair1", "eyes1", "nose1", "top1", "bottom1", "shoes2"];
        
        assets.forEach((assetName) => {
            const asset = this.#meshFactory.get(assetName)!;
            const group = new THREE.Group();
    
            asset.scene.traverse((child: THREE.Object3D) => {
                if (child instanceof THREE.Mesh) {
                    const newSkinnedMesh = new THREE.SkinnedMesh(
                        child.geometry,
                        child.material
                    );
                    newSkinnedMesh.castShadow = true;
                    newSkinnedMesh.receiveShadow = true;
                    newSkinnedMesh.bind(skeleton!);
                    group.add(newSkinnedMesh);
                }
            });
    
            clonedScene.add(group);
        });
    
        skeleton.update();
    
        return { 
            ...armature, 
            scene: clonedScene as THREE.Object3D<THREE.Object3DEventMap> & { isGroup: true },
            nodes: {
                ...armature.nodes,
                Plane: baseMesh
            }
        };
    }
   
    private cloneSkinnedMesh(source: THREE.Object3D): THREE.Object3D {
        try {
            const clone = SkeletonUtils.clone(source);
            
            // Create a map of original bones to cloned bones
            const boneMap = new Map<THREE.Bone, THREE.Bone>();
            
            const mapBones = (original: THREE.Object3D, cloned: THREE.Object3D) => {
                if (original instanceof THREE.Bone && cloned instanceof THREE.Bone) {
                    boneMap.set(original, cloned);
                }
                for (let i = 0; i < original.children.length; i++) {
                    mapBones(original.children[i], cloned.children[i]);
                }
            };
            
            mapBones(source, clone);
            
            // Update skinned meshes with mapped bones
            clone.traverse((node: THREE.Object3D) => {
                if (node instanceof THREE.SkinnedMesh) {
                    node.castShadow = true;
                    node.receiveShadow = true;
                    
                    if (node.skeleton) {
                        const newBones = node.skeleton.bones.map(bone => {
                            const mappedBone = boneMap.get(bone);
                            return mappedBone || bone;
                        });
                        node.skeleton.bones = newBones;
                    }
                }
            });
            
            return clone;
        } catch (error) {
            console.error("Error in cloneSkinnedMesh:", error);
            throw error;
        }
    }
    
    public getGLTF(id: string): GLTFResult {
        if (id === "player") {
            throw new Error("player object is not cloneable");
            // const playerObject = this.getPlayerObject();
            // return { ...playerObject, scene: playerObject.scene.clone(true) };
        }

        const meshObject = this.#meshFactory.get(id)!;
        return { ...meshObject, scene: meshObject.scene.clone(true) };
    }

    public static get getInstance(): AssetManager {
        return AssetManager.#instance;
    }
}

export default AssetManager;
export type { GLTFResult, AnimationOptions };
