// mapServerScriptServiceBackground.js
import { mapServerScriptService } from "../mapIndividualServices/mapServerScriptService.js";

self.onmessage = async (e) => {
    if (e.data.retval) {
        self.retval = e.data.retval;
        return;
    }

    let { code, env } = e.data;

    try {
        env.mapServerModelsService.move = null;
        env.mapServerModelsService.scale = null;
        env.mapServerModelsService.rotate = null;

        env.mapServerScriptService2 = new mapServerScriptService();
        env.mapServerScriptService2.codeGlobalScript = env.mapServerScriptService.codeGlobalScript;
        env.mapServerScriptService.exIt = env.mapServerScriptService2.exIt;

        let result = await runScript(code, env);
        self.postMessage({ func: "done", result });
    } catch (err) {
        console.log(err);
        self.postMessage({ func: "done", error: err.message });
    }
};

async function runScript(code, env) {
    return await env.mapServerScriptService.exIt(env);
}