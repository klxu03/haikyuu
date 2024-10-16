import * as THREE from "three";
import { AnimationOptions } from "./assetManager";

type AnimationClipWithOptions = {
    clip: THREE.AnimationClip;
    options: AnimationOptions;
}

class AnimationChain {
    #mixer: THREE.AnimationMixer;
    #actions: THREE.AnimationAction[];
    #currentIndex: number = -1;

    readonly #crossFadeDuration = 0.1;

    constructor(mixer: THREE.AnimationMixer, clips: AnimationClipWithOptions[]) {
        this.#mixer = mixer;
        this.#actions = clips.map(clip => {
            console.log({clip})
            const action = mixer.clipAction(clip.clip);
            action.reset().setEffectiveTimeScale(1).setEffectiveWeight(1);

            if (clip.clip.name !== "idle") {
                action.setLoop(THREE.LoopOnce, 1);
            } else {
                action.setLoop(THREE.LoopRepeat, Infinity);
            }

            return action;
        });
    }

    public start() {
        this.#currentIndex = 0;
        this.#actions[0].play();
    }

    public update(deltaTime: number) {
        this.#mixer.update(deltaTime);

        if (this.#currentIndex < this.#actions.length &&
            this.#actions[this.#currentIndex].time >= this.#actions[this.#currentIndex].getClip().duration - this.#crossFadeDuration) {
            console.log("Crossfade to next animation");
            this.#crossFadeToNext();
        } else {
            console.log("Update existing animation");
        }
    }

    #crossFadeToNext() {
        const currentAction = this.#actions[this.#currentIndex];
        const nextAction = this.#actions[++this.#currentIndex];
        console.log("Current action: ", currentAction.getClip().name, "Next action: ", nextAction.getClip().name);
        currentAction.crossFadeTo(nextAction, this.#crossFadeDuration, true);

        // Prep the next action
        nextAction.reset();

        nextAction.play();
    }

    public stop() {
        this.#actions.forEach(action => action.stop());
    }
}

export default AnimationChain;