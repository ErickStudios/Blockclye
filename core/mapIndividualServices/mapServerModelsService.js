/** [SERVER/LOCAL] Service That Saves The Models In The Server/Local */
export class mapServerModelsService {
    /** [FUNCTION] Creates A 'mapServerModelsService' */
    static CreateMapModels(arrayModelsA=undefined) {
        let arrayModels = [];
        if (arrayModelsA !== undefined) arrayModels = arrayModelsA;
        arrayModels.scale = (id, x, y, z) => {
            arrayModels[id].baseSize = [x, y, z];
        };
        arrayModels.rotate = (id, x, y, z) => {
            let parent = arrayModels[id];

            let oldRotation = parent.baseRotation;
            let newRotation = [x, y, z];

            let deltaRot = [
                newRotation[0] - oldRotation[0],
                newRotation[1] - oldRotation[1],
                newRotation[2] - oldRotation[2]
            ];

            parent.baseRotation = newRotation;
            let rotateX = (p, a) => {
                let cos = Math.cos(a);
                let sin = Math.sin(a);
                return [
                    p[0],
                    p[1] * cos - p[2] * sin,
                    p[1] * sin + p[2] * cos
                ];
            };

            let rotateY = (p, a) => {
                let cos = Math.cos(a);
                let sin = Math.sin(a);
                return [
                    p[0] * cos - p[2] * sin,
                    p[1],
                    p[0] * sin + p[2] * cos
                ];
            };

            let rotateZ = (p, a) => {
                let cos = Math.cos(a);
                let sin = Math.sin(a);
                return [
                    p[0] * cos - p[1] * sin,
                    p[0] * sin + p[1] * cos,
                    p[2]
                ];
            };

            arrayModels.forEach((v, i) => {
                if (v.weldedTo === id) {
                    let parentPos = parent.basePosition;
                    let childPos = v.basePosition;
                    let relative = [
                        childPos[0] - parentPos[0],
                        childPos[1] - parentPos[1],
                        childPos[2] - parentPos[2]
                    ];
                    let rotated = relative;
                    rotated = rotateX(rotated, deltaRot[0]);
                    rotated = rotateY(rotated, deltaRot[1]);
                    rotated = rotateZ(rotated, deltaRot[2]);
                    let newPos = [
                        parentPos[0] + rotated[0],
                        parentPos[1] + rotated[1],
                        parentPos[2] + rotated[2]
                    ];

                    v.basePosition = newPos;
                    v.baseRotation = [
                        v.baseRotation[0] + deltaRot[0],
                        v.baseRotation[1] + deltaRot[1],
                        v.baseRotation[2] + deltaRot[2]
                    ];
                    arrayModels.rotate(i, ...v.baseRotation);
                }
            });
        };
        arrayModels.move = (id, x, y, z) => {
            let blockToMove = id;
            arrayModels.forEach((v, i, arr) => {
                if (v.weldedTo == blockToMove) {
                    let vectorCurr = [
                        v.basePosition[0], 
                        v.basePosition[1], 
                        v.basePosition[2]
                    ];
                    let moveStepsVector = [
                        x - arr[blockToMove].basePosition[0],
                        y - arr[blockToMove].basePosition[1],
                        z - arr[blockToMove].basePosition[2]
                    ];
                    vectorCurr[0] += moveStepsVector[0];
                    vectorCurr[1] += moveStepsVector[1];
                    vectorCurr[2] += moveStepsVector[2];
                    arrayModels[i].basePosition = vectorCurr;
                    arrayModels.move(i, vectorCurr[0], vectorCurr[1], vectorCurr[2]);
                };
            });
            arrayModels[id].basePosition = [x, y, z];
        };
        return arrayModels;
    }
};