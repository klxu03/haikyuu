import * as THREE from "three";

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
    loopable: boolean;
}

class AnimationChain {
    #mixer: THREE.AnimationMixer;
    #actions: THREE.AnimationAction[];
    #links: AnimationLink[];
    #currentIndex: number = -1;
    #shouldCrossFadeToIdle: boolean;

    readonly #crossFadeDuration = 0.1;

    /**
     * 
     * @param mixer The mixer that will play the animation
     * @param shouldCrossFadeToIdle If the animation should crossfade to idle when it ends
     * @param links The links that make up the animation chain
     * last link should always be the idle animation
     */
    constructor(mixer: THREE.AnimationMixer, shouldCrossFadeToIdle: boolean, links: AnimationLink[]) {
        console.log("links: ", links, "length: ", links.length);
        this.#mixer = mixer;
        this.#actions = links.map(link => {
            const action = mixer.clipAction(link.clip);
            action.reset().setEffectiveTimeScale(1).setEffectiveWeight(1);

            if (!link.loopable) {
                action.setLoop(THREE.LoopOnce, 1);
            } else {
                action.setLoop(THREE.LoopRepeat, Infinity);
            }

            return action;
        });

        this.#links = links;
        this.#shouldCrossFadeToIdle = shouldCrossFadeToIdle;
    }

    public start() {
        // Reset all actions
        this.#actions = this.#actions.map(action => {
            action.reset().setEffectiveTimeScale(1).setEffectiveWeight(1);
            return action;
        });

        this.#currentIndex = 0;
        this.#links[0].start();
        this.#actions[0].play();
    }

    public update(deltaTime: number) {
        this.#mixer.update(deltaTime);

        // If loopable, not possible to fade to next animation
        if (this.#links[this.#currentIndex].loopable) {
            return;
        }

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

    #crossFadeToIdle(): Promise<void> {
        console.log("Crossfade to idle");
        return new Promise<void>((resolve) => {
            const currentAction = this.#actions[this.#currentIndex];
            this.#links[this.#currentIndex].end();

            const idleAction = this.#actions[this.#actions.length - 1];

            idleAction.reset();
            idleAction.play();
            currentAction.crossFadeTo(idleAction, this.#crossFadeDuration, true);

            setTimeout(() => {
                resolve();
            }, this.#crossFadeDuration * 1000);
        });
    }

    public async stop() {
        if (this.#shouldCrossFadeToIdle) {
            await this.#crossFadeToIdle();
        }

        this.#actions.forEach(action => action.stop());
    }
}

export default AnimationChain;
export type { AnimationLink };
