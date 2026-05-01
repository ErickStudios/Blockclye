/** [GLOBAL] Global Importations */
import { AppLib } from "./lib/app.js"
import * as THREE from "./three.js";
import { serverOrLocalService, mapServerModel } from "./core/serverOrLocalService.js"
/** @type {typeof import('monaco-editor')} */
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
    function updateDeletation(deletedId, elementsToDelete = 1, serverToUpdate = serverOrLocalServiceEnv) {
        if (!serverToUpdate.workspaceHierarchy) return;

        let workspaceReader = (parent) => {
            for (let i = parent.length - 1; i >= 0; i--) {
                let node = parent[i];

                if (node.type == 'part' && 'ref' in node) {

                    if (node.ref === deletedId) {
                        parent.splice(i, 1);
                        continue;
                    }

                    if (node.ref > deletedId) {
                        node.ref -= elementsToDelete;
                    }

                } else if (node.type == 'area' && 'area' in node) {

                    if (node.area === deletedId) {
                        parent.splice(i, 1);
                        continue;
                    }

                    if (node.area > deletedId) {
                        node.area -= elementsToDelete;
                    }

                } else if (node.type == 'group') {
                    workspaceReader(node.children);
                }
            }
        };

        workspaceReader(serverToUpdate.workspaceHierarchy);

        serverToUpdate.mapServerModelsService.forEach((v) => {
            if (v.weldedTo === deletedId) {
                v.weldedTo = null;
            } else if (v.weldedTo > deletedId) {
                v.weldedTo -= elementsToDelete;
            }
        });
    }
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
    let isAnArea = (blkId) => {
        let checkNode = (node) => {
            if (node.type == 'area' && node.area == blkId) return true;
            return false;
        }
        let recursive = (nodep) => {
            for (const v of nodep) {
                if (v.type == 'group') {
                     let ab = recursive(v.children);
                     if (ab) return ab;
                }
                else { 
                    let ab = checkNode(v);
                    if (ab) return ab; 
                }
            }
            return false;
        }
        return recursive(serverOrLocalServiceEnv.workspaceHierarchy);
    }
    let isAnLigth = (blkId) => {
        let checkNode = (node) => {
            if (node.type == 'ligth' && node.ligth == blkId) return true;
            return false;
        }
        let recursive = (nodep) => {
            for (const v of nodep) {
                if (v.type == 'group') {
                     let ab = recursive(v.children);
                     if (ab) return ab;
                }
                else { 
                    let ab = checkNode(v);
                    if (ab) return ab; 
                }
            }
            return false;
        }
        return recursive(serverOrLocalServiceEnv.workspaceHierarchy);
    }
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
            }
            else if (node.type == 'area') {
                icon.src = "./Icons/serverOrLocalServiceExplorer/Area3DIcon.svg";
            } 
            else {
                if (node.type == "part" && serverOrLocalServiceEnv.mapServerModelsService[node.ref].isStatic) 
                    icon.src = "./Icons/serverOrLocalServiceExplorer/StaticPart3DIcon.svg";
                else 
                    icon.src = "./Icons/serverOrLocalServiceExplorer/Part3DIcon.svg";
            }
            const label = document.createElement("span");
            label.textContent = node.name;

            if (node.type === "part") {
                
                item.onclick = () => {
                    if (selectMode == AppLib.OperationOfManipule.weldObject)
                        serverOrLocalServiceEnv.mapServerModelsService[selectedModelIndex].weldedTo = node.ref;
                    else 
                        selectedModelIndex = node.ref;
                }
            }
            if (node.type == 'area') {
                item.onclick = () => {
                    if (selectMode == AppLib.OperationOfManipule.weldObject)
                        serverOrLocalServiceEnv.mapServerModelsService[selectedModelIndex].weldedTo = node.area;
                    else 
                        selectedModelIndex = node.area;
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
                    function showInput(defaultValue, callback) {
                        const input = document.createElement("input");
                        input.value = defaultValue;

                        input.style.position = "fixed";
                        input.style.top = "50%";
                        input.style.left = "50%";
                        input.style.transform = "translate(-50%, -50%)";
                        input.style.zIndex = 9999;

                        document.body.appendChild(input);
                        input.focus();

                        input.addEventListener("keydown", (e) => {
                            if (e.key === "Enter") {
                                callback(input.value);
                                input.remove();
                            }
                        });
                    }
                    changeValue.onclick = (e) => {
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
                        let prt = (serverOrLocalServiceEnv.mapServerModelsService[parentNode.ref] || serverOrLocalServiceEnv.mapServerModelsService[parentNode.ligth]);
                        if (node.name in prt) {
                            showInput(node.value, (value) => {
                            let part_to_edit = prt;
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
                            });
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

                if ((node.type === "part" || node.type === 'ligth') && dragged.type === "propiety") {
                    removeNode(workspaceHierarchy, dragged);
                    if (node.children === undefined) node.children = [];
                    node.children.push(dragged);
                }

                item.style.background = "";

                renderWorkspace(workspaceHierarchy, workspace);
            };

            if (node.type === "group" || ((node.type == "part" || node.type == "ligth") && node.children !== undefined)) {
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

        const newMenu = document.createElement("div");
        
        let creatingThing = (name, icon, click) => {
            const addRigidPart = document.createElement("div"); 
            addRigidPart.style.display = 'flex';
            let icona = document.createElement("img");
            icona.src = icon;
            icona.width = 20;
            icona.height = 20;
            addRigidPart.appendChild(icona);
            let text = document.createElement("p");
            text.textContent = name;
            addRigidPart.appendChild(text);
            addRigidPart.onclick = () => click();
            return addRigidPart
        }

        const addRigidPart = creatingThing("RigidPart", "./Icons/serverOrLocalServiceExplorer/Part3DIcon.svg", () => {
            let ModelAdd = new mapServerModel();
            ModelAdd.basePosition = [camera.position.x,camera.position.y - 2,camera.position.z - 2];
            ModelAdd.color = [0, 1, 0];
            serverOrLocalServiceEnv.mapServerModelsService.push(ModelAdd);

            modeladd();
            menu.remove();
        })

        const addStaticPart = creatingThing("StaticPart", "./Icons/serverOrLocalServiceExplorer/StaticPart3DIcon.svg", () => {
            let ModelAdd = new mapServerModel();
            ModelAdd.basePosition = [camera.position.x,camera.position.y - 2,camera.position.z - 2];
            ModelAdd.color = [0, 1, 0];
            ModelAdd.isStatic = true;
            serverOrLocalServiceEnv.mapServerModelsService.push(ModelAdd);

            modeladd();
            menu.remove();
        })

        const addGroup = creatingThing("Group", "./Icons/serverOrLocalServiceExplorer/Base3DIcon.svg", () => {
            workspaceHierarchy.push(createGroup());
            menu.remove();
            renderWorkspace(workspaceHierarchy, workspace);
        })

        const addPropiety = creatingThing("Propiety", "./Icons/serverOrLocalServiceExplorer/PropietyAditionalIcon.svg", () => {
            workspaceHierarchy.push({
                type: 'propiety',
                name: 'Propiety',
                value: 'default'
            });
            menu.remove();
            renderWorkspace(workspaceHierarchy, workspace);
        })

        const addArea3D = creatingThing("Area3D", "./Icons/serverOrLocalServiceExplorer/Area3DIcon.svg", () => {
            workspaceHierarchy.push({
                type: 'area',
                name: 'Area3D',
                area: serverOrLocalServiceEnv.mapServerModelsService.length
            });
            let ModelAdd = new mapServerModel();
            ModelAdd.basePosition = [camera.position.x,camera.position.y - 2,camera.position.z - 2];
            ModelAdd.color = [0, 1, 0];
            ModelAdd.isStatic = true;
            serverOrLocalServiceEnv.mapServerModelsService.push(ModelAdd);

            menu.remove();
            renderWorkspace(workspaceHierarchy, workspace);
        })

        const addLigth = creatingThing("Ligth3D", "./Icons/serverOrLocalServiceExplorer/Part3DIcon.svg", () => {
            workspaceHierarchy.push({
                type: 'ligth',
                name: 'Ligth3D',
                ligth: serverOrLocalServiceEnv.mapServerModelsService.length
            });
            let ModelAdd = new mapServerModel();
            ModelAdd.basePosition = [camera.position.x,camera.position.y - 2,camera.position.z - 2];
            ModelAdd.color = [0, 1, 0];
            ModelAdd.isStatic = true;
            serverOrLocalServiceEnv.mapServerModelsService.push(ModelAdd);

            menu.remove();
            renderWorkspace(workspaceHierarchy, workspace);
        })


        newMenu.appendChild(addGroup);
        newMenu.appendChild(addStaticPart);
        newMenu.appendChild(addArea3D);
        newMenu.appendChild(addRigidPart);
        newMenu.appendChild(addPropiety);
        newMenu.appendChild(addLigth);

        menu.appendChild(newMenu);

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

            let updateSyntaxHighlight = (code, ona=false) => {
                let vars = [
                    ...[...code.matchAll(/\bclass\s+(\w+)/g)].map(v => v[1]),
                    ...[...code.matchAll(/\bclassfunc\s+(\w+)/g)].map(v => v[1]),
                    ...[...code.matchAll(/\binterface\s+(\w+)/g)].map(v => v[1])
                ];
                let interfaces = [...code.matchAll(/\binterface\s+(\w+)/g)].map(v => v[1]);
                let classesfuncs = [...code.matchAll(/\bclassfunc\s+(\w+)/g)].map(v => v[1]);

                console.log(vars)
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
                    if (matches.length > 0) instancies = [[new RegExp(objectGroup), "entity.scene.factory"]];
                }

                let dynamicRule = [];

                if (objectsInstancied.length > 0) {
                    let dynamicRegex = new RegExp(`\\b(${objectsInstancied.join("|")})\\b`);
                    dynamicRule.push([dynamicRegex, "entity.scene.element"]);
                }

                if (vars.length > 0) {
                    let safeVars = vars.map(v => v.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'));
                    let dynamicRegex = new RegExp(`\\b(${safeVars.join("|")})\\b`);
                    dynamicRule.push([dynamicRegex, "entity.class.user"]);
                }

                if (objects.length > 0) {
                    let dynamicRegex = new RegExp(`\\b(${objects.join("|")})\\b`);
                    dynamicRule.push([dynamicRegex, "entity.scene.prefactory"]);
                }

                if (ona) return {
                    objects,
                    vars,
                    objectsInstancied,
                    interfaces,
                    classesfuncs
                }
                
                monaco.languages.setMonarchTokensProvider('myAsm', {
                    tokenizer: {
                        root: [
                            [/\/\/.*/, "comment"],
                            [/"[^"]*"/, "entity.flat.string"],
                            [/\b\d+\b/, "entity.flat.number"],
                            [/\b(extends|class|interface|return|classfunc|var|func|if|else)\b/, "keyword"],
                            [/\b(SimpleBlk|RigidPart|StaticPart|Group|Vector3|SerializableObject|Color3|Vector2|ButtonStyles|UiProximation|TextAlign|SimpleRectangle|SimpleTextBlks|SimpleButton)\b/, "entity.class.builtin"],
                            ...dynamicRule,
                            ...instancies,
                            [/\b(Array|InternalDocsStrictEnum|Boolean|boolean|String|string|Number|number|Math|Object)\b/, "entity.class.lang"],
                            [/\b(print)\b/, "entity.functions"],
                            [/\b\w+\b(?=\()/, "entity.functions"],
                            [/\w+/, "entity.variables.user"],
                            [/./, "entity.variables.user"]
                        ]
                    }
                });
            }

            monaco.languages.registerCompletionItemProvider('myAsm', {
                provideCompletionItems: function(model, position) {

                    let fastMake = (l, d, dep=false) => {
                        return {
                                label: {
                                    label: l,
                                    description: d
                                },kind: monaco.languages.CompletionItemKind.Snippet,
                                insertText: [l].join('\n'),
                                insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
                                documentation: '',
                                tags: dep ? [monaco.languages.CompletionItemTag.Deprecated] : []
                            }
                    }

                    return {
                        suggestions: [
                            fastMake('Vector2', 'vector'),
                            fastMake('Vector3', 'vector'),
                            //fastMake('Area', 'area'),
                            //fastMake('StaticArea', 'area'),
                            //fastMake('RigidArea', 'area'),
                            fastMake('SimpleBlk', 'sblk',true),
                            fastMake('RigidPart', 'rpart'),
                            fastMake('StaticPart', 'spart'),
                            fastMake('number', 'type'),
                            fastMake('string', 'type'),
                            fastMake('boolean', 'type'),
                            fastMake('Number', 'type', true),
                            fastMake('String', 'type', true),
                            fastMake('Boolean', 'type', true),
                            ...(updateSyntaxHighlight(editor.getValue(), true).objects.map(v => fastMake(v, "struct"))),
                            ...(updateSyntaxHighlight(editor.getValue(), true).objectsInstancied.map(v => fastMake(v, "struct"))),
                            ...(updateSyntaxHighlight(editor.getValue(), true).interfaces.map(v => fastMake(v, "type"))),
                            ...(updateSyntaxHighlight(editor.getValue(), true).classesfuncs.map(v => fastMake(v, "struct"))),
                        ]
                    };
                }
            });

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
        alert("for run your map please export your map and load it in node.js with the script 'serverOrLocalServiceCreator.js' and after of name of the script put the path to your map saved and open the clientService.html and put the server url (localhost or http) and click on 'Connect'")
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
        console.log(part)
        Object.assign(serverOrLocalServiceEnv.mapServerModelsService[part], serverOrLocalServiceEnv.mapServerModelsService[selectedModelIndex]);
        renderWorkspace(workspaceHierarchy, workspace);
    };
    // [SERVER/LOCAL] Delete A Part To 'mapServerModelsService'
    mapServerModelsServiceTools.DelPart.onclick = () => {
        updateDeletation(selectedModelIndex);
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
        models.forEach((model, id) => {
            if (!modelMeshes.has(model)) {
                const geometry = new THREE.BoxGeometry(1,1,1);
                let anArea3dornot = isAnArea(id);
                let anLigth3dornot = isAnLigth(id);
                const material = new THREE.MeshStandardMaterial({
                    color: (anArea3dornot ? new THREE.Color(0,0.5,1) : new THREE.Color(...model.color)),
                    transparent: anArea3dornot || anLigth3dornot,
                    opacity: ((anArea3dornot || anLigth3dornot) ? 0.25 : 1)
                });
                if (anLigth3dornot) {
                    let sizeJoined = model.baseSize[0] + model.baseSize[1] + model.baseSize[2];
                    sizeJoined = sizeJoined / 3;
                    sizeJoined = Math.round(sizeJoined * 10) / 10;
                    sizeJoined *= 3;
                    model._light = new THREE.PointLight(new THREE.Color(...model.color), 10, sizeJoined);
                    model._light.position.set(...model.basePosition);
                    scene.add(model._light);
                    const texture = new THREE.TextureLoader().load("Icons/serverOrLocalServiceExplorer/Ligth3DIcon.svg");
                    const material = new THREE.SpriteMaterial({
                        map: texture
                    });
                    const _sprite = new THREE.Sprite(material);

                    _sprite.position.set(...model.basePosition);
                    _sprite.scale.set(1, 1, 1);

                    scene.add(_sprite);
                    model._sprite = _sprite;
                }
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

        models.forEach((model, id) => {
            const mesh = modelMeshes.get(model);
            if (!mesh) return;

            if (model._light) {
                model._light.position.set(...model.basePosition);
                model._light.color.set(new THREE.Color(...model.color));
            }

            if (model._sprite) {
                model._sprite.position.set(...model.basePosition);
            }

            let anArea3dornot = isAnArea(id);

            mesh.position.set(...model.basePosition);
            mesh.scale.set(...model.baseSize);
            mesh.rotation.set(...model.baseRotation);
            if (!anArea3dornot) mesh.material.color.setRGB(...model.color);
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
        if (selectedModelIndex !== -1) {
            let model = serverOrLocalServiceEnv.mapServerModelsService[selectedModelIndex];
            let pos = model.basePosition;
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