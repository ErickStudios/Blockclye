/** [GLOBAL] Application Library*/
export class AppLib {
    /** [ENUM] Operation Type*/
    static OperationOfManipule = class {
        static selectObject = 0;
        static moveObject = 1;
        static rotateObject = 2;
        static weldObject = 3;
        static clientMode = 4;
        static scaleObject = 5;
    }
}