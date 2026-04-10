import * as THREE from "https://cdn.jsdelivr.net/npm/three@0.158.0/build/three.module.js";
import { state } from "./state.js";
import { sendInput } from "./network.js"

export let keys = {};

let yaw = 0;
let pitch = 0;

document.body.addEventListener("click", () => {
    document.body.requestPointerLock();
});

document.addEventListener("mousemove", (e) => {
    yaw -= e.movementX * 0.002;
    pitch -= e.movementY * 0.002;

    pitch = Math.max(-Math.PI/2, Math.min(Math.PI/2, pitch));
    sendInput({yawPitch: [yaw, pitch], keys});
});

let playerCam;

export let scene, camera, renderer;
let meshes = new Map();

export function initRender() {
    scene = new THREE.Scene();

    camera = new THREE.PerspectiveCamera(
        75,
        window.innerWidth / window.innerHeight,
        0.1,
        1000
    );

    renderer = new THREE.WebGLRenderer();
    renderer.setSize(window.innerWidth, window.innerHeight);

    const loader = new THREE.CubeTextureLoader();

    const skybox = loader.load([
        "sky/px.png", // derecha
        "sky/px.png", // izquierda
        "sky/skyup.png", // arriba
        "sky/skydown.png", // abajo
        "sky/px.png", // frente
        "sky/px.png"  // atrás
    ]);

    scene.background = skybox;

    document.body.appendChild(renderer.domElement);
}

export function syncWorld() {
    if (!state.world) return;

    const players = state.world.players;

    for (let id in players) {
        let p = players[id];

        let mesh = meshes.get(id);

        if (!mesh) {
            const geo = new THREE.BoxGeometry(1, 2, 1);
            const mat = new THREE.MeshBasicMaterial({ color: 0x00ff00 });
            mesh = new THREE.Mesh(geo, mat);

            scene.add(mesh);
            meshes.set(id, mesh);
        }

        mesh.position.set(p.x, p.y, p.z);
    }

    const models = state.world.serverOrLocalService.mapServerModelsService || [];

    models.forEach((m, i) => {
        let id = "model_" + i;

        let mesh = meshes.get(id);

        if (!mesh) {
            const geo = new THREE.BoxGeometry(
                m.baseSize[0],
                m.baseSize[1],
                m.baseSize[2]
            );

            const mat = new THREE.MeshBasicMaterial({
                color: new THREE.Color(
                    m.color[0],
                    m.color[1],
                    m.color[2]
                )
            });

            mesh = new THREE.Mesh(geo, mat);

            scene.add(mesh);
            meshes.set(id, mesh);
        }

        mesh.rotation.x = m.baseRotation[0];
        mesh.rotation.y = m.baseRotation[1];
        mesh.rotation.z = m.baseRotation[2];
        mesh.position.set(
            m.basePosition[0],
            m.basePosition[1],
            m.basePosition[2]
        );
    });

}

export function renderLoop() {
    requestAnimationFrame(renderLoop);

    syncWorld();

    if (state.world) {
        const models = state.world.serverOrLocalService.mapServerModelsService;

        const player = models[state.playerId];

        if (player) {
            camera.position.set(
                player.basePosition[0],
                player.basePosition[1] + 2,
                player.basePosition[2]
            );

            const dir = new THREE.Vector3(
                Math.cos(pitch) * Math.sin(yaw),
                Math.sin(pitch),
                Math.cos(pitch) * Math.cos(yaw)
            );

            camera.lookAt(
                camera.position.clone().add(dir)
            );
        }
    }

    renderer.render(scene, camera);
}