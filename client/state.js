export let state = {
    world: null,
    playerId: null
};

export function setState(newState) {
    state = { ...state, ...newState };
}