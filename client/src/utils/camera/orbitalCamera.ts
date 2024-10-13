import * as THREE from "three";

const DEG2RAD = Math.PI / 180;

const Y_AXIS = new THREE.Vector3(0, 1, 0);

// set up default camera positions so x = 0, y = 6.5, and z = 11

const CAMERA_CONFIG = {
    MIN_CAMERA_RADIUS: 5,
    MAX_CAMERA_RADIUS: 20,
    MIN_CAMERA_ELEVATION: 10,
    MAX_CAMERA_ELEVATION: 90,
    ROTATION_SENSITIVITY: 0.5,
    ZOOM_SENSITIVITY: 0.02,
    PAN_SENSITIVITY: 0.01,
};

const CAMERA_DEFAULT = {
    RADIUS: 0,
    AZIMUTH: 0,
    ELEVATION: 0,
};
const x_0 = 0;
const y_0 = 5.27;
const z_0 = 9.56;
CAMERA_DEFAULT.RADIUS = Math.sqrt(x_0 ** 2 + y_0 ** 2 + z_0 ** 2);
CAMERA_DEFAULT.AZIMUTH = Math.atan2(x_0, z_0) * (180 / Math.PI);
CAMERA_DEFAULT.ELEVATION = Math.asin(y_0 / CAMERA_DEFAULT.RADIUS) * (180 / Math.PI);

class OrbitalCamera {
    public camera: THREE.PerspectiveCamera;
    public origin: THREE.Vector3;
    public radius: number;
    public azimuth: number;
    public elevation: number;

    constructor(gameWindow: HTMLElement) {
        this.camera = new THREE.PerspectiveCamera(75, gameWindow.offsetWidth / gameWindow.offsetHeight, 0.1, 1000);
        this.origin = new THREE.Vector3(0, 0, 0);
        this.radius = CAMERA_DEFAULT.RADIUS;
        this.azimuth = CAMERA_DEFAULT.AZIMUTH;
        this.elevation = CAMERA_DEFAULT.ELEVATION;

        this.#updateCameraPosition();
    }

    #updateCameraPosition() {
        this.camera.position.x = this.radius * Math.sin(this.azimuth * DEG2RAD) * Math.cos(this.elevation * DEG2RAD);
        this.camera.position.y = this.radius * Math.sin(this.elevation * DEG2RAD);
        this.camera.position.z = this.radius * Math.cos(this.azimuth * DEG2RAD) * Math.cos(this.elevation * DEG2RAD);
        this.camera.position.add(this.origin);
        this.camera.lookAt(this.origin);
        this.camera.updateMatrix();

        console.log("camera position", this.camera.position);
    }

    handleRotation(dX: number, dY: number) {
        this.azimuth += -dX * CAMERA_CONFIG.ROTATION_SENSITIVITY;
        this.elevation += dY * CAMERA_CONFIG.ROTATION_SENSITIVITY;
        this.elevation = Math.min(CAMERA_CONFIG.MAX_CAMERA_ELEVATION, Math.max(CAMERA_CONFIG.MIN_CAMERA_ELEVATION, this.elevation));
        this.#updateCameraPosition();
    }

    handlePanning(dX: number, dY: number) {
        const forward = new THREE.Vector3(0, 0, 1).applyAxisAngle(Y_AXIS, this.azimuth * DEG2RAD);
        const left = new THREE.Vector3(1, 0, 0).applyAxisAngle(Y_AXIS, this.azimuth * DEG2RAD);
        this.origin.add(forward.multiplyScalar(dY * -CAMERA_CONFIG.PAN_SENSITIVITY));
        this.origin.add(left.multiplyScalar(dX * -CAMERA_CONFIG.PAN_SENSITIVITY));
        this.#updateCameraPosition();
    }

    handleZoom(dY: number) {
        this.radius += dY * CAMERA_CONFIG.ZOOM_SENSITIVITY;
        this.radius = Math.min(CAMERA_CONFIG.MAX_CAMERA_RADIUS, Math.max(CAMERA_CONFIG.MIN_CAMERA_RADIUS, this.radius));
        this.#updateCameraPosition();
    }
}

export default OrbitalCamera;