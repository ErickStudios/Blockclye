export function tokenize(code) {
    const tokens = [];
    let i = 0;

    const isLetter = c => /[a-zA-Z_]/.test(c);
    const isNumber = c => /[0-9]/.test(c);

    while (i < code.length) {
        let c = code[i];

        if (/\s/.test(c)) {
            i++;
            continue;
        }

        if (c === "/" && code[i + 1] === "/") {
            while (i < code.length && code[i] !== "\n") {
                i++;
            }
            continue;
        }

        if (c === '"' || c === "'") {
            let quoteType = c;
            let value = "";
            i++;
            while (i < code.length && code[i] !== quoteType) {
                value += code[i++];
            }
            i++;
            tokens.push({ type: "string", value });
            continue;
        }

        if (isLetter(c)) {
            let value = "";
            while (i < code.length && (isLetter(code[i]) || isNumber(code[i]))) {
                value += code[i++];
            }
            tokens.push({ type: "identifier", value });
            continue;
        }

        if (isNumber(c)) {
            let value = "";
            while (i < code.length && isNumber(code[i])) {
                value += code[i++];
            }
            tokens.push({ type: "number", value: Number(value) });
            continue;
        }

        tokens.push({ type: "symbol", value: c });
        i++;
    }

    return tokens;
}

/** @param {{type: string;value: any;}[]} tokens  */
export function parse(tokens) {
    let i = 0;

    function peek() {
        return tokens[i];
    }

    function consume() {
        return tokens[i++];
    }

    function expect(value) {
        let t = consume();
        if (!t || t.value !== value) {
            throw new Error("Expected " + value);
        }
    }
    function parseFunction() {
        consume(); // function

        let name = consume().value;

        expect("(");

        let params = [];

        while (peek() && peek().value !== ")") {
            params.push(consume().value);
            if (peek()?.value === ",") consume();
        }

        expect(")");
        expect("{");

        let body = [];

        while (peek() && peek().value !== "}") {
            let stmt = parseStatement();
            if (stmt) body.push(stmt);
        }

        expect("}");

        return {
            type: "FunctionDecl",
            name,
            params,
            body
        };
    }
    function parseExpression() {
        let node;

        let token = consume();

        if (token.type === "number") {
            node = { type: "Number", value: token.value };
        }

        if (token.type === "identifier") {
            node = { type: "Identifier", name: token.value };
        }

        if (token.type === "string") {
            node = { type: "String", value: token.value };
        }

        while (peek() && peek().value === ".") {
            consume();

            let prop = consume();

            node = {
                type: "Member",
                object: node,
                property: prop.value
            };
        }

        if (peek()?.value === "(") {
            consume();

            let args = [];

            while (peek() && peek().value !== ")") {
                args.push(parseExpression());
                if (peek()?.value === ",") consume();
            }

            expect(")");

            return {
                type: "Call",
                callee: node,
                args
            };
        }

        return node;
    }

    function parseVar() {
        consume(); // var

        let name = consume().value;

        expect("=");

        let value = parseExpression();

        expect(";");

        return {
            type: "VarDecl",
            name,
            value
        };
    }

    function parseClass() {
        consume();
        let name = consume().value;

        expect("{");

        let body = [];

        while (peek() && peek().value !== "}") {
            body.push(parseStatement());
        }

        expect("}");

        return {
            type: "Class",
            name,
            body
        };
    }

    function parseStatement() {
        let t = peek();

        if (t.value === "var") return parseVar();

        if (t.value === "func") return parseFunction();

        if (t.type === "identifier") {
            let expr = parseExpression();
            expect(";");

            return {
                type: "ExprStmt",
                expr
            };
        }

        consume();
    }

    let ast = [];

    while (i < tokens.length) {
        let t = peek();

        if (t.value === "class") {
            ast.push(parseClass());
        } else {
            ast.push(parseStatement());
        }
    }

    return ast;
}

