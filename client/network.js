import { setState } from "./state.js";

let socket;

export function connect(serverId) {
    socket = new WebSocket(serverId);

    socket.onopen = () => {
        console.log("🟢 Connected to server");
    };

    socket.onmessage = (event) => {
        const data = JSON.parse(event.data);

        if (data.type == 'idChange') {
            setState({
                world: data.world,
                playerId: data.newId
            });
        }

        if (data.type == 'request') {

            if (data.requestType == 'PlayerUI.itemsCount') {
                let count = window.clientService.PlayerUI.length;

                socket.send(JSON.stringify({
                    type: "response",
                    requestId: data.requestId,
                    data: count
                }));
            }
            if (data.requestType == "PlayerUI.appendItem") {
                let count = window.clientService.PlayerUI.length;
                window.clientService.PlayerUI.push(data.data.item);
                socket.send(JSON.stringify({
                    type: "response",
                    requestId: data.requestId,
                    data: count
                }));
            }
        }

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
    if (!socket || socket.readyState !== WebSocket.OPEN) return;

    socket.send(JSON.stringify({
        type: "input",
        ...input
    }));
}

export function sendEvent(event) {
    if (!socket || socket.readyState !== WebSocket.OPEN) return;

    socket.send(JSON.stringify({
        type: "event",
        ...event
    }));
}