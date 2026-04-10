const readline = require("readline");

const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
});

console.clear();

setInterval(() => {
    let separator = "\x1b[32m//" + "=".repeat(process.stdout.columns - 2) + "\x1b[0m";

    console.clear();

    console.log(separator);
    console.log("\x1b[32m//the server status");
    console.log(separator);

    console.log("Players:", globalThis.playersCount || 0);
    console.log("Models:", globalThis.serverOrLocalServiceEnv.mapServerModelsService.length || 0);
    console.log("\nCommands:");
    console.log("kick <id>");
    console.log("exit");
}, 500);

rl.on("line", (input) => {
    if (input === "exit") process.exit();

    console.log("Command:", input);
});