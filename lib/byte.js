export function base64ToBytes(base64) {
    const binary = atob(base64);
    const len = binary.length;

    const bytes = new Uint8Array(len);

    for (let i = 0; i < len; i++) {
        bytes[i] = binary.charCodeAt(i);
    }

    return bytes;
}