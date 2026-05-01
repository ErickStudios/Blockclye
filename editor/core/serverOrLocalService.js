/** [LOCAL] Local Importations */
import { base64ToBytes } from "../lib/byte.js"
import { mapServerModel } from "./mapIndividualServices/mapServerModel.js";
import { mapServerScriptService } from "./mapIndividualServices/mapServerScriptService.js";
import { mapServerModelsService } from "./mapIndividualServices/mapServerModelsService.js"
/** [FUNDAMENTAL] Max Tree Service Before Of Internal Motor */
export class serverOrLocalService {
    /** [FUNCTION] Creates A 'serverOrLocalService' */
    constructor() {
        /** @type { mapServerModel[] } */
        this.mapServerModelsService =           mapServerModelsService.CreateMapModels();
        this.mapStackGlobalService =            []; 
        this.mapServerScriptService =           new mapServerScriptService();
        this.mapSecondaryStackGlobalService =   [];
        this.mapServerScriptVariablesServie =   [];
        /** @deprecated in favor of a new system */
        this.mapServerScriptServiceEditor =     "";
        this.workspaceHierarchy             =   [];
    }
    /** [FUNCTION] Exports The 'serverOrLocalService' As A '.json' */
    exportJson() {
        return JSON.stringify({
            mapServerModelsService: this.mapServerModelsService,
            mapStackGlobalService: this.mapStackGlobalService,
            mapSecondaryStackGlobalService: this.mapSecondaryStackGlobalService,
            mapServerScriptVariablesServie: this.mapServerScriptVariablesServie,
            mapServerScriptService: this.mapServerScriptService.codeGlobalScript,
            workspaceHierarchy: this.workspaceHierarchy
        });
    }
    /** [FUNCTION] Imports A 'serverOrLocalService' From A '.json' */
    importJson(json) {
        const data = JSON.parse(json);

        this.mapStackGlobalService = data.mapStackGlobalService;
        this.mapSecondaryStackGlobalService = data.mapSecondaryStackGlobalService;
        this.mapServerScriptVariablesServie = data.mapServerScriptVariablesServie;
        this.workspaceHierarchy = data.workspaceHierarchy;
        this.mapServerScriptService.codeGlobalScript = data.mapServerScriptService;
        this.mapServerModelsService = data.mapServerModelsService.map(obj => {
            const model = new mapServerModel();
            Object.assign(model, obj);
            return model;
        });
        mapServerModelsService.CreateMapModels(this.mapServerModelsService);
    }
};
/** [FUNDAMENTAL] Auto Exports */
export {
    mapServerModel,
    mapServerScriptService,
    mapServerModelsService
};