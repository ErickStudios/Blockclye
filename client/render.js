import * as THREE from "https://cdn.jsdelivr.net/npm/three@0.158.0/build/three.module.js";
import { state } from "./state.js";
import { sendInput } from "./network.js"

export let keys = {};

const imageCache = new Map();

function getImage(src) {
    if (!imageCache.has(src)) {
        const img = new Image();
        img.src = src;
        imageCache.set(src, img);
    }
    return imageCache.get(src);
}
/**
 * represents the user interface library
 *  
 * ```
var UiProximation = String; // [-?(()px | ()%) + ...]
var Vector2 = [ UiProximation, UiProximation ]; // (x,y)
class ButtonStyles extends InternalDocsStrictEnum {
    var Clasic: String,
    var Custom: String
}
class TextAlign extends InternalDocsStrictEnum {
    var left: String,
    var center: String,
    var right: String
}
class SimpleRectangle extends UIElement {
    var basePosition: Vector2;
    var baseSize: Vector2;
    var anchor: Vector2;
    var color: Color3;
    var visible: Boolean;
    var children: extends UIElement;
    var guiUdim: 'SimpleRectangle';
}
class SimpleTextBlks extends UIElement {
    var fontSize: String;
    var letterSpacing: String;
    var align: TextAlign;
    var basePosition: Vector2;
    var baseSize: Vector2;
    func setSize(Size: String): Void;
    var text: String;
    var color: Color3;
    var visible: Boolean;
    var children: extends UIElement;
    var guiUdim: 'SimpleTextBlks';
}
class SimpleButton extends SimpleRectangle {
    var text: SimpleTextBlks;
    var styleButton: ButtonStyles;
    var hoverColor: Color3;
    var pressedColor: Color3;
    var children: extends UIElement;
    var guiUdim: 'SimpleButton';
}
extern 'js' func PlayerGUI();
 * ```
 */
function PlayerGUI({ renderOptions }) {
    if (!renderOptions?.renderElement) {
        throw Error("Needs to the render Element")
    }

    function unwrap(obj) {
        if (obj?.type === 'obj' && obj.object) {
            return obj.object;
        }
        return obj;
    }

    function convert(uiObject) {
        const obj = unwrap(uiObject);

        if (!obj.guiUdim) {
            throw new SyntaxError("UI element missing guiUdim");
        }

        switch (obj.guiUdim) {

            case "SimpleRectangle":
                return {
                    type: "SimpleRectangle",
                    props: {
                        position: obj.basePosition,
                        size: obj.baseSize,
                        anchor: obj.anchor,
                        color: obj.color,
                        visible: obj.visible
                    }
                };
            case "SimpleImage":
                return {
                    type: "SimpleImage",
                    props: {
                        position: obj.basePosition,
                        size: obj.baseSize,
                        image: obj.image,
                        visible: obj.visible
                    }
                };
            case "SimpleTextBlks":
                return {
                    type: "SimpleTextBlks",
                    props: {
                        fontSize: obj.fontSize,
                        letterSpacing: obj.letterSpacing,
                        align: obj.align,
                        position: obj.basePosition,
                        size: obj.baseSize,
                        text: obj.text,
                        color: obj.color,
                        visible: obj.visible
                    }
                };

            case "SimpleButton":
                return {
                    type: "SimpleButton",
                    props: {
                        position: obj.basePosition,
                        size: obj.baseSize,
                        color: obj.color,
                        hoverColor: obj.hoverColor,
                        pressedColor: obj.pressedColor,
                        style: obj.styleButton,
                        visible: obj.visible
                    },
                    children: [
                        ...(obj.text ? [convert(obj.text)] : []),
                        ...(obj.children?.map(m => convert(m)) || [])
                    ],
                    events: {
                        click: obj.onclick
                    }
                };

            default:
                throw new Error("Unknown UI type: " + obj.guiUdim);
        }
    }

    const uiNode = convert(renderOptions.renderElement);

    return uiNode;
}
let PlayerUI = []

window.clientService = {
    PlayerUI: PlayerUI
};

