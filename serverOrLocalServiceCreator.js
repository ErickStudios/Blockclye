const { mapServerModel, mapServerModelsService, mapServerScriptService, serverOrLocalService } = require("./core/serverOrLocalService")
const { exportLibrary, parse, run, tokenize } = require("./core/mapIndividualServices/mapServerScriptServiceLang")
const { argv } = require("process")
const WebSocket = require("ws");
const fs = require("fs");
const { spawn } = require("child_process");
const os = require("os");

let env;
let sharedLibrary;
let lib;
let fileToLoad = argv[2];

function getLocalIP() {
    const interfaces = require("os").networkInterfaces();

    for (let name in interfaces) {
        for (let net of interfaces[name]) {
            if (net.family === "IPv4" && !net.internal) {
                return net.address;
            }
        }
    }

    return "localhost";
}
let createGroup = (name = "MyGroup") => {
    return {type: "group",name,children: []};}
let findUniversal = (params) => {
    let path = params[0];
    if (path[0] == '/') path = path.substring(1);
    let workspaceFoldersDiv = path.split('/');
    let node = serverOrLocalServiceEnv.workspaceHierarchy;
    for (let index = 0; index < workspaceFoldersDiv.length; index++) {
        const element = workspaceFoldersDiv[index];
        for (const v of node) {
            if (v.name == element) {
                if (v.type == "part") {
                    return { type: 'SyncSimpleBlkNumber', value: v.ref }
                }
                else {
                    node = v;
                    node = node.children;
                }
            }
        };
    }
    let objectForSerialize = {
        type: 'obj',
        object: {
            targetElement: node,
            getPropiety: {
                type: 'func', func: (params) => {
                    let propiety = params[0];
                    let propietys = objectForSerialize.object.targetElement;

                    for (let v of propietys) {
                        if (propiety == 'refScene') {
                            if (v.name === 'scenePtr') {
                                return { type: 'sceneResource', res: v.refScene };
                            }
                        }

                        if (v.name == propiety) {
                            return v;
                        }
                    }
                }
            }
        }
    }
    return objectForSerialize;
};
let createRuntimeServer = (lib) => {
    let ServerToInit = {
        type: 'obj',
        object: {
            virtualWorkspace: {
                type: 'obj',
                object: {
                    find: {
                        type: 'func', func: findUniversal
                    },
                    addChild: {
                        type: 'func', func: (params) => {
                            let groupableElement = params[0];
                            let addIn = params[1];
                            let nameToPut = params[2];

                            let workspaceFoldersDiv = addIn.split('/');

                            let node = serverOrLocalServiceEnv.workspaceHierarchy;

                            if (workspaceFoldersDiv[0] == '') {
                                groupableElement.name = nameToPut;
                                node.push(groupableElement);
                            }
                            else {
                                for (let index = 0; index < workspaceFoldersDiv.length; index++) {
                                    const element = workspaceFoldersDiv[index];
                                    node.forEach((v) => {
                                        if (v.name == element) {
                                            node = v;
                                            node = node.children;
                                        }
                                    });
                                }
                            }

                            return addIn + nameToPut;
                        }
                    },
                }
            }
        }
    };
    ServerToInit.object.virtualWorkspace.object.importScene = {
        type: 'func', func: (params) => {
            let scenePath = params[0];
            let reference = ServerToInit.object.virtualWorkspace.object.find.func([scenePath]);

            if ('object' in reference) {
                let codeR = reference.object.getPropiety.func(["refScene"]);
                return lib.preload.func([codeR]);
            }
        }
    }
    return ServerToInit;
}
let createRuntimeLib = () => {

    let lib = exportLibrary();

    lib.Group = {
        type: 'func', func: (params) => {
            let group = createGroup();
            return group;
        }
    };
    lib.preload = {
        type: 'func',
        func: (params) => {
            let inst = params[0];

            if (inst.type === 'sceneResource') {

                inst.instantiate = {
                    type: 'func',
                    func: (params) => {

                        let path = params[0];

                        let scene = inst.res;

                        let offset = serverOrLocalServiceEnv.mapServerModelsService.length;

                        let clonedModels = JSON.parse(JSON.stringify(scene.mapServerModelsService));

                        clonedModels.forEach((m, i) => {
                            if (m.weldedTo !== -1 && m.weldedTo != null) {
                                m.weldedTo += offset;
                            }
                        });

                        let basePos = [0, 0, 0];

                        clonedModels.forEach(m => {
                            m.basePosition[0] += basePos[0];
                            m.basePosition[1] += basePos[1];
                            m.basePosition[2] += basePos[2];
                        });

                        serverOrLocalServiceEnv.mapServerModelsService.push(...clonedModels);

                        let cloneWorkspace = (nodes) => {
                            return nodes.map(n => {
                                let copy = JSON.parse(JSON.stringify(n));

                                if (copy.type === "part") {
                                    copy.ref += offset;
                                }

                                if (copy.children) {
                                    copy.children = cloneWorkspace(copy.children);
                                }

                                return copy;
                            });
                        };

                        let clonedHierarchy = cloneWorkspace(scene.workspaceHierarchy);

                        let findNodeByPath = (path) => {
                            if (path[0] === '/') path = path.substring(1);
                            let parts = path.split('/');

                            let node = serverOrLocalServiceEnv.workspaceHierarchy;

                            for (let p of parts) {
                                let found = null;

                                for (let v of node) {
                                    if (v.name === p) {
                                        found = v;
                                        break;
                                    }
                                }

                                if (!found) return null;

                                node = found.children;
                            }

                            return node;
                        };

                        let target = findNodeByPath(path);

                        if (target) {
                            target.push(...clonedHierarchy);
                        }

                        return {
                            type: 'obj', value: offset, object: {
                                find: {
                                    type: 'func', func: (params) => {
                                        return findUniversal([path + "/" + params[0]]);
                                    }
                                }
                            }
                        };
                    }
                };
            }

            return inst;
        }
    };

    return lib;
}
function createWorldSnapshot(world) {
    return {
        players: world.players,
        models: world.serverOrLocalService.mapServerModelsService.map(m => ({
            p: m.basePosition,
            s: m.baseSize,
            r: m.baseRotation,
            c: m.color,
            w: m.weldedTo
        }))
    };
}

