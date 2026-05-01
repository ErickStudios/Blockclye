import { connect, sendInput } from "./network.js";
import { initRender, renderLoop, keys } from "./render.js";

const input = document.getElementById("serverId");

document.getElementById("serverId").value = "ws://localhost:8080";
function debounce(fn, delay) {
    let t;
    return (...args) => {
        clearTimeout(t);
        t = setTimeout(() => fn(...args), delay);
    };
}
input.addEventListener("input", debounce(async () => {
    window.setServerStatus("connecting");

    const url = input.value.trim();

    if (!url.startsWith("ws://") && !url.startsWith("wss://")) {
        window.setServerStatus("offline");
        return;
    }

    const conect = await checkServerWS(url);

    window.setServerStatus(conect ? "online" : "offline");

}, 500));
input.dispatchEvent(new Event("input"));
document.getElementById("connectBtn").onclick = () => {
    const id = document.getElementById("serverId").value;

    document.getElementById("ui").style.display = 'none';
    document.getElementById("connectBtn").hidden = true;
    document.getElementById("serverId").hidden = true;
    document.getElementById("min").hidden = true;

    connect(id);

    initRender();
    renderLoop();
};

// input
document.addEventListener("keydown", (e) => {
    if (e.key.toLowerCase() == 'x') {
        window.interactingWithGui = !window.interactingWithGui;
    }
    keys[e.key.toLowerCase()] = true;
});

document.addEventListener("keyup", (e) => {
    keys[e.key.toLowerCase()] = false;
});

const icon = document.getElementById("serverStatusIcon");
const text = document.getElementById("serverStatusText");

function checkServerWS(url) {
    return new Promise((resolve) => {
        const ws = new WebSocket(url);

        let resolved = false;

        ws.onopen = () => {
            resolved = true;
            ws.close();
            resolve(true);
        };

        ws.onerror = () => {
            if (!resolved) {
                resolved = true;
                resolve(false);
            }
        };

        ws.onclose = () => {
            if (!resolved) {
                resolved = true;
                resolve(false);
            }
        };

        setTimeout(() => {
            if (!resolved) {
                resolved = true;
                resolve(false);
                ws.close();
            }
        }, 2000);
    });
}

window.setServerStatus = function(status) {
    if (status === "online") {
        icon.src = "serverStatus/online.svg";
        text.innerText = "Online";
    } 
    else if (status === "connecting") {
        icon.src = "";
        text.innerText = "Connecting...";
    } 
    else {
        icon.src = "serverStatus/offline.svg";
        text.innerText = "Offline";
    }
}

// enviar input al server
setInterval(() => {
    sendInput({
        keys
    });
}, 50);