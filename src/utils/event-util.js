export function dispatchCustomEvent(eventName, eventDetail) {
    const event = new CustomEvent(eventName, {detail: eventDetail});
    window.dispatchEvent(event);
}

export function listenEvent(eventName, callback) {
    window.addEventListener(eventName, (e) => {
        callback(e.detail);
    })
}
