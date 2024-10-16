import * as THREE from "three";
import { AnimationOptions } from "./assetManager";

class AnimationChain {
    #mixer: THREE.AnimationMixer;
    #actions: THREE.AnimationAction[];
    #currentIndex: number = -1;

    constructor(mixer: THREE.AnimationMixer, clips: THREE.AnimationClip[]) {
        this.#mixer = mixer;
        this.#actions = clips.map(clip => mixer.clipAction(clip));
    }

    public start() {
        this.#currentIndex = 0;
        this.#actions[0].play();
    }

    public update(deltaTime: number) {
        this.#mixer.update(deltaTime);

        if (this.#currentIndex < this.#actions.length - 1 &&
            this.#actions[this.#currentIndex].time >= this.#actions[this.#currentIndex].getClip().duration - 0.5) {
            this.#crossFadeToNext();
        }
    }

    #crossFadeToNext() {
        const currentAction = this.#actions[this.#currentIndex];
        const nextAction = this.#actions[++this.#currentIndex];
        currentAction.crossFadeTo(nextAction, 0.01, true);
    }

    public stop() {
        this.#actions.forEach(action => action.stop());
    }
}

export default AnimationChain;