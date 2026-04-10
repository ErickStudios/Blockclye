/** [LOCAL] Local Importations */
import { mapServerModel } from "./mapServerModel.js";
import { parse, run, tokenize, exportLibrary } from "./mapServerScriptServiceLang.js"
/** [SERVER/LOCAL] Service That Handles The Other Services Dynamically */
export class mapServerScriptService {
    /** [FUNCTION] Creates A 'mapServerScriptService' */
    constructor() {
        this.codeGlobalScript = "";
    }
    /** [FUNCTION] Executes The Script @param { serverOrLocalService } env */
    async exIt(env) {
        let index = 0;

        let globalSymbols = exportLibrary();

        let envLang = (await run(parse(tokenize(this.codeGlobalScript)),globalSymbols));
        return envLang;
    }
}