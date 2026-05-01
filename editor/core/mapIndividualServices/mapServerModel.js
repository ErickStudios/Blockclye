/** [SERVER/LOCAL] A Model */
export class mapServerModel {
    /** [ENUM] Materials That A Model Can Set */
    static posibleMaterials = {
        testAbc: 'testAbc'
    };
    /* [FUNCTION] Creates a 'mapServerModel' with a json type as{
        "material": string,
        "weldedTo": number,
        "basePosition": [number,number,number],
        "baseSize": [number,number,number],
        "baseRotation": [number,number,number]
    }*/
   constructor() {
        this.material = mapServerModel.posibleMaterials.testAbc;
        this.weldedTo = -1;
        this.basePosition = [0,0,0];
        this.baseSize = [1,1,1];
        this.baseRotation = [0,0,0];
        this.color = [0,0,0];
        this.mass = 1;
        this.velocity = [0,0,0];
        this.useGravity = true;
        this.isStatic = false;
   }
};