export async function run(ast, globalSymbolsP, makeOne=false) {
    let scope = {};
    let globalSymbols = globalSymbolsP;

    if (makeOne) {
        return {evalExpr, recursiveInterprete};
    }

    async function evalExpr(node, currentScope = scope) {
        if (node.type === "Number") return node.value;

        if (node.type === "Identifier") {
            return currentScope[node.name] || globalSymbols[node.name];
        }

        if (node.type === "Member") {
            const obj = await evalExpr(node.object, currentScope);
            if (obj.type === "obj") {
                return obj.object[node.property];
            }
            return obj[node.property];
        }

        if (node.type === "String") return node.value;

        if (node.type === "Call") {
            let callee = await evalExpr(node.callee, currentScope);
            let args = [];
            for (let arg of node.args) {
                args.push(await evalExpr(arg, currentScope));
            }

            if (callee.type === 'userFunc') {
                let localScope = {};

                // asignar parámetros
                for (let i = 0; i < callee.params.length; i++) {
                    localScope[callee.params[i]] = args[i];
                }

                // ejecutar cuerpo
                recursiveInterprete(callee.body, localScope);

                return null;
            }

            if (callee.func) {
                return await callee.func(args); // <-- await para async func
            }

            if (typeof callee === "function") {
                return callee(...args);
            }

            console.error("No es función:", callee);
        }
    }

    async function recursiveInterprete(body, scope=scope, globalSymbolsX=globalSymbols) {
        globalSymbols=globalSymbolsX;

        for (let stmt of body) {
            if (stmt.type === "ExprStmt") await evalExpr(stmt.expr, scope);

            if (stmt.type === "FunctionDecl") {
                scope[stmt.name] = {
                    type: "userFunc",
                    params: stmt.params,
                    body: stmt.body
                };
            }

            if (stmt.type === "Class") {
                let classObj = {};
                scope[stmt.name] = {
                    type: "obj",
                    object: classObj
                };
                await recursiveInterprete(stmt.body, classObj);
                globalSymbols[stmt.name] = scope[stmt.name];
            }

            if (stmt.type === "VarDecl") {
                scope[stmt.name] = await evalExpr(stmt.value, scope);
            }
        }
    }

    await recursiveInterprete(ast, scope);

    return scope;
}

export function exportLibrary(isGlobal=false) {
    let globalSymbols = {};
    globalSymbols.Vector3 = {
        type: 'func', func: (params) => ({
            type: 'array',
            items: params
        }), hasStatics: true, statics: {
            'ZERO': () => [0, 0, 0],
            'ONE': () => [1, 1, 1]
        }
    };
    globalSymbols.Color3 = globalSymbols.Vector3;
    globalSymbols.SimpleBlk = {
        type: 'func', func: (params) => {
            let model = new mapServerModel();
            model.basePosition = params[0].items;
            model.baseSize = params[1].items;
            model.baseRotation = params[2].items;
            model.color = params[3].items;

            return {
                type: 'obj',
                object: {
                    internalObjectModel: model,
                }
            }
        }, hasStatics: false
    };
    globalSymbols.print = {
        type: 'func', func: (params) => {
            console.log(...params)
        }
    };
    globalSymbols.addChild = {
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
    globalSymbols.SerializableObject = {
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
                            pos: { type: 'obj', object: { arrayInternal: [0, 0, 0] } },
                            size: { type: 'obj', object: { arrayInternal: [0, 0, 0] } },
                            rotation: { type: 'obj', object: { arrayInternal: [0, 0, 0] } }
                        }
                    };

                    if (isMainThread) {
                        let retval = globalThis.serverOrLocalServiceEnv.mapServerModelsService[objectSerialized.object.id.value];

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
    globalSymbols.Math = {type: "obj", object: {
            add: { type: 'func', func: (params) => params[0] + params[1] },
            sub: { type: 'func', func: (params) => params[0] - params[1] },
            div: { type: 'func', func: (params) => params[0] / params[1] },
            mul: { type: 'func', func: (params) => params[0] * params[1] },
        }
    };
    
    return globalSymbols;
}