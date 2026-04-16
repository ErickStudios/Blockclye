const { mapServerModel, mapServerModelsService, mapServerScriptService, serverOrLocalService } = require("./core/serverOrLocalService")
const { exportLibrary, parse, run, tokenize } = require("./core/mapIndividualServices/mapServerScriptServiceLang")
const { argv, exit } = require("process")
const WebSocket = require("ws");
const fs = require("fs");

let env;
let sharedLibrary;
let lib;
let fileToLoad = argv[2];

function RayColides(dir, pos1, pos2, maxDist) {
    let dx = pos2[0] - pos1[0];
    let dy = pos2[1] - pos1[1];
    let dz = pos2[2] - pos1[2];

    let dist = Math.hypot(dx, dy, dz);

    if (dist > maxDist) return false;

    dx /= dist;
    dy /= dist;
    dz /= dist;

    let lenDir = Math.hypot(dir[0], dir[1], dir[2]);
    let dirX = dir[0] / lenDir;
    let dirY = dir[1] / lenDir;
    let dirZ = dir[2] / lenDir;

    let dot = dx * dirX + dy * dirY + dz * dirZ;

    return dot > 0.98;
}
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
                                return { type: 'obj', object: {}, res: v.refScene };
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
            // class VirtualWorkspace {
            //  func find(path: String): {TargetElement: *[], func getPropiety(propiety: String)} | SyncSimpleBlkNumber;
            //  func addChild(child:Node3D, parent:StringUriPath | String, name:StringUriPath | String): StringUriPath;
            // }
            virtualWorkspace: { type: 'obj', object: {
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

                        let pushSpecific = () => {

                            if ('object' in groupableElement && 'SimpleBlkModel' in groupableElement.object) {
                                let elementInLen = serverOrLocalServiceEnv.mapServerModelsService.length;
                                serverOrLocalServiceEnv.mapServerModelsService.push(groupableElement.object.SimpleBlkModel);
                                return {
                                    type: "part",
                                    name: nameToPut,
                                    ref: elementInLen
                                };
                            }
                            else {
                                return groupableElement;
                            }
                        }

                        if (workspaceFoldersDiv[0] == '') {
                            groupableElement.name = nameToPut;
                            node.push(pushSpecific());
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
                            node.push(pushSpecific());
                        }

                        return addIn + nameToPut;
                    }
                },
            }}
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

            if (inst.type === 'obj') {

                inst.object.instantiate = {
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
    lib.SimpleRay = {type: 'func', func: (params) => {
        let rotationObj1 = params[0].items;
        let positionObj1 = params[1].items;
        let positionObj2 = params[2].items;
        let maxDistance = params[3];

        let colition = RayColides(rotationObj1, positionObj1, positionObj2, maxDistance);
        return colition;
    }};
    lib.ButtonStyles = lib.createEnum('ButtonStyles', ['Clasic', 'Custom']);
    lib.SimpleRectangle = {type: 'func', func: /** @param { any[] } params */ (params) => {
        let basePosition = lib.Vector2.func(["0px", "0px"]).items;
        let baseSize = lib.Vector2.func(["200px", "50px"]).items;
        let anchor = lib.Vector2.func([0, 0]).items;
        let color = lib.Color3.func([1, 0, 0]).items;
        let visible = true;
        
        params.forEach((v,i) => {
            switch (i) {
                case 0:
                    basePosition = v.items;
                    break;
                case 1:
                    baseSize = v.items;
                    break;
                case 2:
                    anchor = v.items;
                    break;
                case 3:
                    color = v.items;
                    break;
                case 4:
                    try {
                        visible = lib.Boolean.func([v]);
                    } catch (ex) {
                        if (ex instanceof TypeError) {
                            ex.message = lib.errorAtCls('SimpleRectangle', ex.message, "in the param 5 ");
                        }
                        throw ex;
                    }
                    break;
                default:
                    throw new SyntaxError(lib.errorAtCls('SimpleRectangle', `too many params`))
            }
        });

        return {
            guiUdim: 'SimpleRectangle',
            basePosition,
            baseSize,
            anchor,
            color,
            visible
        }
    }};
    lib.Vector3 = {
        type: 'func', func: (params) => ({
            type: 'array',
            items: params
        }), hasStatics: true, statics: {
            'ZERO': () => [0, 0, 0],
            'ONE': () => [1, 1, 1]
        }
    };
    lib.Vector2 = {
        type: 'func', func: (params) => ({
            type: 'array',
            items: [params[0], params[1]]
        })
    }
    lib.Color3 = lib.Vector3;
    lib.SimpleBlk = {
        type: 'func', func: (params) => {
            let model = new mapServerModel();
            model.basePosition = params[0].items;
            model.baseSize = params[1].items;
            model.baseRotation = params[2].items;
            model.color = params[3].items;

            return {
                type: 'obj',
                object: {
                    'SimpleBlkModel': model,
                }
            }
        }, hasStatics: false
    };
    lib.addChild = {
        type: 'func', func: async (params) => {
            return new Promise(resolve => {
                // enviar mensaje al main thread
                self.retval = undefined;
                self.postMessage({
                    func: 'crt',
                    params: [JSON.parse(JSON.stringify(params[0].object.internalObjectModel))]
                });

                // registrar listener solo para este call
                const handler = (e) => {
                    if (e.data.retval !== undefined) {
                        self.removeEventListener('message', handler);
                        params[0].object['indexInternalFinally'] = e.data.retval;
                        resolve({ type: 'SyncSimpleBlkNumber', value: e.data.retval });
                    }
                };

                self.addEventListener('message', handler);
            });
        }
    };
    lib.SerializableObject = {
        type: 'func', func: async (params) => {
            return new Promise(resolve => {
                let objectToSerialize = params[0];

                if (objectToSerialize.type == 'SyncSimpleBlkNumber') {
                    const isMainThread = !(
                        typeof WorkerGlobalScope !== "undefined" &&
                        self instanceof WorkerGlobalScope
                    );

                    if (!isMainThread) self.retval = undefined;

                    let objectSerialized = {
                        type: 'obj',
                        object: {
                            id: { type: 'Number', value: objectToSerialize.value },
                            index: objectToSerialize.value,
                            pos: { type: 'obj', object: { arrayInternal: [0, 0, 0] } },
                            size: { type: 'obj', object: { arrayInternal: [0, 0, 0] } },
                            rotation: { type: 'obj', object: { arrayInternal: [0, 0, 0] } }
                        }
                    };

                    if (isMainThread) {
                        let retval = globalThis.serverOrLocalServiceEnv.mapServerModelsService[objectSerialized.object.id.value];

                        if (!retval) {
                            resolve({});
                            return
                        };

                        objectSerialized.object.material = retval.material;
                        objectSerialized.object.weldedTo = retval.weldedTo;
                        objectSerialized.object.color = retval.color;

                        let objectPos = objectSerialized.object.pos.object;
                        let objectSize = objectSerialized.object.size.object;
                        let objectRotation = objectSerialized.object.rotation.object;

                        objectPos.arrayInternal = [...retval.basePosition];
                        objectSize.arrayInternal = [...retval.baseSize];
                        objectRotation.arrayInternal = [...retval.baseRotation];
                        objectSerialized.object.mass = retval.mass;
                        objectSerialized.object.useGravity = retval.useGravity;
                        objectSerialized.object.isStatic = retval.isStatic;
                        objectSerialized.object.velocity = retval.velocity;

                        let registerPosVector3 = (field) => {
                            field.getX = {
                                type: 'func', func: (params) => {
                                    return field.arrayInternal[0];
                                }
                            };
                            field.getY = {
                                type: 'func', func: (params) => {
                                    return field.arrayInternal[1];
                                }
                            };
                            field.getZ = {
                                type: 'func', func: (params) => {
                                    return field.arrayInternal[2];
                                }
                            };
                            field.setX = {
                                type: 'func', func: (params) => {
                                    field.arrayInternal[0] = params[0];
                                }
                            };
                            field.setY = {
                                type: 'func', func: (params) => {
                                    field.arrayInternal[1] = params[0];
                                }
                            };
                            field.setZ = {
                                type: 'func', func: (params) => {
                                    field.arrayInternal[2] = params[0];
                                }
                            };
                            field.set = {
                                type: 'func', func: (params) => {
                                    field.arrayInternal = params[0].items;
                                }
                            };
                        };
                        registerPosVector3(objectPos);
                        registerPosVector3(objectSize);
                        registerPosVector3(objectRotation);

                        objectSerialized.object.request = {
                            type: 'func', func: (params) => {

                                let retval = window.serverOrLocalServiceEnv.mapServerModelsService[objectSerialized.object.id.value];
                                objectSerialized.object.color = retval.color;
                                objectSerialized.object.material = retval.material;
                                objectSerialized.object.weldedTo = retval.weldedTo;
                                objectSerialized.object.mass = retval.mass;
                                objectSerialized.object.useGravity = retval.useGravity;
                                objectSerialized.object.isStatic = retval.isStatic;
                                objectPos.arrayInternal = [...retval.basePosition];
                                objectSize.arrayInternal = [...retval.baseSize];
                                objectRotation.arrayInternal = [...retval.baseRotation];
                                objectSerialized.object.velocity = retval.velocity;

                            }
                        };

                        objectSerialized.object.update = {
                            type: 'func', func: (params) => {
                                let obje = globalThis.serverOrLocalServiceEnv.mapServerModelsService[objectSerialized.object.id.value];
                                obje.material = objectSerialized.object.material;
                                obje.weldedTo = objectSerialized.object.weldedTo;
                                globalThis.serverOrLocalServiceEnv.mapServerModelsService.move(objectSerialized.object.id.value, ...objectPos.arrayInternal);
                                globalThis.serverOrLocalServiceEnv.mapServerModelsService.scale(objectSerialized.object.id.value, ...objectSize.arrayInternal);
                                globalThis.serverOrLocalServiceEnv.mapServerModelsService.rotate(objectSerialized.object.id.value, ...objectRotation.arrayInternal);
                                obje.mass = objectSerialized.object.mass;
                                obje.useGravity = objectSerialized.object.useGravity;
                                obje.isStatic = objectSerialized.object.isStatic;
                                obje.velocity = objectSerialized.object.velocity;
                                obje.color = objectSerialized.object.color;
                            }
                        };

                        resolve(objectSerialized);
                            
                        return;
                    }

                    self.postMessage({
                        func: 'req',
                        params: [objectSerialized.object.id.value]
                    });

                    const handler = (e) => {
                        let retval = e.data.retval;
                        if (e.data.retval !== undefined) {
                            self.removeEventListener('message', handler);
                            objectSerialized.object.material = retval.material;
                            objectSerialized.object.weldedTo = retval.weldedTo;
                            objectSerialized.object.color = retval.color;

                            let objectPos = objectSerialized.object.pos.object;
                            let objectSize = objectSerialized.object.size.object;
                            let objectRotation = objectSerialized.object.rotation.object;

                            objectPos.arrayInternal = retval.basePosition;
                            objectSize.arrayInternal = retval.baseSize;
                            objectRotation.arrayInternal = retval.baseRotation;
                            objectSerialized.object.mass = retval.mass;
                            objectSerialized.object.useGravity = retval.useGravity;
                            objectSerialized.object.isStatic = retval.isStatic;
                            objectSerialized.object.velocity = retval.velocity;

                            let registerPosVector3 = (field) => {
                                field.getX = {
                                    type: 'func', func: (params) => {
                                        return field.arrayInternal[0];
                                    }
                                };
                                field.getY = {
                                    type: 'func', func: (params) => {
                                        return field.arrayInternal[1];
                                    }
                                };
                                field.getZ = {
                                    type: 'func', func: (params) => {
                                        return field.arrayInternal[2];
                                    }
                                };
                                field.setX = {
                                    type: 'func', func: (params) => {
                                        field.arrayInternal[0] = params[0];
                                    }
                                };
                                field.setY = {
                                    type: 'func', func: (params) => {
                                        field.arrayInternal[1] = params[0];
                                    }
                                };
                                field.setZ = {
                                    type: 'func', func: (params) => {
                                        field.arrayInternal[2] = params[0];
                                    }
                                };
                            };
                            registerPosVector3(objectPos);
                            registerPosVector3(objectSize);
                            registerPosVector3(objectRotation);

                            objectSerialized.object.request = {
                                type: 'func', func: async (params) => {
                                    return new Promise(resolve2 => {
                                        self.retval = undefined;
                                        self.postMessage({
                                            func: 'req',
                                            params: [objectSerialized.object.id.value]
                                        });
                                        const handler2 = (e) => {
                                            if (e.data.retval !== undefined) {
                                                self.removeEventListener('message', handler2);
                                                let retval = e.data.retval;
                                                objectSerialized.object.color = retval.color;
                                                objectSerialized.object.material = retval.material;
                                                objectSerialized.object.weldedTo = retval.weldedTo;
                                                objectSerialized.object.mass = retval.mass;
                                                objectSerialized.object.useGravity = retval.useGravity;
                                                objectSerialized.object.isStatic = retval.isStatic;
                                                objectPos.arrayInternal = retval.basePosition;
                                                objectSize.arrayInternal = retval.baseSize;
                                                objectRotation.objectRotation = retval.baseRotation;
                                                objectSerialized.object.velocity = retval.velocity;

                                                resolve2(1);
                                            }
                                        }
                                        self.addEventListener('message', handler2);

                                    });
                                }
                            };

                            objectSerialized.object.update = {
                                type: 'func', func: (params) => {
                                    self.postMessage({
                                        func: 'updt',
                                        params: [objectSerialized.object.id.value, {
                                            material: objectSerialized.object.material,
                                            weldedTo: objectSerialized.object.weldedTo,
                                            basePosition: objectPos.arrayInternal,
                                            baseSize: objectSize.arrayInternal,
                                            baseRotation: objectRotation.arrayInternal,
                                            mass: objectSerialized.object.mass,
                                            useGravity: objectSerialized.object.useGravity,
                                            isStatic: objectSerialized.object.isStatic,
                                            velocity: objectSerialized.object.velocity
                                        }]
                                    });
                                }
                            };

                            resolve(objectSerialized);
                        }
                    };

                    self.addEventListener('message', handler);
                }
            });
        }
    };
    lib.SimpleTextBlks = {type: 'func', func: /** @param { any[] } params */ (params) => {
        let fontSize = '10px';
        let letterSpacing = '2px';
        let align = 'left';
        let basePosition = lib.Vector2.func(["0px", "0px"]).items;
        let baseSize = lib.Vector2.func(["200px", "50px"]).items;
        let text = 'Misingno';
        let color = lib.Color3.func([1, 0, 0]).items;
        let visible = true;

        params.forEach((v,i) => {
            switch (i) {
                case 0:
                    fontSize = v;
                    break;
                case 1:
                    letterSpacing = v;
                    break;
                case 2:
                    align = v;
                    break;
                case 3:
                    basePosition = v.items;
                    break;
                case 4:
                    baseSize = v.items;
                    break;
                case 5:
                    text = v;
                    break;
                case 6:
                    color = v.items;
                    break;
                case 7:
                    try {
                        visible = lib.Boolean.func([v]);
                    } catch (ex) {
                        if (ex instanceof TypeError) {
                            ex.message = lib.errorAtCls('SimpleTextBlks', ex.message, "in the param 8 ");
                        }
                        throw ex;
                    }
                    break;
                default:
                    throw new SyntaxError(lib.errorAtCls('SimpleTextBlks', `too many params`))
            }
        });

        return {
            guiUdim: 'SimpleTextBlks',
            fontSize,
            letterSpacing,
            align,
            basePosition,
            baseSize,
            text,
            color,
            visible
        }
    }};
    lib.Decimal = {
        type: "func",
        func: ([a, b]) => {
            if (typeof a !== "number" || typeof b !== "number") {
            throw new TypeError("Decimal expects numbers");
            }
            return Number(`${a}.${b}`);
        }
    };
    /**
    ```
    class SimpleButton extends SimpleRectangle {
        var text: SimpleTextBlks;
        var styleButton: ButtonStyles;
        var hoverColor: Color3;
        var pressedColor: Color3;
        var children: extends UIElement;
        var guiUdim: 'SimpleButton';
    }
    ```
     */
    lib.SimpleButton = {type: 'func', func: (params) => {
        let heredated = lib.SimpleRectangle.func(params.slice(0, params.length >= 4 ? 4 : params.length));
        heredated.guiUdim = 'SimpleButton';
        heredated.text = lib.SimpleTextBlks.func([]);
        heredated.styleButton = 'Clasic';
        heredated.hoverColor = [1,1,1];
        heredated.pressedColor = [1,0,1];
        heredated.children = [];

        if (params.length >= 4) {
            params.splice(0, 5);
            params.forEach((p, i) => {
                switch (i) {
                    case 0:
                        heredated.text = p;
                        break;
                    case 1:
                        try {
                            heredated.styleButton = lib.ButtonStyles.func([p]);
                        } catch (ex) {
                            if (ex instanceof TypeError) {
                                ex.message = lib.errorAtCls('SimpleButton', ex.message, "in the param 7 ");
                            }
                            throw ex;
                        }
                        heredated.styleButton = lib.ButtonStyles.func([p]);
                        break;
                    case 2:
                        heredated.hoverColor = p;
                        break;
                    case 3:
                        heredated.pressedColor = p;
                        break;
                    case 4:
                        heredated.children = p;
                        break;
                    default:
                        throw new SyntaxError(lib.errorAtCls('SimpleButton', `too many params`))
                }
            })
        }

        return heredated;
    }};

    return lib;
}

/*(async () => {
    let code = `
        var pow2Simple = InternalDocsStrictEnum("2powSimple", Array(1,2,4,8,16,32));
        var test1 = pow2Simple(8);
        print(test1);
        var test2 = pow2Simple(3);
        print("how?", test2);
    `
    let liba = createRuntimeLib();
    let tokens = tokenize(code);
    let parsed = parse(tokens);
    await run(parsed, liba);
})();*/

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

const wss = new WebSocket.Server({ 
    port: 8080,
    host: "0.0.0.0"
});

let pendingRequests = new Map();
let requestIdCounter = 0;

function requestClient(ws, type, data = {}) {
    return new Promise((resolve) => {
        const requestId = requestIdCounter++;

        pendingRequests.set(requestId, resolve);

        ws.send(JSON.stringify({
            type: "request",
            requestType: type,
            requestId,
            data
        }));
    });
}

console.log("🚀 Server running on ws://" + getLocalIP() + ":8080");

// estado del mundo
let world = {
    players: {},
    serverOrLocalService: new serverOrLocalService()
};

function updateDeletation(deletedId) {
    wss.clients.forEach((client) => {
        if (client.playerId > deletedId) {
            client.playerId--;

            if (client.readyState === WebSocket.OPEN) {
                client.send(JSON.stringify({
                    type: "idChange",
                    newId: client.playerId,
                    world
                }));
            }
        }
    });
}

world.serverOrLocalService.importJson(fs.readFileSync(fileToLoad, "utf-8"));
var serverOrLocalServiceEnv = world.serverOrLocalService;
globalThis.serverOrLocalServiceEnv = serverOrLocalServiceEnv;

function createClient(client, id) {
    return {
        type: 'obj',
        object: {
            box: lib.SerializableObject.func([{ type: 'SyncSimpleBlkNumber', value: id }]),
            // class PlayerUI {
            //  func sendItem(...uiItems:SimpleBlk2D): Number;
            //  func editItem(index:Number, newItem:UIElement): void;
            //  func getItem(index:Number): UIElement;
            //  func deleteItem(index:Number): void;
            //  func countItems(): Number;
            // }
            PlayerUI: {
                type: 'obj', object: {
                    sendItem: {
                        type: 'func', func: async (params) => {
                            if (client.readyState === WebSocket.OPEN) {
                                let result = await requestClient(client, "PlayerUI.appendItem", { item: params[0] });

                                return result;
                            }
                        }
                    },
                    editItem: {
                        type: 'func', func: async (params) => {
                            if (client.readyState === WebSocket.OPEN) {
                                let result = await requestClient(client, "PlayerUI.editItem", { item: params[0], newV: params[1] });
                            }
                        }
                    },
                    getItem: {
                        type: 'func', func: async (params) => {
                            if (client.readyState === WebSocket.OPEN) {
                                let result = await requestClient(client, "PlayerUI.getItem", { item: params[0] });

                                return result;
                            }
                        }
                    },
                    deleteItem: {
                        type: 'func', func: async (params) => {
                            if (client.readyState === WebSocket.OPEN) {
                                let result = await requestClient(client, "PlayerUI.deleteItem", { item: params[0] });
                            }
                        }
                    },
                    countItems: {
                        type: 'func', func: async (params) => {
                            if (client.readyState === WebSocket.OPEN) {
                                let result = await requestClient(client, "PlayerUI.itemsCount");

                                return result;
                            }
                        }
                    },
                    click: {
                        type: 'func', func: async (params) => {
                            return false;
                        }
                    }
                }
            },
        }
    }
}
wss.on("connection", (ws) => {
    console.log("🟢 Player connected");

    let id = world.serverOrLocalService.mapServerModelsService.length;
    
    let p = new mapServerModel();
    p.basePosition = [0,0,0];
    p.baseSize = [1,2,1];
    p.color = [Math.random(),Math.random(),Math.random()];
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
        if (data.type === "response") {
            const resolve = pendingRequests.get(data.requestId);
            if (resolve) {
                resolve(data.data);
                pendingRequests.delete(data.requestId);
            }
        }
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
            if (length > 0) {
                p.velocity[0] = moveX * 5;
                p.velocity[2] = moveZ * 5;
            } else {
                p.velocity[0] *= 0.8;
                p.velocity[2] *= 0.8;
            }

            if (data.keys[' '] && isOnGround(p, world.serverOrLocalService.mapServerModelsService)) {
                p.velocity[1] = 5; // fuerza de salto realista
            }
        }
    });

    ws.on("close", async () => {
        console.log("🔴 Player disconnected");

        let id = ws.playerId;

        // lógica existente...
        await (async () => {
            env = (await world.serverOrLocalService.mapServerScriptService.exIt());
            sharedLibrary = env;
            let exp = await run({},{},true);

            let ServerToUpdate = createRuntimeServer(lib);

            await exp.recursiveInterprete(
                sharedLibrary.serverOrLocalService.object.cLeave.body,
                { ServerToUpdate, ...globalScopeServer , client: createClient(ws, id) },
                lib
            );
        })();

        // 🔥 IMPORTANTE ORDEN
        world.serverOrLocalService.mapServerModelsService.splice(id, 1);

        updateDeletation(id); // ← aquí notificas a todos
    });
});

