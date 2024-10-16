import * as THREE from "three";
import { AnimationOptions } from "./assetManager";

type AnimationLink = {
    clip: THREE.AnimationClip;
    /**
     * A function that is called every frame to update the animation
     * @param deltaTime The time since the last update
     */
    update: (deltaTime: number) => void;
    /**
     * A function that is called when the animation ends
     */
    start: () => void;
    /**
     * A function that is called when the animation ends
     */
    end: () => void;
}

class AnimationChain {
    #mixer: THREE.AnimationMixer;
    #actions: THREE.AnimationAction[];
    #links: AnimationLink[];
    #currentIndex: number = -1;

    readonly #crossFadeDuration = 0.1;

    constructor(mixer: THREE.AnimationMixer, links: AnimationLink[]) {
        this.#mixer = mixer;
        this.#actions = links.map(link => {
            const action = mixer.clipAction(link.clip);
            action.reset().setEffectiveTimeScale(1).setEffectiveWeight(1);

            if (link.clip.name !== "idle") {
                action.setLoop(THREE.LoopOnce, 1);
            } else {
                action.setLoop(THREE.LoopRepeat, Infinity);
            }

            return action;
        });

        this.#links = links;
    }

    public start() {
        this.#currentIndex = 0;
        this.#links[0].start();
        this.#actions[0].play();
    }

    public update(deltaTime: number) {
        this.#mixer.update(deltaTime);

        if (this.#currentIndex < this.#actions.length - 1 &&
            this.#actions[this.#currentIndex].time >= this.#actions[this.#currentIndex].getClip().duration - this.#crossFadeDuration) {
            console.log("Crossfade to next animation");
            this.#links[this.#currentIndex].update(deltaTime);
            this.#crossFadeToNext();
        } else if (this.#currentIndex === this.#actions.length - 1) {
            console.log("finished animation chain");
            this.#links[this.#currentIndex].update(deltaTime);
            this.#links[this.#currentIndex].end();
        } else {
            console.log("Update existing animation");
            this.#links[this.#currentIndex].update(deltaTime);
        }
    }

    #crossFadeToNext() {
        const currentAction = this.#actions[this.#currentIndex];
        this.#links[this.#currentIndex].end();
        const nextAction = this.#actions[++this.#currentIndex];
        this.#links[this.#currentIndex].start();
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
export type { AnimationLink };