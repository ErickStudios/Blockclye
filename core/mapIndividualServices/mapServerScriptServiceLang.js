// ClaicyScriptCompiled/ClaicyScript.js
var ReturnException = class {
  constructor(value) {
    this.value = value;
  }
};
var CSTypeChecker;
(function(CSTypeChecker2) {
  function isCSArray(value) {
    return typeof value === "object" && value !== null && value.type === "array";
  }
  CSTypeChecker2.isCSArray = isCSArray;
  function isCSObject(value) {
    return typeof value === "object" && value !== null && "type" in value && value.type === "obj" && "object" in value;
  }
  CSTypeChecker2.isCSObject = isCSObject;
  function isCSInterface(value) {
    return typeof value === "object" && value !== null && "type" in value && value.type === "interface" && "props" in value && typeof value.props === "object";
  }
  CSTypeChecker2.isCSInterface = isCSInterface;
  function isCSFunction(value) {
    return typeof value === "object" && value !== null && "type" in value && value.type === "func" && "func" in value;
  }
  CSTypeChecker2.isCSFunction = isCSFunction;
})(CSTypeChecker || (CSTypeChecker = {}));
function interfaceError(name, msg) {
  return `at \x1B[38;5;161minterface\x1B[0m \x1B[38;5;194m${name}\x1B[0m: ${msg}`;
}
function interfaceRep(name, msg = "") {
  return `\x1B[38;5;161minterface\x1B[0m \x1B[38;5;194m${name}\x1B[0m${msg}`;
}
function createEnum(name, allowedValues) {
  return {
    type: "func",
    func: (params) => {
      const value = params[0];
      if (!allowedValues.includes(value)) {
        throw new TypeError(`at \x1B[38;5;161minterface\x1B[0m \x1B[38;5;194m${name}\x1B[0m \x1B[38;5;161mextends\x1B[0m \x1B[38;5;194mInternalDocsStrictEnum\x1B[0m: '${value}' is not valid in this \x1B[38;5;194mInternalDocsStrictEnum\x1B[0m`);
      }
      return value;
    }
  };
}
function errorAtCls(name, msg, before = "") {
  return `at \x1B[38;5;161mclass\x1B[0m \x1B[38;5;194m${name}\x1B[0m: (${before}${msg})`;
}
function tokenize(code) {
  const tokens = [];
  let i = 0;
  const isLetter = (c) => /[a-zA-Z_]/.test(c);
  const isNumber = (c) => /[0-9]/.test(c);
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
function parse(tokens) {
  let i = 0;
  function peek() {
    return tokens[i];
  }
  function consume() {
    return tokens[i++];
  }
  function parseReturn() {
    consume();
    let value = null;
    if (peek()?.value !== ";") {
      value = parseExpression();
    }
    expect(";");
    return {
      type: "Return",
      value
    };
  }
  function expect(value) {
    let t = consume();
    if (!t || t.value !== value) {
      throw new Error("Expected " + value);
    }
  }
  function parseFunction() {
    consume();
    let name = consume().value;
    expect("(");
    let params = [];
    while (peek() && peek().value !== ")") {
      params.push(consume().value);
      if (peek()?.value === ",")
        consume();
    }
    expect(")");
    expect("{");
    let body = [];
    while (peek() && peek().value !== "}") {
      let stmt = parseStatement();
      if (stmt)
        body.push(stmt);
    }
    expect("}");
    return {
      type: "FunctionDecl",
      name,
      params,
      body
    };
  }
  function parseClsFunction() {
    consume();
    let expectatives = [];
    let name = consume().value;
    expect("(");
    let params = [];
    while (peek() && peek().value !== ")") {
      params.push(consume().value);
      if (peek()?.value === ",")
        consume();
    }
    expect(")");
    if (peek() && peek().value === "extends") {
      consume();
      if (peek() && peek().value === "(") {
        consume();
        while (peek() && peek().value !== ")") {
          expectatives.push(consume().value);
          if (peek()?.value === ",")
            consume();
        }
        consume();
      } else {
        expectatives.push(consume().value);
      }
    }
    expect("{");
    let body = [];
    while (peek() && peek().value !== "}") {
      let stmt = parseStatement();
      if (stmt)
        body.push(stmt);
    }
    expect("}");
    return {
      type: "FunctionDecl",
      name,
      params,
      body,
      expectatives
    };
  }
  function parseExpression() {
    let left = parsePrimary();
    while (peek() && ["==", ">", "<"].includes(peek().value)) {
      let op = consume().value;
      let right = parsePrimary();
      left = {
        type: "BinaryOp",
        operator: op,
        left,
        right
      };
    }
    return left;
  }
  function parseIf() {
    consume();
    expect("(");
    let condition = parseExpression();
    expect(")");
    expect("{");
    let body = [];
    while (peek() && peek().value !== "}") {
      body.push(parseStatement());
    }
    expect("}");
    let elseBody = null;
    if (peek()?.value === "else") {
      consume();
      expect("{");
      elseBody = [];
      while (peek() && peek().value !== "}") {
        elseBody.push(parseStatement());
      }
      expect("}");
    }
    return {
      type: "If",
      condition,
      body,
      elseBody
    };
  }
  function parsePrimary() {
    let token = consume();
    let node;
    if (token.type === "number") {
      node = { type: "Number", value: token.value };
    }
    if (token.type === "identifier" && token.value === "func") {
      expect("(");
      let params = [];
      while (peek() && peek().value !== ")") {
        params.push(consume().value);
        if (peek()?.value === ",")
          consume();
      }
      expect(")");
      expect("{");
      let body = [];
      while (peek() && peek().value !== "}") {
        let stmt = parseStatement();
        if (stmt)
          body.push(stmt);
      }
      expect("}");
      return {
        type: "AnonymousFunction",
        params,
        body
      };
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
        if (peek()?.value === ",")
          consume();
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
    consume();
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
  function parseInterface() {
    consume();
    let name = consume().value;
    let expectatives = [];
    if (peek() && peek().value === "extends") {
      consume();
      if (peek() && peek().value === "(") {
        consume();
        while (peek() && peek().value !== ")") {
          expectatives.push(consume().value);
          if (peek()?.value === ",")
            consume();
        }
        consume();
      } else {
        expectatives.push(consume().value);
      }
    }
    expect("{");
    let props = {};
    while (peek() && peek().value !== "}") {
      expect("var");
      let propName = consume().value;
      expect(":");
      let typeName = consume().value;
      if (typeof typeName === "string")
        typeName = typeName == "String" || typeName == "Number" || typeName == "Boolean" ? typeName.toLowerCase() : typeName;
      expect(";");
      props[propName] = typeName;
    }
    expect("}");
    return {
      type: "Interface",
      name,
      props,
      expectatives
    };
  }
  function parseStatement() {
    let t = peek();
    if (t.value === "interface")
      return parseInterface();
    if (t.value === "var")
      return parseVar();
    if (t.value === "return")
      return parseReturn();
    if (t.value === "func")
      return parseFunction();
    if (t.value === "classfunc")
      return parseClsFunction();
    if (t.value === "if")
      return parseIf();
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
async function run(ast, globalSymbolsP, makeOne = false) {
  let scopea = {};
  let globalSymbols = globalSymbolsP;
  if (makeOne) {
    return { evalExpr, recursiveInterprete };
  }
  async function evalExpr(node, currentScope = scopea, mak = false) {
    if (node.type === "AnonymousFunction") {
      return {
        type: "userFunc",
        params: node.params,
        body: node.body
      };
    }
    if (node.type === "BinaryOp") {
      let left = await evalExpr(node.left, currentScope);
      let right = await evalExpr(node.right, currentScope);
      switch (node.operator) {
        case "==":
          return left == right;
        case ">":
          return left > right;
        case "<":
          return left < right;
      }
    }
    if (node.type === "Number")
      return node.value;
    if (node.type === "Identifier") {
      if (mak)
        return node.name;
      return globalSymbols[node.name] || currentScope[node.name];
    }
    if (node.type === "Member") {
      if (mak)
        return node.property;
      const prop = node.property;
      const obj = await evalExpr(node.object, currentScope);
      if (!CSTypeChecker.isCSObject(obj)) {
        throw new Error("Not an object");
      }
      if (typeof obj !== "object")
        throw new Error("evalExpr can have a value as a not object on member");
      if (!("object" in obj && typeof obj.object == "object" && obj.object !== null))
        throw new Error("evalExpr can have a value as a not object on member");
      if (!(typeof node.property === "string" || typeof node.property === "number")) {
        throw new Error("invalid property");
      }
      if (obj.type === "obj" && obj.object !== null) {
        return obj.object[node.property];
      }
      return obj.object[node.property];
    }
    if (node.type === "String")
      return node.value;
    if (node.type === "Call") {
      let callee = await evalExpr(node.callee, currentScope);
      let args = [];
      for (let arg of node.args) {
        args.push(await evalExpr(arg, currentScope));
      }
      if (!(typeof callee === "object" && "type" in callee))
        throw new Error("no callable function");
      if (callee.type === "userFunc") {
        if (!("params" in callee && Array.isArray(callee.params)))
          throw new Error("no callable function");
        let localScope = {};
        for (let i = 0; i < callee.params.length; i++) {
          localScope[callee.params[i]] = args[i];
        }
        let vale;
        try {
          vale = await recursiveInterprete(callee.body, localScope);
        } catch (ex) {
          if (ex instanceof ReturnException) {
            let result = ex.value;
            if ("expectatives" in callee && Array.isArray(callee.expectatives) && callee.expectatives.length > 0) {
              if (CSTypeChecker.isCSObject(result)) {
                result.classesHeredated = [];
                result.interfaces = [];
              }
              for (let ifaceName of callee.expectatives) {
                let iface = globalSymbols[ifaceName];
                if (CSTypeChecker.isCSObject(result)) {
                  result.interfaces?.push(iface);
                }
                if (typeof iface !== "object")
                  throw new Error("The interface is not a object");
                if (!iface || iface.type !== "interface") {
                  throw new Error(`Interface ${ifaceName} not found`);
                }
                if (!CSTypeChecker.isCSObject(result)) {
                  throw new TypeError(`Return is not an object for interface ${ifaceName}`);
                }
                if (!("props" in iface))
                  throw new TypeError("not props in interface");
                for (let prop in iface.props) {
                  if (!(prop in result.object)) {
                    throw new TypeError(interfaceError(ifaceName, `'${prop}' is not in the class that implements the interface`));
                  }
                  let expectedType = iface.props[prop];
                  let value = result.object[prop];
                  if (expectedType === "number" && typeof value !== "number") {
                    throw new TypeError(`Property '${prop}' must be number`);
                  }
                  if (expectedType === "string" && typeof value !== "string") {
                    throw new TypeError(`Property '${prop}' must be string`);
                  }
                }
              }
            }
            return result;
          }
          if (ex instanceof TypeError || ex instanceof RangeError) {
            ex.message = `at \x1B[38;5;161mfunc\x1B[0m ${await evalExpr(node.callee, currentScope, true)}: (${ex.message})`;
          }
          throw ex;
        }
        return "null";
      }
      if ("func" in callee && typeof callee.func == "function") {
        let vale;
        vale = await callee.func(args);
        return vale;
      }
      console.error("No es funci\xF3n:", callee);
    }
    return Boolean();
  }
  async function recursiveInterprete(body, scope = scopea, globalSymbolsX = globalSymbols) {
    globalSymbols = globalSymbolsX;
    for (let stmt of body) {
      if (stmt.type === "ExprStmt")
        await evalExpr(stmt.expr, scope);
      if (stmt.type === "Return") {
        let value = stmt.value ? await evalExpr(stmt.value, scope) : 0;
        throw new ReturnException(value);
      }
      if (stmt.type === "Interface") {
        let inter = {
          type: "interface",
          props: stmt.props,
          name: stmt.name
        };
        for (let element of stmt.expectatives) {
          if (CSTypeChecker.isCSInterface(globalSymbols[element]))
            Object.assign(inter.props, globalSymbols[element].props);
        }
        Object.assign(inter.props, stmt.props);
        globalSymbols[stmt.name] = inter;
      }
      if (stmt.type === "If") {
        let cond = await evalExpr(stmt.condition, scope);
        if (cond) {
          await recursiveInterprete(stmt.body, scope);
        } else if (stmt.elseBody) {
          await recursiveInterprete(stmt.elseBody, scope);
        }
      }
      if (stmt.type === "FunctionDecl") {
        scope[stmt.name] = {
          type: "userFunc",
          params: stmt.params,
          body: stmt.body,
          expectatives: stmt.expectatives || []
        };
      }
      if (stmt.type === "Class") {
        let classObj = {};
        scope[stmt.name] = {
          type: "obj",
          object: classObj
        };
        try {
          await recursiveInterprete(stmt.body, classObj);
        } catch (ex) {
          if (ex instanceof TypeError || ex instanceof RangeError || ex instanceof Error) {
            ex.message = errorAtCls(stmt.name, ex.message);
          }
          throw ex;
        }
        globalSymbols[stmt.name] = scope[stmt.name];
      }
      if (stmt.type === "VarDecl") {
        scope[stmt.name] = await evalExpr(stmt.value, scope);
      }
    }
  }
  try {
    await recursiveInterprete(ast);
  } catch (ex) {
    if (ex instanceof TypeError || ex instanceof Error) {
      console.log("Error", ex.message);
    }
  }
  return scopea;
}
function exportLibrary(isGlobal = false) {
  let globalSymbols = {};
  globalSymbols.true = true;
  globalSymbols.false = false;
  globalSymbols.Array = { type: "func", func: (params) => ({
    type: "array",
    items: params
  }) };
  globalSymbols.InternalDocsStrictEnum = { type: "func", func: (params) => {
    if (typeof params[0] !== "string")
      throw new TypeError(errorAtCls("InternalDocsStrictEnum", "error on create the enum"));
    let enumName = params[0];
    if (!CSTypeChecker.isCSArray(params[1]))
      throw new TypeError(errorAtCls("InternalDocsStrictEnum", "error on create the enum"));
    let allowedValues = params[1].items;
    return createEnum(enumName, allowedValues);
  } };
  globalSymbols.repr = { type: "func", func: (params) => {
    let solveToString = (thing, re = false, tabs = 0) => {
      let tabulated = "   ".repeat(tabs);
      if (Array.isArray(thing)) {
        return "[" + thing.map((v) => solveToString(v)).join(",") + "]";
      }
      if (CSTypeChecker.isCSArray(thing)) {
        return solveToString(thing.items);
      }
      if (CSTypeChecker.isCSInterface(thing)) {
        return interfaceRep(thing.name || "anonymus");
      }
      if (CSTypeChecker.isCSFunction(thing)) {
        return "\x1B[38;5;161mfunc\x1B[0m(...)";
      }
      if (CSTypeChecker.isCSObject(thing)) {
        let description = "\x1B[38;5;194mObject\x1B[0m {\n";
        for (const K in thing.object) {
          description += tabulated + "   " + K + ": " + solveToString(thing.object[K], true, tabs++) + ";\n";
        }
        description += tabulated + "}";
        return description;
      }
      return (typeof thing === "string" && re ? "\x1B[32m'" : "") + String(thing) + (typeof thing === "string" && re ? "'\x1B[0m" : "");
    };
    return solveToString(params[0]);
  } };
  globalSymbols.print = { type: "func", func: (params) => {
    console.log(...params.map((v) => globalSymbols.repr.func([v])));
    return 0;
  } };
  globalSymbols.Math = { type: "obj", object: {
    add: { type: "func", func: (params) => {
      const [a, b] = params;
      if (typeof a === "number" && typeof b === "number")
        return a + b;
      if (typeof a === "string" && typeof b === "string")
        return a + b;
      throw new TypeError("Math.add expects number or string");
    } },
    sub: { type: "func", func: (params) => {
      const [a, b] = params;
      if (typeof a === "number" && typeof b === "number")
        return a - b;
      throw new TypeError("Math.sub expects number");
    } },
    div: { type: "func", func: (params) => {
      const [a, b] = params;
      if (typeof a === "number" && typeof b === "number")
        return a / b;
      throw new TypeError("Math.div expects number");
    } },
    mul: { type: "func", func: (params) => {
      const [a, b] = params;
      if (typeof a === "number" && typeof b === "number")
        return a * b;
      throw new TypeError("Math.mul expects number");
    } }
  } };
  globalSymbols.Boolean = createEnum("Boolean", [true, false]);
  globalSymbols.boolean = globalSymbols.Boolean;
  globalSymbols.String = { type: "func", func: (params) => {
    return String(params[0]);
  } };
  globalSymbols.string = globalSymbols.String;
  globalSymbols.Number = { type: "func", func: (params) => {
    return Number(params[0]);
  } };
  globalSymbols.number = globalSymbols.Number;
  globalSymbols.Object = {
    type: "func",
    func: (params) => {
      let object = { type: "obj", object: {} };
      object.object.set = {
        type: "func",
        func: (params2) => {
          if (typeof params2[0] !== "string")
            throw new Error("Not allowed");
          object.object[params2[0]] = params2[1];
          return true;
        }
      };
      object.object.get = {
        type: "func",
        func: (params2) => {
          if (typeof params2[0] !== "string")
            throw new Error("Not allowed");
          return object.object[params2[0]];
        }
      };
      return object;
    }
  };
  globalSymbols.exportToGlobal = { type: "func", func: (params) => {
    let exportAs = params[0];
    let exportValue = params[1];
    if (typeof exportAs !== "string")
      throw new SyntaxError(errorAtCls("InternalNamespace", "trying to get a invalid var name"));
    globalSymbols[exportAs] = exportValue;
    return 0;
  } };
  globalSymbols.notDefined = { type: "func", func: (params) => {
    if (typeof params[0] !== "string")
      throw new SyntaxError(errorAtCls("InternalNamespace", "trying to get a invalid var name"));
    let exportAs = params[0];
    return !(exportAs in globalSymbols);
  } };
  globalSymbols.undef = { type: "func", func: (params) => {
    if (typeof params[0] !== "string")
      throw new SyntaxError(errorAtCls("InternalNamespace", "trying to get a invalid var name"));
    delete globalSymbols[params[0]];
    return 0;
  } };
  globalSymbols.getVar = { type: "func", func: (params) => {
    let exportAs = params[0];
    if (typeof exportAs !== "string")
      throw new SyntaxError(errorAtCls("InternalNamespace", "trying to get a invalid var name"));
    return globalSymbols[exportAs];
  } };
  globalSymbols.instanceof = { type: "func", func: (params) => {
    let [target, source] = params;
    if (!CSTypeChecker.isCSObject(target))
      return false;
    if (Array.isArray(target.interfaces)) {
      for (let iface of target.interfaces) {
        if (CSTypeChecker.isCSInterface(iface) && CSTypeChecker.isCSInterface(source) && iface.name === source.name)
          return true;
      }
    }
    return false;
  } };
  return globalSymbols;
}
export {
  CSTypeChecker,
  ReturnException,
  createEnum,
  errorAtCls,
  exportLibrary,
  interfaceError,
  interfaceRep,
  parse,
  run,
  tokenize
};