function renderElement(node, mouse) {

    if (node.type === "SimpleButton") {  

        drwm.drawSujectUISytle(
            node.props.style, 
            node.props.position[0], 
            node.props.position[1],
            node.props.size[0],
            node.props.size[1],
            `rgb(${node.props.color[0]*255},${node.props.color[1]*255},${node.props.color[2]*255})`,
            { pressed: isInside(mouse, node) }
        );

        node.children?.forEach(child =>  { 
            let rendera = true
            if (typeof child == 'object') {
                if ('props' in child) {
                    if ('position' in child.props) {
                        rendera = false;
                        let px = String(drwm.sizeXSujectParse(child.props.position[0]) + drwm.sizeXSujectParse(node.props.position[0])) + "px";
                        let py = String(drwm.sizeYSujectParse(child.props.position[1]) + drwm.sizeYSujectParse(node.props.position[1])) + "px";

                        let copy = JSON.parse(JSON.stringify(child));
                        copy.props.position[0] = px;
                        copy.props.position[1] = py;
                        renderElement(copy, mouse);
                    }
                }
            }
            if (rendera) renderElement(child, mouse)
         });
    }

    if (node.type === "SimpleTextBlks") {

        const x = drwm.sizeXSujectParse(node.props.position[0]);
        const y = drwm.sizeYSujectParse(node.props.position[1]);
        const w = drwm.sizeXSujectParse(node.props.size[0]);
        const h = drwm.sizeYSujectParse(node.props.size[1]);

        drwm.drawText(
            node.props.text,
            x + w / 2,
            y + h / 2,
            node.props.color
        );

        node.children?.forEach(child =>  { 
            let rendera = true
            if (typeof child == 'object') {
                if ('props' in child) {
                    if ('position' in child.props) {
                        rendera = false;
                        let px = String(drwm.sizeXSujectParse(child.props.position[0]) + drwm.sizeXSujectParse(node.props.position[0])) + "px";
                        let py = String(drwm.sizeYSujectParse(child.props.position[1]) + drwm.sizeYSujectParse(node.props.position[1])) + "px";

                        let copy = JSON.parse(JSON.stringify(child));
                        copy.props.position[0] = px;
                        copy.props.position[1] = py;
                        renderElement(copy, mouse);
                    }
                }
            }
            if (rendera) renderElement(child, mouse)
         });
    }

    if (node.type === "SimpleRectangle") {
        drwm.drawSujectUISytle(
            'Custom', 
            node.props.position[0], 
            node.props.position[1],
            node.props.size[0],
            node.props.size[1],
            `rgb(${node.props.color[0]*255},${node.props.color[1]*255},${node.props.color[2]*255})`
        )

        node.children?.forEach(child =>  { 
            let rendera = true
            if (typeof child == 'object') {
                if ('props' in child) {
                    if ('position' in child.props) {
                        rendera = false;
                        let px = String(drwm.sizeXSujectParse(child.props.position[0]) + drwm.sizeXSujectParse(node.props.position[0])) + "px";
                        let py = String(drwm.sizeYSujectParse(child.props.position[1]) + drwm.sizeYSujectParse(node.props.position[1])) + "px";

                        let copy = JSON.parse(JSON.stringify(child));
                        copy.props.position[0] = px;
                        copy.props.position[1] = py;
                        renderElement(copy, mouse);
                    }
                }
            }
            if (rendera) renderElement(child, mouse)
         });
    }

    if (node.type === "SimpleImage") {
        const x = drwm.sizeXSujectParse(node.props.position[0]);
        const y = drwm.sizeYSujectParse(node.props.position[1]);
        const w = drwm.sizeXSujectParse(node.props.size[0]);
        const h = drwm.sizeYSujectParse(node.props.size[1]);

        const img = getImage(node.props.image);

        if (img.complete) {
            drwm.drawImage(img, x, y, w, h);
        }

        node.children?.forEach(child => renderElement(child, mouse));
    }
}
function isInside(mouse, node) {
    const x = drwm.sizeXSujectParse(node.props.position[0]);
    const y = drwm.sizeYSujectParse(node.props.position[1]);
    const w = drwm.sizeXSujectParse(node.props.size[0]);
    const h = drwm.sizeYSujectParse(node.props.size[1]);

    return (
        mouse.x >= x &&
        mouse.x <= x + w &&
        mouse.y >= y &&
        mouse.y <= y + h
    );
}