function checkCollisionModel(nextPos, model, models) {
    const [mx, my, mz] = nextPos;
    const [msx, msy, msz] = model.baseSize;

    for (let other of models) {
        if (other === model) continue;

        const [x, y, z] = other.basePosition;
        const [sx, sy, sz] = other.baseSize;

        if (
            mx - msx/2 < x + sx/2 &&
            mx + msx/2 > x - sx/2 &&
            my - msy/2 < y + sy/2 &&
            my + msy/2 > y - sy/2 &&
            mz - msz/2 < z + sz/2 &&
            mz + msz/2 > z - sz/2
        ) {
            return true;
        }
    }
    return false;
}
function isOnGround(model, models) {
    let epsilon = 0.2;

    let belowPos = [
        model.basePosition[0],
        model.basePosition[1] - epsilon,
        model.basePosition[2]
    ];

    let onGround = checkCollisionModel(belowPos, model, models);

    return onGround && model.velocity[1] <= 0;
}
function getCollisionModel(nextPos, model, models) {
    const [mx, my, mz] = nextPos;
    const [msx, msy, msz] = model.baseSize;

    for (let other of models) {
        if (other === model) continue;

        const [x, y, z] = other.basePosition;
        const [sx, sy, sz] = other.baseSize;

        if (
            mx - msx/2 < x + sx/2 &&
            mx + msx/2 > x - sx/2 &&
            my - msy/2 < y + sy/2 &&
            my + msy/2 > y - sy/2 &&
            mz - msz/2 < z + sz/2 &&
            mz + msz/2 > z - sz/2
        ) {
            return other;
        }
    }
    return null;
}
function physicsStep(models, dt) {
    const MAX_VEL = 20;

    for (let i = 0; i < models.length; i++) {
        let m = models[i];
        m.velocity[0] = Math.max(-MAX_VEL, Math.min(MAX_VEL, m.velocity[0]));
        m.velocity[1] = Math.max(-MAX_VEL, Math.min(MAX_VEL, m.velocity[1]));
        m.velocity[2] = Math.max(-MAX_VEL, Math.min(MAX_VEL, m.velocity[2]));
        if (m.weldedTo != null && m.weldedTo != -1) continue;
        if (m.isStatic) continue;

        if (m.useGravity) {
            m.velocity[1] -= 9.8 * dt; // gravedad real
        }

        let nextPos = [
            m.basePosition[0] + m.velocity[0] * dt,
            m.basePosition[1] + m.velocity[1] * dt,
            m.basePosition[2] + m.velocity[2] * dt
        ];

        let collided = getCollisionModel(nextPos, m, models);
        
        // ignorar colisión si solo es el suelo
        if (collided) {
            let isFloor =
                m.basePosition[1] >= collided.basePosition[1] + collided.baseSize[1] / 2;

            if (isFloor) {
                collided = null;
            }
        }

        if (!collided) {
            let pos = [...m.basePosition];

            // eje Y primero (gravedad)
            let nextY = pos[1] + m.velocity[1] * dt;
            if (!checkCollisionModel([pos[0], nextY, pos[2]], m, models)) {
                pos[1] = nextY;
            } else {
                m.velocity[1] = 0;
            }

            // eje X
            let nextX = pos[0] + m.velocity[0] * dt;
            if (!checkCollisionModel([nextX, pos[1], pos[2]], m, models)) {
                pos[0] = nextX;
            } else {
                m.velocity[0] = 0;
            }

            // eje Z
            let nextZ = pos[2] + m.velocity[2] * dt;
            if (!checkCollisionModel([pos[0], pos[1], nextZ], m, models)) {
                pos[2] = nextZ;
            } else {
                m.velocity[2] = 0;
            }

            models.move(i, ...pos);
        } else {
            let push = [
                m.velocity[0],
                0,
                m.velocity[2]
            ];

            let otherNext = [
                collided.basePosition[0] + push[0],
                collided.basePosition[1],
                collided.basePosition[2] + push[2]
            ];

            let blocked = getCollisionModel(otherNext, collided, models);

            if (!blocked && !collided.isStatic) {
                let otherIndex = models.indexOf(collided);
                if (!collided.isStatic) {
                    collided.velocity[0] += m.velocity[0] * 0.5;
                    collided.velocity[2] += m.velocity[2] * 0.5;
                }
                models.move(i, ...nextPos);
            } else {
                m.velocity[0] = 0;
                m.velocity[2] = 0;
            }
        }
    }
}

