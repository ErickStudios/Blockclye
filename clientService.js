import { connect, sendInput } from "./client/network.js";
import { initRender, renderLoop, keys } from "./client/render.js";

document.getElementById("serverId").value = "ws://localhost:8080";

document.getElementById("connectBtn").onclick = () => {
    const id = document.getElementById("serverId").value;

    connect(id);

    initRender();
    renderLoop();
};

// input
document.addEventListener("keydown", (e) => {
    keys[e.key.toLowerCase()] = true;
});

document.addEventListener("keyup", (e) => {
    keys[e.key.toLowerCase()] = false;
});

// enviar input al server
setInterval(() => {
    sendInput({
        keys
    });
}, 50);