let drwm = {
    sizeXSujectParse(t) { return 0 },
    sizeYSujectParse(t) { return 0 },
    drawSujectUIInternal(x,y,w,h,c) { },
    drawSujectUISytle(s,x,y,w,h,c, options={}) { },
    drawText(t, x, y, color) {}
};

let yaw = 0;
let pitch = 0;
window.interactingWithGui = false;
let mouseX = 0;
let mouseY = 0;

let playerCam;
/** @type {CanvasRenderingContext2D} */
let drmwgui = null;

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

    const container = document.createElement("div");

    container.style.position = "relative";
    container.style.width = "100vw";
    container.style.height = "100vh";
    container.style.overflow = "hidden";
    container.style.left = "0px";
    container.style.top = "0px";
    container.style.margin = "0px";
    container.style.padding = "0px";

    document.body.appendChild(container);
    
    container.appendChild(renderer.domElement);

    renderer.domElement.style.position = "absolute";
    renderer.domElement.style.top = "0px";
    renderer.domElement.style.left = "0px";

    const uiLayer = document.createElement("canvas");

    uiLayer.width = 800;
    uiLayer.height = 600;

    const context = uiLayer.getContext("2d");

    drmwgui = (context instanceof CanvasRenderingContext2D) ? context : null;

    uiLayer.style.position = "absolute";
    uiLayer.style.top = "0";
    uiLayer.style.left = "0";
    uiLayer.style.width = "100%";
    uiLayer.style.height = "100%";
    uiLayer.style.pointerEvents = "none";

    function resizeUI() {
        const rect = uiLayer.getBoundingClientRect();

        uiLayer.width = rect.width;
        uiLayer.height = rect.height;
    }

    container.appendChild(uiLayer);

    resizeUI();
    window.addEventListener("resize", resizeUI);

    drwm.drawSujectUIInternal = (x,y,w,h,c) => {
        context.fillStyle = c;
        context.fillRect(x,y,w,h);
    };
    drwm.drawText = (text, x, y, color) => {
        context.fillStyle = `rgb(${color[0]*255},${color[1]*255},${color[2]*255})`;
        context.font = "16px Arial";
        context.textAlign = "left";
        context.textBaseline = "top";
        context.fillText(text, x, y);
    };
    drwm.drawSujectUISytle = (s,x1,y1,w1,h1,c, options={}) => {
        let [x,y,w,h] = [drwm.sizeXSujectParse(x1), drwm.sizeYSujectParse(y1), drwm.sizeXSujectParse(w1), drwm.sizeYSujectParse(h1)]
        
        if (s == 'Clasic') {
            if ('pressed' in options && options.pressed) {
                drwm.drawSujectUIInternal(x,y,w,h,'#343434');
                drwm.drawSujectUIInternal(x + 2,y + 2,w - 4,h - 4,'#666666');
            }
            else {
                drwm.drawSujectUIInternal(x,y,w,h,'#0c0c0c');
                drwm.drawSujectUIInternal(x + 2,y + 2,w - 4,h - 4,'#262626');
            }
        }
        else if (s == 'Custom') {
            drwm.drawSujectUIInternal(x,y,w,h,c);
        }
    };
    function parseAdvanced(t, max) {
        let parts = t.split("+").map(s => s.trim());

        let total = 0;

        for (let p of parts) {
            if (p.endsWith("%")) {
                total += (Number(p.slice(0, -1)) / 100) * max;
            } else if (p.endsWith("px")) {
                total += Number(p.slice(0, -2));
            } else {
                total += Number(p);
            }
        }

        return total;
    }
    drwm.sizeXSujectParse = (t) => parseAdvanced(t, uiLayer.width);
    drwm.sizeYSujectParse = (t) => parseAdvanced(t, uiLayer.height);
    drwm.drawImage = (img, x, y, w, h) => {
        drmwgui.drawImage(img, x, y, w, h);
    }
    PlayerUI.push({
        basePosition: ["1%", "1%"],
        baseSize: ["30px", "30px"],
        anchor: [0.5, 0.5],
        color: [1,1,1],
        visible: true,
            styleButton: 'Clasic',
        hoverColor: [0.5,0.5,0.5],
        pressedColor: [1,1,1],
        children: [{
            guiUdim: 'SimpleImage',
            children: [],
            visible: true,
            anchor: [0.5,0.5],
            image: "Icons/logo/BlockclyeIconNoText.svg",
            basePosition: ["5px", "5px"],
            baseSize: ["20px", "20px"],
        }],
        visible: true,
        guiUdim: 'SimpleButton'
    });

    const light = new THREE.DirectionalLight(0xffffff, 1);
    light.position.set(5, 10, 5);
    const light2 = new THREE.DirectionalLight(0xffffff, 1);
    light2.position.set(-5, -10, -5);
    scene.add(light);
    scene.add(light2);
    SVGElement

    container.addEventListener("click", () => {
        container.requestPointerLock();
    });

    container.addEventListener("mousemove", (e) => {
        if (window.interactingWithGui) {
            mouseX += e.movementX;
            mouseY += e.movementY;
            return;
        }

        yaw -= e.movementX * 0.002;
        pitch -= e.movementY * 0.002;

        pitch = Math.max(-Math.PI/2, Math.min(Math.PI/2, pitch));
        sendInput({yawPitch: [yaw, pitch], keys});
    });

}

