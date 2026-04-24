const {serverRun} = require("./serverOrLocalServiceCreatorApi");
const fs = require("fs")
var fileToLoad = process.argv[2];
serverRun(fs.readFileSync(fileToLoad, "utf-8"))