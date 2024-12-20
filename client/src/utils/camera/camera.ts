import OrbitalCamera from "./orbitalCamera";
import { MouseButton, InputManager } from "../../input";
class Camera {
    static #instance: Camera;
    public cameraInstance: OrbitalCamera;

    #prevMouseX: number = 0;
    #prevMouseY: number = 0;
    #inputManager: InputManager;

    constructor() {
        // TODO: Possibly introduce VR camera support here
        Camera.#instance = this;

        const gameWindow = document.getElementById('render-target')!;
        this.cameraInstance = new OrbitalCamera(gameWindow);
        this.#inputManager = InputManager.getInstance;
    }

    public onMouseMove(event: MouseEvent) {
        const dX = event.clientX - this.#prevMouseX;
        const dY = event.clientY - this.#prevMouseY;

        this.#prevMouseX = event.clientX;
        this.#prevMouseY = event.clientY;

        // Ignore jumps
        if (Math.abs(dX) > 10 || Math.abs(dY) > 10) {
            return;
        }

        if (this.#inputManager.mouseDown === MouseButton.LEFT) {
            this.cameraInstance.handleRotation(dX, dY);
        }

        if (this.#inputManager.mouseDown === MouseButton.RIGHT) {
            this.cameraInstance.handlePanning(dX, dY);
        }
    }

    public onScroll(event: WheelEvent) {
        this.cameraInstance.handleZoom(event.deltaY);
    }

    public static get getInstance(): Camera {
        return Camera.#instance;
    }
}

export default Camera;