export function syncWorld() {
    if (!state.world) return;

    const players = state.world.players;

    for (let id in players) {
        let p = players[id];

        let mesh = meshes.get(id);

        if (!mesh) {
            const geo = new THREE.BoxGeometry(1, 2, 1);
            const mat = new THREE.MeshStandardMaterial({ color: 0x00ff00 });
            mesh = new THREE.Mesh(geo, mat);

            scene.add(mesh);
            meshes.set(id, mesh);
        }

        mesh.position.set(p.x, p.y, p.z);
    }

    const models = state.world.serverOrLocalService.mapServerModelsService || [];
    let usados = new Set();

    models.forEach((m, i) => {
        let id = "model_" + i;
        usados.add(id);

        let mesh = meshes.get(id);
        
        if (mesh && (
            mesh.geometry.parameters.width !== m.baseSize[0] ||
            mesh.geometry.parameters.height !== m.baseSize[1] ||
            mesh.geometry.parameters.depth !== m.baseSize[2]
        )) {
            scene.remove(mesh);
            mesh.geometry.dispose();
            mesh.material.dispose();
            meshes.delete(id);
            mesh = null;
        }

        if (!mesh) {
            const geo = new THREE.BoxGeometry(
                m.baseSize[0],
                m.baseSize[1],
                m.baseSize[2]
            );

            const mat = new THREE.MeshStandardMaterial({
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

        // actualizar
        mesh.rotation.set(
            m.baseRotation[0],
            m.baseRotation[1],
            m.baseRotation[2]
        );

        mesh.position.set(
            m.basePosition[0],
            m.basePosition[1],
            m.basePosition[2]
        );

        
    });

    for (let [id, mesh] of meshes) {
        if (!usados.has(id)) {
            scene.remove(mesh);

            mesh.geometry.dispose();
            mesh.material.dispose();

            meshes.delete(id);
        }
    }
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
                player.basePosition[1] + 1,
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
    
    drmwgui.clearRect(0, 0, drmwgui.canvas.width, drmwgui.canvas.height);

    PlayerUI.forEach(u => {
        renderElement(PlayerGUI({renderOptions: { renderElement: u }}), { x: mouseX, y: mouseY });
    });

    if (window.interactingWithGui) {
        drwm.drawSujectUIInternal(mouseX, mouseY, 5, 5, '#2839f0');
    }

    renderer.render(scene, camera);
}