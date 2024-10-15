import Camera from "./utils/camera/camera";

enum MouseButton {
    NONE = -1,
    LEFT = 0,
    MIDDLE = 1,
    RIGHT = 2,
}

interface KeysPressed {
    w: boolean;
    a: boolean;
    s: boolean;
    d: boolean;
    space: boolean;
}

class InputManager {
    static #instance: InputManager;
    public mouseDown: MouseButton;
    public keysPressed: KeysPressed;

    #camera: Camera;

    private constructor() {
        this.mouseDown = MouseButton.NONE;
        this.keysPressed = { w: false, a: false, s: false, d: false, space: false };

        window.addEventListener("mousedown", this.#onMouseDown.bind(this));
        window.addEventListener("mouseup", this.#onMouseUp.bind(this));
        window.addEventListener("keydown", this.#onKeyDown.bind(this));
        window.addEventListener("keyup", this.#onKeyUp.bind(this));

        this.#camera = Camera.getInstance;
        window.addEventListener("mousemove", this.#camera.onMouseMove.bind(this.#camera));
        window.addEventListener("wheel", this.#camera.onScroll.bind(this.#camera));
    }

    #setMouseDown(button: MouseButton) {
        console.log("Mouse down: ", button);
        this.mouseDown = button;
    }

    #onMouseDown(event: MouseEvent) {
        this.#setMouseDown(event.button as MouseButton);
    }


    #onMouseUp(event: MouseEvent) {
        this.mouseDown = MouseButton.NONE;
    }

    #onKeyDown(event: KeyboardEvent) {
        this.keysPressed[event.key as keyof KeysPressed] = true;
        if (event.key === " ") {
            this.keysPressed.space = true;
        }
    }

    #onKeyUp(event: KeyboardEvent) {
        this.keysPressed[event.key as keyof KeysPressed] = false;
        if (event.key === " ") {
            this.keysPressed.space = false;
        }
    }

    public static get getInstance(): InputManager {
        if (!InputManager.#instance) {
            InputManager.#instance = new InputManager();
        }
        return InputManager.#instance;
    }
}

export { MouseButton, type KeysPressed, InputManager };