let globalScopeServer = {
};

(async () => {
    env = (await world.serverOrLocalService.mapServerScriptService.exIt());
    sharedLibrary = env;
    let exp = await run({},{},true);

    lib = createRuntimeLib();
    let ServerToInit = createRuntimeServer(lib);

    exp.recursiveInterprete(sharedLibrary.serverOrLocalService.object.sInit.body, {
        ServerToInit,
        ...globalScopeServer
    }, lib);
})();

let lastTime = Date.now();

setInterval(async () => {
    let now = Date.now();
    let dt = (now - lastTime) / 1000;
    lastTime = now;

    physicsStep(world.serverOrLocalService.mapServerModelsService, dt)
    const snapshot = world;

    await wss.clients.forEach(async (client) => {
        let id = client.playerId;

        if (id == null) return;
        try { await (async () => {
            env = (await world.serverOrLocalService.mapServerScriptService.exIt());
            sharedLibrary = env;
            let exp = await run({},{},true);

            let ServerToUpdate = createRuntimeServer(lib);

            await exp.recursiveInterprete(sharedLibrary.serverOrLocalService.object.cUpdate.body, {
                ServerToUpdate, ...globalScopeServer , client: createClient(client, id)
            }, lib);
        })(); } catch {
            console.log(lib.errorAtCls('CharacterBody', 'The player who requested the server is absent.'))
            updateDeletation(client.playerId);
            serverOrLocalServiceEnv.mapServerModelsService.splice(client.playerId,1);
            wss.clients.delete(client);
        }
        if (client.readyState === WebSocket.OPEN) {
            client.send(JSON.stringify({
                type: "state",
                world: snapshot
            }));
        }
    });
}, 16);