const wss = new WebSocket.Server({ port: 8080, host: "0.0.0.0" });

const ip = getLocalIP();

console.log(`🚀 Server running on ws://${ip}:8080`);

// estado del mundo
let world = {
    players: {},
    serverOrLocalService: new serverOrLocalService()
};

world.serverOrLocalService.importJson(fs.readFileSync(fileToLoad, "utf-8"));
var serverOrLocalServiceEnv = world.serverOrLocalService;
globalThis.serverOrLocalServiceEnv = serverOrLocalServiceEnv;

wss.on("connection", (ws) => {
    console.log("🟢 Player connected");

    let id = world.serverOrLocalService.mapServerModelsService.length;
    
    let p = new mapServerModel();
    p.basePosition = [0,0,0];
    p.baseSize = [1,2,1];
    p.color = [0.7,0.5,1];
    world.serverOrLocalService.mapServerModelsService.push(p);
    ws.playerId = id;

    // enviar estado inicial
    ws.send(JSON.stringify({
        type: "init",
        id,
        world
    }));

    ws.on("message", (msg) => {
        const data = JSON.parse(msg);

        // 🎮 input del cliente
        if (data.type === "input") {

            if (!p) return;

            const speed = 0.1;

            if (data.yawPitch) {
                let [ yaw, pitch ] = data.yawPitch;
                p.baseRotation = [
                    0,
                    yaw,
                    0
                ];
            }
            const yaw = p.baseRotation[1];

            const forwardX = Math.sin(yaw);
            const forwardZ = Math.cos(yaw);

            const rightX = Math.cos(yaw);
            const rightZ = -Math.sin(yaw);

            let moveX = 0;
            let moveZ = 0;

            // adelante / atrás
            if (data.keys.w) {
                moveX += forwardX;
                moveZ += forwardZ;
            }
            if (data.keys.s) {
                moveX -= forwardX;
                moveZ -= forwardZ;
            }

            // izquierda / derecha
            if (data.keys.a) {
                moveX -= rightX;
                moveZ -= rightZ;
            }
            if (data.keys.d) {
                moveX += rightX;
                moveZ += rightZ;
            }

            // normalizar (para no ir más rápido en diagonal)
            let length = Math.hypot(moveX, moveZ);
            if (length > 0) {
                moveX /= length;
                moveZ /= length;
            }

            // aplicar movimiento
            p.basePosition[0] += moveX * speed;
            p.basePosition[2] += moveZ * speed;

            if (data.keys[' ']) p.velocity[1] = 0.2;
        }
    });

    ws.on("close", () => {
        console.log("🔴 Player disconnected");
        world.serverOrLocalService.mapServerModelsService.splice(id, 1);
    });
});

function checkCollisionModel(pos, model, models) {
    for (let other of models) {
        if (other === model) continue;

        let [x, y, z] = other.basePosition;
        let [sx, sy, sz] = other.baseSize;

        if (
            pos[0] < x + sx / 2 &&
            pos[0] > x - sx / 2 &&
            pos[1] < y + sy / 2 &&
            pos[1] > y - sy / 2 &&
            pos[2] < z + sz / 2 &&
            pos[2] > z - sz / 2
        ) {
            return true;
        }
    }
    return false;
}
function physicsStep(models) {
    for (let i = 0; i < models.length; i++) {
        let m = models[i];

        if (m.weldedTo != null && m.weldedTo != -1) continue;
        if (m.isStatic) continue;

        if (m.useGravity) {
            m.velocity[1] -= 0.01;
        }

        let nextPos = [
            m.basePosition[0] + m.velocity[0],
            m.basePosition[1] + m.velocity[1],
            m.basePosition[2] + m.velocity[2]
        ];

        if (!checkCollisionModel(nextPos, m, models)) {
            models.move(i, ...nextPos);
        } else {
            m.velocity = [0, 0, 0];
        }
    }
}

(async () => {
    env = (await world.serverOrLocalService.mapServerScriptService.exIt());
    sharedLibrary = env;
    let exp = await run({},{},true);

    lib = createRuntimeLib();
    let ServerToInit = createRuntimeServer(lib);

    exp.recursiveInterprete(sharedLibrary.serverOrLocalService.object.sInit.body, {
        ServerToInit
    }, lib);
})();

setInterval(async () => {
    physicsStep(world.serverOrLocalService.mapServerModelsService)
    const snapshot = world;

    await wss.clients.forEach(async (client) => {
        let id = client.playerId;

        if (!id) return;
        (async () => {
            env = (await world.serverOrLocalService.mapServerScriptService.exIt());
            sharedLibrary = env;
            let exp = await run({},{},true);

            let ServerToUpdate = createRuntimeServer(lib);

            exp.recursiveInterprete(sharedLibrary.serverOrLocalService.object.cUpdate.body, {
                ServerToUpdate, client: {
                    type: 'obj',
                    object: {
                        box: lib.SerializableObject.func([{type: 'SyncSimpleBlkNumber', value: id }])
                    }
                }
            }, lib);
        })();
        if (client.readyState === WebSocket.OPEN) {
            client.send(JSON.stringify({
                type: "state",
                world: snapshot
            }));
        }
    });
}, 50);