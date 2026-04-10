import { setState } from "./state.js";

let socket;

export function connect(serverId) {
    socket = new WebSocket(serverId);

    socket.onopen = () => {
        console.log("🟢 Connected to server");
    };

    socket.onmessage = (event) => {
        const data = JSON.parse(event.data);

        if (data.type === "init") {
            setState({
                world: data.world,
                playerId: data.id
            });
        }

        if (data.type === "state") {
            setState({
                world: data.world
            });
        }
    };
}

export function sendInput(input) {
    if (!socket) return;

    socket.send(JSON.stringify({
        type: "input",
        ...input
    }));
}