/** [GLOBAL] Global Importations */
import { AppLib } from "./lib/app.js"
import * as THREE from "https://cdn.jsdelivr.net/npm/three@0.158.0/build/three.module.js";
import { serverOrLocalService, mapServerModel } from "./core/serverOrLocalService.js"
/** [GLOBAL] Fundamental Variables */
const canvas = document.getElementById("game");
/** [FUNCTION] Starts The Application */
window.startApp = () => {
    // Env That The App Loads
    var serverOrLocalServiceEnv = new serverOrLocalService();
    // Tools For Edit The 'serverOrLocalServiceTools'
    var serverOrLocalServiceTools = {
        Export: document.getElementById("serverOrLocalService.Export"),
        Import: document.getElementById("serverOrLocalService.Import"),
        ImportInternal: document.getElementById("serverOrLocalService.ImportInternal"),
        WorkSpace: document.getElementById("editorLayout")
    };
    // Tools For Edit The 'mapServerModelsService'
    var mapServerModelsServiceTools = {
        DuplicatePart: document.getElementById("mapServerModelsService.DuplicatePart"),
        DelPart: document.getElementById("mapServerModelsService.DelPart"),
        MovePart: document.getElementById("mapServerModelsService.MovePart"),
        ScalePart: document.getElementById("mapServerModelsService.ScalePart"),
        RotateModel: document.getElementById("mapServerModelsService.RotateModel"),
        SelectPart: document.getElementById("mapServerModelsService.SelectPart"),
        WeldPart: document.getElementById("mapServerModelsService.WeldModel")
    };
    // Tools For Edit The 'mapServerScriptService'
    let mapServerScriptServiceTools = {
        OpenEditor: document.getElementById("mapServerScriptService.openEditor"),
        Start: document.getElementById("mapServerScriptService.Start"),
        Save: document.getElementById("mapServerScriptService.Save"),
    };
    // The 'mapRenderServices' That Renders The Scene
    let mapRenderServices = {
        Scene: new THREE.Scene(),
        Camera: new THREE.PerspectiveCamera(75, canvas.clientWidth / canvas.clientHeight, 0.1, 1000),
        Renderer: new THREE.WebGLRenderer({ canvas }),
        Raycaster: new THREE.Raycaster(),
        Mouse: new THREE.Vector2(),
        ModelMeshes: new Map()
    };
    let backup;
    let playing = false;
    let scene = mapRenderServices.Scene;
    let camera = mapRenderServices.Camera;
    let renderer = mapRenderServices.Renderer;
    let raycaster = mapRenderServices.Raycaster;
    let mouse = mapRenderServices.Mouse;
    let modelMeshes = mapRenderServices.ModelMeshes;
    let selectedModelIndex = -1;
    let selectMode = AppLib.OperationOfManipule.selectObject;
    let editor;
    let editorLoaded = false;
    const workspace = document.getElementById("workspace");
    let workspaceHierarchy = serverOrLocalServiceEnv.workspaceHierarchy;
    let onMsgWorker;
    let pitch = 0;
    let yaw = 0;
    let isLocked = false;
    let keys = {};
    let rotating = false;
    canvas.addEventListener("contextmenu", (e) => {
        e.preventDefault();
    });
    canvas.addEventListener("mousedown", (e) => {
        if (playing) return;

        if (e.button === 2) {
            rotating = true;
        }
    });
    canvas.addEventListener("mousemove", (e) => {
        if (playing) return;
        if (!rotating) return;

        const sensitivity = 0.005;

        yaw -= e.movementX * sensitivity;
        pitch -= e.movementY * sensitivity;

        const dir = new THREE.Vector3(
            Math.cos(pitch) * Math.sin(yaw),
            Math.sin(pitch),
            Math.cos(pitch) * Math.cos(yaw)
        );

        camera.lookAt(
            camera.position.clone().add(dir)
        );
    });
    document.addEventListener("mouseup", (e) => {
        if (e.button === 2) {
            rotating = false;
        }
    });
    canvas.addEventListener("wheel", (e) => {
        if (playing) return;

        const zoomSpeed = 0.3;

        const forward = new THREE.Vector3();
        camera.getWorldDirection(forward);
        forward.normalize(); // 🔥 importante

        camera.position.addScaledVector(forward, e.deltaY * 0.01 * zoomSpeed);
    });
    // [CLIENT] Lock The Mouse
    canvas.addEventListener("click", () => {
        if (inMovile) return;
        console.log(playing)
        if (!playing) return;
        console.log("a")

        canvas.requestPointerLock().catch(err => {
            console.error("Error al bloquear mouse:", err);
        });
    });
    // [CLIENT] Keys In Mode
    document.addEventListener("keydown", e => keys[e.key.toLowerCase()] = true);
    document.addEventListener("keyup", e => keys[e.key.toLowerCase()] = false);
    // [CLIENT] Move Camera
    document.addEventListener("mousemove", (e) => {
        if (playing) {
            if (!isLocked) return;
            const sensitivity = 0.002;

            yaw -= e.movementX * sensitivity;
            pitch -= e.movementY * sensitivity;

            pitch = Math.max(-Math.PI/2, Math.min(Math.PI/2, pitch));

            camera.rotation.set(pitch, yaw, 0);
        }
    });
    // [WORCKSPACE] Render
    let renderWorkspace = (data, container) => {
        container.innerHTML = "";

        function removeNode(tree, target) {
            for (let i = 0; i < tree.length; i++) {
                if (tree[i] === target) {
                    tree.splice(i, 1);
                    return true;
                }
                if (tree[i].type === "group") {
                    if (removeNode(tree[i].children, target)) {
                        return true;
                    }
                }
            }
            return false;
        }

        function renderNode(node, parent, parentNode) {
            const item = document.createElement("div");
            item.className = "workspace-item";

            const icon = document.createElement("img");

            if (node.type === "group") {
                icon.src = "./Icons/serverOrLocalServiceExplorer/Base3DIcon.svg";
            } 
            else if (node.type == "propiety") {
                icon.src = "./Icons/serverOrLocalServiceExplorer/PropietyAditionalIcon.svg";
            } else {
                icon.src = "./Icons/serverOrLocalServiceExplorer/Part3DIcon.svg";
            }
            const label = document.createElement("span");
            label.textContent = node.name;

            if (node.type === "part") {
                label.onclick = () => {
                    if (selectMode == AppLib.OperationOfManipule.weldObject)
                        serverOrLocalServiceEnv.mapServerModelsService[selectedModelIndex].weldedTo = node.ref;
                    else 
                        selectedModelIndex = node.ref;
                }
            }
            if (node.type == "propiety") {
                item.addEventListener('contextmenu', (e) => {
                    e.preventDefault();
                    e.stopPropagation();

                    const menu = document.createElement("div");
                    menu.style.position = "absolute";
                    menu.style.left = e.clientX + "px";
                    menu.style.top = e.clientY + "px";
                    menu.style.background = "#2d2d2d";
                    menu.style.padding = "5px";
                    menu.style.border = "1px solid #444";
                    menu.style.borderRadius = "6px";

                    if (parentNode.type == "group") {
                        if (node.name == "scenePtr") {
                            const exportSubScene = document.createElement("div"); exportSubScene.textContent = "ExportSubScene";
                            exportSubScene.onclick = () => {
                                const data = JSON.stringify(node.refScene);

                                const blob = new Blob(
                                    [data],
                                    { type: "application/json" }
                                );

                                const url = URL.createObjectURL(blob);

                                const a = document.createElement("a");
                                a.href = url;
                                a.download = "map.json";
                                a.click();

                                URL.revokeObjectURL(url);
                            }
                            menu.appendChild(exportSubScene);
                        }
                    }

                    const changeValue = document.createElement("div"); changeValue.textContent = "ChangeValue";
                    changeValue.onclick = () => {
                        
                        if (parentNode.type == "group") {
                            if (node.name == "scenePtr") {
                                let oldOnChange = serverOrLocalServiceTools.ImportInternal.onchange;

                                serverOrLocalServiceTools.ImportInternal.onchange = async () => {
                                    const file = serverOrLocalServiceTools.ImportInternal.files[0];
                                    if (!file) return;

                                    const text = await file.text();

                                    node.refScene = JSON.parse(text);
                                    serverOrLocalServiceTools.ImportInternal.onchange = oldOnChange;
                                };

                                serverOrLocalServiceTools.ImportInternal.click();

                            }

                            return;
                        }
                        if (node.name in serverOrLocalServiceEnv.mapServerModelsService[parentNode.ref]) {
                            let value = prompt("enter the value: old=" + node.value);
                            let part_to_edit = serverOrLocalServiceEnv.mapServerModelsService[parentNode.ref];
                            let typeofa = typeof part_to_edit[node.name];

                            if (typeofa == "number") part_to_edit[node.name] = Number(value);
                            else if (typeofa == "bigint") part_to_edit[node.name] = BigInt(value);
                            else if (typeofa == "string") part_to_edit[node.name] = String(value);
                            else if (typeofa == "boolean") {
                                let parsed =
                                    value === "true" ? true :
                                    value === "false" ? false :
                                    value;
                                part_to_edit[node.name] = parsed;
                            }
                            else if (typeofa == "object" && part_to_edit[node.name] instanceof Array)
                            {
                                part_to_edit[node.name] = JSON.parse(value);
                            }

                            node.value = value;
                        }
                    };

                    menu.appendChild(changeValue);

                    document.body.appendChild(menu);

                    document.addEventListener("click", () => menu.remove(), { once: true });

                })
            }
            label.ondblclick = () => {
                const input = document.createElement("input");
                input.type = "text";
                input.value = node.name;

                item.replaceChild(input, label);
                input.focus();

                const saveName = () => {
                    node.name = input.value || "Unnamed";
                    renderWorkspace(workspaceHierarchy, workspace);
                };

                input.addEventListener("keydown", (e) => {
                    if (e.key === "Enter") {
                        saveName();
                    }
                });

                input.addEventListener("blur", saveName);
            };
            item.appendChild(icon);
            item.appendChild(label);
            parent.appendChild(item);

            item.draggable = true;

            item.ondragstart = (e) => {
                window.__draggedNode = node;
            };
            item.ondragover = (e) => {
                e.preventDefault();
                e.stopPropagation();
            };

            item.ondragenter = (e) => {
                e.preventDefault();
                e.stopPropagation();

                if (node.type === "group") {
                    item.style.background = "#3a3a3a";
                }
            };

            item.ondragleave = (e) => {
                e.stopPropagation();
                item.style.background = "";
            };

            item.ondrop = (e) => {
                e.preventDefault();
                e.stopPropagation();

                let dragged = window.__draggedNode;

                if (!dragged || dragged === node) return;

                if (node.type === "group") {
                    removeNode(workspaceHierarchy, dragged);
                    node.children.push(dragged);
                }

                if (node.type === "part" && dragged.type === "propiety") {
                    removeNode(workspaceHierarchy, dragged);
                    if (node.children === undefined) node.children = [];
                    node.children.push(dragged);
                }

                item.style.background = "";

                renderWorkspace(workspaceHierarchy, workspace);
            };

            if (node.type === "group" || (node.type == "part" && node.children !== undefined)) {
                const childrenContainer = document.createElement("div");
                childrenContainer.style.marginLeft = "15px";

                parent.appendChild(childrenContainer);

                node.children.forEach(child => {
                    renderNode(child, childrenContainer, node);
                });
            }
        }

        data.forEach(node => renderNode(node, container));
    }
    // [WORCKSPACE] Creates A Group
    let createGroup = (name = "MyGroup") => {
        return {
            type: "group",
            name,
            children: []
        };
    }
    // [WORCKSPACE] Context Menu
    workspace.addEventListener("contextmenu", (e) => {
        e.preventDefault();

        const menu = document.createElement("div");
        menu.style.position = "absolute";
        menu.style.left = e.clientX + "px";
        menu.style.top = e.clientY + "px";
        menu.style.background = "#2d2d2d";
        menu.style.padding = "5px";
        menu.style.border = "1px solid #444";
        menu.style.borderRadius = "6px";

        let modeladd = () => {
            workspaceHierarchy.push({
                type: "part",
                name: "SimpleBlk",
                ref: serverOrLocalServiceEnv.mapServerModelsService.length - 1
            });

            renderWorkspace(workspaceHierarchy, workspace);
        }

        const addRigidPart = document.createElement("div"); addRigidPart.textContent = "New Rigid Part";
        addRigidPart.onclick = () => {
            let ModelAdd = new mapServerModel();
            ModelAdd.basePosition = [camera.position.x,camera.position.y - 2,camera.position.z - 2];
            ModelAdd.color = [0, 1, 0];
            serverOrLocalServiceEnv.mapServerModelsService.push(ModelAdd);

            modeladd();
            menu.remove();
        };

        const addStaticPart = document.createElement("div"); addStaticPart.textContent = "New Static Part";
        addStaticPart.onclick = () => {
            let ModelAdd = new mapServerModel();
            ModelAdd.basePosition = [camera.position.x,camera.position.y - 2,camera.position.z - 2];
            ModelAdd.color = [0, 1, 0];
            ModelAdd.isStatic = true;
            serverOrLocalServiceEnv.mapServerModelsService.push(ModelAdd);

            modeladd();
            menu.remove();
        };

        const addGroup = document.createElement("div");
        addGroup.textContent = "New Group";
        addGroup.onclick = () => {
            workspaceHierarchy.push(createGroup());
            menu.remove();
            renderWorkspace(workspaceHierarchy, workspace);
        };

        const addPropiety = document.createElement("div");
        addPropiety.textContent = "New Propiety";
        addPropiety.onclick = () => {
            workspaceHierarchy.push({
                type: 'propiety',
                name: 'propiety',
                value: 'default'
            });
            menu.remove();
            renderWorkspace(workspaceHierarchy, workspace);
        };

        menu.appendChild(addRigidPart);
        menu.appendChild(addStaticPart);
        menu.appendChild(addGroup);
        menu.appendChild(addPropiety);

        document.body.appendChild(menu);

        document.addEventListener("click", () => menu.remove(), { once: true });

    });
    // [LOCAL] Edits The Code Of 'mapServerScriptService'
    mapServerScriptServiceTools.OpenEditor.onclick = () => {
        if (editorContainer.style.display === "block") {
            editorContainer.style.display = "none";
            canvas.style.display = "flex";
            return;
        }
        canvas.style.display = "none";
        editorContainer.style.display = "block";
        if (editorLoaded) { 
            editor.setValue(serverOrLocalServiceEnv.mapServerScriptService.codeGlobalScript);
            return;
         }
        editorLoaded = true;
        require.config({ paths: { vs: 'https://unpkg.com/monaco-editor@0.45.0/min/vs' }});
        
        require(['vs/editor/editor.main'], async function () {

            monaco.languages.register({ id: 'myAsm' });

            monaco.editor.defineTheme('myTheme', {
                base: 'vs-dark',
                inherit: true,
                rules: [
                    { token: 'keyword', foreground: '#e36e82' },
                    { token: 'keyword.control', foreground: '#C586C0'},
                    { token: 'entity.scene', foreground: '#c0ecd9'},
                    { token: 'entity.scene.prefactory', foreground: '#c0ecd9'},
                    { token: 'entity.scene.factory', foreground: '#c0ecd9'},
                    { token: 'entity.scene.element', foreground: '#c0ecd9'},
                    { token: 'entity.class', foreground: '#c0ecd9'},
                    { token: 'entity.class.lang', foreground: '#c0ecd9'},
                    { token: 'entity.class.user', foreground: '#c0ecd9'},
                    { token: 'entity.class.builtin', foreground: '#87d6bf'},
                    { token: 'entity.variables.user', foreground: '#95c0d4'},
                    { token: 'entity.functions', foreground: '#6de7e3' },
                    { token: 'entity.flat', foreground: '#8886e3' },
                    { token: 'entity.flat.number', foreground: '#8886e3' },
                    { token: 'entity.flat.string', foreground: '#e3b986' },
                    { token: 'comment', foreground: '#608B4E' },
                ],
                colors: {
                    "editor.foreground": "#ffffff",
                    "editor.background": "#1e1e1e"
                }
            });
            
            editor = monaco.editor.create(editorContainer, {
                value: serverOrLocalServiceEnv.mapServerScriptServiceEditor,
                language: 'myAsm',
                theme: 'myTheme',
                automaticLayout: true
            });

            let updateSyntaxHighlight = /** @param {string} code */ (code) => {
                let vars = [...code.matchAll(/\bclass\s+(\w+)/g)].map(v => v[1]);
                vars = [...vars, ...code.matchAll(/\bclassfunc\s+(\w+)/g)].map(v => v[1]);
                let objects = [...code.matchAll(/\bvar\b\s+(\w+)\s+=\s+ServerToInit.virtualWorkspace.importScene\(/g)].map(v => v[1]);
                let objectsInstancied = [...code.matchAll(/\bvar\b\s+(\w+)\s+=\s+ServerToInit.virtualWorkspace.addChild\(/g)].map(v => v[1]);
                let instancies = [];
                if (objects.length > 0) {
                    let matches = [...code.matchAll(
                        new RegExp(`\\bvar\\b\\s+(\\w+)\\s+=\\s+(${objects.join("|")})\\.instantiate\\(`, 'g')
                    )].map(v => v[1]);
                    
                    let unique = [...new Set(matches)];
                    let safeObjects = matches.map(o =>
                        o.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
                    );
                    let objectGroup = `\\b(${safeObjects.join("|")})\\b`;
                    if (matches.length > 0) instancies = [[objectGroup, "entity.scene.factory"]];
                }

                let dynamicRule = [];

                if (objectsInstancied.length > 0) {
                    let dynamicRegex = new RegExp(`\\b(${objectsInstancied.join("|")})\\b`);
                    dynamicRule.push([dynamicRegex, "entity.scene.element"]);
                }

                if (vars.length > 0) {
                    let dynamicRegex = new RegExp(`\\b(${vars.join("|")})\\b`);
                    dynamicRule.push([dynamicRegex, "entity.class.user"]);
                }

                if (objects.length > 0) {
                    let dynamicRegex = new RegExp(`\\b(${objects.join("|")})\\b`);
                    dynamicRule.push([dynamicRegex, "entity.scene.prefactory"]);
                }

                monaco.languages.setMonarchTokensProvider('myAsm', {
                    tokenizer: {
                        root: [
                            [/\/\/.*/, "comment"],
                            [/"[^"]*"/, "entity.flat.string"],
                            [/\b\d+\b/, "entity.flat.number"],
                            [/\b(extends|class|return|classfunc|var|func|if|else)\b/, "keyword"],
                            [/\b(SimpleBlk|Group|Vector3|SerializableObject|Color3|Vector2|ButtonStyles|UiProximation|TextAlign|SimpleRectangle|SimpleTextBlks|SimpleButton)\b/, "entity.class.builtin"],
                            ...dynamicRule,
                            ...instancies,
                            [/\b(Array|InternalDocsStrictEnum|Boolean|String|Math|Object)\b/, "entity.class.lang"],
                            [/\b(print)\b/, "entity.functions"],
                            [/\b\w+\b(?=\()/, "entity.functions"],
                            [/\w+/, "entity.variables.user"]
                        ]
                    }
                });
            }

            editor.onDidChangeModelContent(() => {
                let code = editor.getValue();
                updateSyntaxHighlight(code);
            });

            let code = editor.getValue();
            updateSyntaxHighlight(code);        
        });
    };
    // [LOCAL] Saves The 'serverOrLocalService'
    serverOrLocalServiceTools.Export.onclick = async () => {
        const data = serverOrLocalServiceEnv.exportJson();

        const blob = new Blob(
            [data],
            { type: "application/json" }
        );

        const url = URL.createObjectURL(blob);

        const a = document.createElement("a");
        a.href = url;
        a.download = "map.json";
        a.click();

        URL.revokeObjectURL(url);
    };
    // [LOCAL] Loads A 'serverOrLocalService'
    serverOrLocalServiceTools.Import.onclick = () => {
        serverOrLocalServiceTools.ImportInternal.click();
    };
    // INTERNAL [LOCAL] Loads A 'serverOrLocalService'
    serverOrLocalServiceTools.ImportInternal.onchange = async () => {
        async function importZip(file) {
            const zip = await JSZip.loadAsync(file);

            const sceneJson = await zip.file("scene.json").async("string");
            const modelsJson = await zip.file("models.json").async("string");
            const scriptCode = await zip.file("scripts/main.ns").async("string");

            const finalJson = {
                mapServerModelsService: JSON.parse(modelsJson),
                mapStackGlobalService: [],
                mapSecondaryStackGlobalService: [],
                mapServerScriptVariablesServie: [],
                mapServerScriptService: scriptCode,
                workspaceHierarchy: JSON.parse(sceneJson)
            };

            serverOrLocalServiceEnv.importJson(JSON.stringify(finalJson));

            renderWorkspace(
                serverOrLocalServiceEnv.workspaceHierarchy,
                workspace
            );
        }
        const file = serverOrLocalServiceTools.ImportInternal.files[0];
        if (!file) return;

        if (file.name.endsWith(".zip")) {
            await importZip(file);
        } else {
            const text = await file.text();

            serverOrLocalServiceEnv.importJson(text);
            workspaceHierarchy = serverOrLocalServiceEnv.workspaceHierarchy;
            window.serverOrLocalServiceEnv = serverOrLocalServiceEnv;
            renderWorkspace(workspaceHierarchy, workspace);
        }

    };
    // [SERVER/LOCAL] Start 'mapServerScriptService'
    mapServerScriptServiceTools.Start.onclick = () => {
        alert("for run your map please export your map and load it in the node.js 'serverOrLocalServiceCreator' application")
    };
    // [SERVER/LOCAL] Saves The Editor Code Of The 'mapServerScriptService'
    mapServerScriptServiceTools.Save.onclick = () => {
        let code = editor.getValue();
        serverOrLocalServiceEnv.mapServerScriptService.codeGlobalScript = code;
    };
    // [SERVER/LOCAL] Duplicates A Part To 'mapServerModelsService'
    mapServerModelsServiceTools.DuplicatePart.onclick = () => {
        let modeladd = () => {
            workspaceHierarchy.push({
                type: "part",
                name: "SimpleBlk",
                ref: serverOrLocalServiceEnv.mapServerModelsService.length - 1
            });

            renderWorkspace(workspaceHierarchy, workspace);
        }
        let ModelAdd = new mapServerModel();
        ModelAdd.basePosition = [camera.position.x, camera.position.y - 2, camera.position.z - 2];
        ModelAdd.color = [0, 1, 0];
        serverOrLocalServiceEnv.mapServerModelsService.push(ModelAdd);

        modeladd();

        let part = serverOrLocalServiceEnv.mapServerModelsService.length - 1;
        Object.assign(serverOrLocalServiceEnv.mapServerModelsService[part], serverOrLocalServiceEnv.mapServerModelsService[selectedModelIndex]);
        renderWorkspace(workspaceHierarchy, workspace);
    };
    // [SERVER/LOCAL] Delete A Part To 'mapServerModelsService'
    mapServerModelsServiceTools.DelPart.onclick = () => {
        serverOrLocalServiceEnv.mapServerModelsService.splice(selectedModelIndex, 1);
        renderWorkspace(workspaceHierarchy, workspace);
    };
    // [SERVER/LOCAL] Selects A Part To 'mapServerModelsService'
    mapServerModelsServiceTools.SelectPart.onclick = () => {
        selectMode = AppLib.OperationOfManipule.selectObject;
    };
    // [SERVER/LOCAL] Moves A Part To 'mapServerModelsService'
    mapServerModelsServiceTools.MovePart.onclick = () => {
        selectMode = AppLib.OperationOfManipule.moveObject;
    };
    // [SERVER/LOCAL] Scales A Part To 'mapServerModelsService'
    mapServerModelsServiceTools.ScalePart.onclick = () => {
        selectMode = AppLib.OperationOfManipule.scaleObject;
    };
    // [SERVER/LOCAL] Rotates A Part To 'mapServerModelsService'
    mapServerModelsServiceTools.RotateModel.onclick = () => {
        selectMode = AppLib.OperationOfManipule.rotateObject;
    };
    // [SERVER/LOCAL] Welds A Part To 'mapServerModelsService'
    mapServerModelsServiceTools.WeldPart.onclick = () => {
        selectMode = AppLib.OperationOfManipule.weldObject;
    };
    // [EDITOR/RUNTIME] Mouse Down Event
    canvas.addEventListener("pointerdown", (event) => {
        const rect = canvas.getBoundingClientRect();

        // [RUNTIME] Mouse RayCast
        mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
        mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;
        // Set Camera
        raycaster.setFromCamera(mouse, camera);
        const intersects = raycaster.intersectObjects([...modelMeshes.values()]);
        // If Length Is Greater Than Zero
        if (intersects.length > 0) {
            const mesh = intersects[0].object;
            let indexSelected = serverOrLocalServiceEnv.mapServerModelsService.findIndex(model => modelMeshes.get(model) === mesh);
            // [EDITOR] Selects A Part From 'mapServerModelsService'
            if (selectMode == AppLib.OperationOfManipule.selectObject)
                selectedModelIndex = indexSelected;
            // [EDITOR] Weld Part 'selectedModelIndex' With The Other Part
            if (selectMode == AppLib.OperationOfManipule.weldObject)
                serverOrLocalServiceEnv.mapServerModelsService[selectedModelIndex].weldedTo = indexSelected;
            console.log(selectMode, selectedModelIndex);
        }
        // Else 
        else {
            selectedModelIndex = -1;
        }
    });
    // [EDITOR/RUNTIME] Key Down Event
    document.addEventListener("keydown", (event) => {
        if (editorContainer.style.display === "block") return;
        // [EDITOR] Moves A Part From 'mapServerModelsService'
        if (selectMode == AppLib.OperationOfManipule.moveObject) {
            let moveSteps = 0.1;
            let ModelPosition = serverOrLocalServiceEnv.mapServerModelsService[selectedModelIndex].basePosition;
            // [EDITOR_KEY] Steps Up To Part In Z
            if (event.key.toLowerCase() == "w")
                serverOrLocalServiceEnv.mapServerModelsService.move(selectedModelIndex,ModelPosition[0],ModelPosition[1],ModelPosition[2] - moveSteps);
            // [EDITOR_KEY] Steps Down To Part In Z
            else if (event.key.toLowerCase() == "s")
                serverOrLocalServiceEnv.mapServerModelsService.move(selectedModelIndex,ModelPosition[0],ModelPosition[1],ModelPosition[2] + moveSteps);
            // [EDITOR_KEY] Steps Up To Part In X
            else if (event.key.toLowerCase() == "d")
                serverOrLocalServiceEnv.mapServerModelsService.move(selectedModelIndex,ModelPosition[0] + moveSteps,ModelPosition[1],ModelPosition[2]);
            // [EDITOR_KEY] Steps Down To Part In X
            else if (event.key.toLowerCase() == "a") 
                serverOrLocalServiceEnv.mapServerModelsService.move(selectedModelIndex,ModelPosition[0] - moveSteps,ModelPosition[1],ModelPosition[2]);
            // [EDITOR_KEY] Increments Position Y
            else if (event.key == " ")
                serverOrLocalServiceEnv.mapServerModelsService.move(selectedModelIndex,ModelPosition[0],ModelPosition[1] + moveSteps,ModelPosition[2]);
            // [EDITOR_KEY] Decrements Position Y
            else if (event.key === "Shift")
                    serverOrLocalServiceEnv.mapServerModelsService.move(selectedModelIndex,ModelPosition[0],ModelPosition[1] - moveSteps,ModelPosition[2]);
        }
        // [EDITOR] Sizes A Part From 'mapServerModelsService'
        if (selectMode == AppLib.OperationOfManipule.scaleObject) {
            let moveSteps = 0.1;
            let ModelPosition = serverOrLocalServiceEnv.mapServerModelsService[selectedModelIndex].baseSize;
            // [EDITOR_KEY] Steps Up To Part In Z
            if (event.key.toLowerCase() == "w")
                serverOrLocalServiceEnv.mapServerModelsService.scale(selectedModelIndex,ModelPosition[0],ModelPosition[1],ModelPosition[2] - moveSteps);
            // [EDITOR_KEY] Steps Down To Part In Z
            else if (event.key.toLowerCase() == "s")
                serverOrLocalServiceEnv.mapServerModelsService.scale(selectedModelIndex,ModelPosition[0],ModelPosition[1],ModelPosition[2] + moveSteps);
            // [EDITOR_KEY] Steps Up To Part In X
            else if (event.key.toLowerCase() == "d")
                serverOrLocalServiceEnv.mapServerModelsService.scale(selectedModelIndex,ModelPosition[0] + moveSteps,ModelPosition[1],ModelPosition[2]);
            // [EDITOR_KEY] Steps Down To Part In X
            else if (event.key.toLowerCase() == "a") 
                serverOrLocalServiceEnv.mapServerModelsService.scale(selectedModelIndex,ModelPosition[0] - moveSteps,ModelPosition[1],ModelPosition[2]);
            // [EDITOR_KEY] Increments Position Y
            else if (event.key == " ")
                serverOrLocalServiceEnv.mapServerModelsService.scale(selectedModelIndex,ModelPosition[0],ModelPosition[1] + moveSteps,ModelPosition[2]);
            // [EDITOR_KEY] Decrements Position Y
            else if (event.key === "Shift")
                    serverOrLocalServiceEnv.mapServerModelsService.scale(selectedModelIndex,ModelPosition[0],ModelPosition[1] - moveSteps,ModelPosition[2]);
        }
        // [EDITOR] Move Camera From 'mapServerModelsService'
        else if (selectMode == AppLib.OperationOfManipule.selectObject) {
            let moveSteps = 0.1;
            // [EDITOR_KEY] Steps Up To Part In Z
            if (event.key.toLowerCase() == "w")
                camera.position.z -= moveSteps;
            // [EDITOR_KEY] Steps Down To Part In Z
            else if (event.key.toLowerCase() == "s")
                camera.position.z += moveSteps;
            // [EDITOR_KEY] Steps Up To Part In X
            else if (event.key.toLowerCase() == "d")
                camera.position.x += moveSteps;
            // [EDITOR_KEY] Steps Down To Part In X
            else if (event.key.toLowerCase() == "a") 
                camera.position.x -= moveSteps;
            // [EDITOR_KEY] Increments Position Y
            else if (event.key == " ")
                camera.position.y += moveSteps;
            // [EDITOR_KEY] Decrements Position Y
            else if (event.key === "Shift")
                camera.position.y -= moveSteps;
        }
    });
    let syncSceneWithModels = (models, scene) => {
        models.forEach(model => {
            if (!modelMeshes.has(model)) {
                const geometry = new THREE.BoxGeometry(1,1,1);
                const material = new THREE.MeshStandardMaterial({
                    color: new THREE.Color(...model.color)
                });
                const mesh = new THREE.Mesh(geometry, material);
                mesh.position.set(...model.basePosition);
                mesh.rotation.set(...model.baseRotation);

                modelMeshes.set(model, mesh);
                scene.add(mesh);
            }
        });

        for (let [model, mesh] of modelMeshes) {
            if (!models.includes(model)) {
                scene.remove(mesh);
                mesh.geometry.dispose();
                mesh.material.dispose();
                modelMeshes.delete(model);
            }
        }

        models.forEach(model => {
            const mesh = modelMeshes.get(model);
            if (!mesh) return;

            mesh.position.set(...model.basePosition);
            mesh.scale.set(...model.baseSize);
            mesh.rotation.set(...model.baseRotation);
            mesh.material.color.setRGB(...model.color);
        });
    }
    const loader = new THREE.CubeTextureLoader();
    const skybox = loader.load([
        "sky/px.png",
        "sky/px.png",
        "sky/skyup.png",
        "sky/skydown.png",
        "sky/px.png",
        "sky/px.png"
    ]);

    scene.background = skybox;
    renderer.setSize(canvas.clientWidth, canvas.clientHeight);
    const light = new THREE.DirectionalLight(0xffffff, 1);
    light.position.set(5, 10, 5);
    scene.add(light);
    const light2 = new THREE.DirectionalLight(0xffffff, 1);
    light2.position.set(-5, -10, -5);
    scene.add(light2);
    let createMeshesForModels = (models, scene) => {
        models.forEach(model => {
            const geometry = new THREE.BoxGeometry(...model.baseSize);
            const material = new THREE.MeshStandardMaterial({ color: 0x00ff00 });
            const mesh = new THREE.Mesh(geometry, material);

            mesh.position.set(...model.basePosition);
            mesh.rotation.set(...model.baseRotation);

            model._mesh = mesh;

            scene.add(mesh);
        });
    }
    const gridHelper = new THREE.GridHelper(100, 50);
    scene.add(gridHelper);
    createMeshesForModels(serverOrLocalServiceEnv.mapServerModelsService, scene);
    function animate() {
        requestAnimationFrame(animate);
        if (playing) {
        }
        resizeRenderer();
        syncSceneWithModels(serverOrLocalServiceEnv.mapServerModelsService, scene);

        renderer.render(scene, camera);
    }
    function resizeRenderer() {
        const rect = canvas.getBoundingClientRect();

        const width = rect.width;
        const height = rect.height;

        renderer.setSize(width, height, false);

        camera.aspect = width / height;
        camera.updateProjectionMatrix();
    }
    window.serverOrLocalServiceEnv = serverOrLocalServiceEnv;
    animate();
}