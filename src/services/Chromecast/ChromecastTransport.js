// Copyright (C) 2017-2023 Smart code 203358507

const EventEmitter = require('eventemitter3');
const hat = require('hat');

const MESSAGE_NAMESPACE = 'urn:x-cast:com.stremio';
const CHUNK_SIZE = 20000;

let castAPIAvailable = null;
const castAPIEvents = new EventEmitter();

/**
 * Callback invoked by the Google Cast API to signal availability status.
 * Sets the castAPIAvailable flag and emits an event to notify waiting listeners.
 */
window['__onGCastApiAvailable'] = function(available) {
    delete window['__onGCastApiAvailable'];
    castAPIAvailable = !!available;
    castAPIEvents.emit('availabilityChanged');
};

/**
 * Initializes the Cast API by waiting for availability confirmation.
 * Returns a promise that resolves when the API is available or rejects if unavailable.
 * @returns {Promise<void>} A promise that resolves when the Cast API is available or rejects if unavailable.
 */
const initialize = () => {
    return new Promise((resolve, reject) => {
        /**
         * Handles the Cast API availability change event by resolving or rejecting the initialization promise.
         */
        function onCastAPIAvailabilityChanged() {
            castAPIEvents.off('availabilityChanged', onCastAPIAvailabilityChanged);
            if (castAPIAvailable) {
                resolve();
            } else {
                reject(new Error('window.cast api not available', { cause: 'castAPIAvailable is null.' }));
            }
        }
        if (castAPIAvailable !== null) {
            onCastAPIAvailabilityChanged();
        } else {
            castAPIEvents.on('availabilityChanged', onCastAPIAvailabilityChanged);
        }
    });
};

/**
 * Creates a transport layer for communicating with Chromecast devices.
 * Initializes the Cast API, sets up event listeners, and provides methods for session management and messaging.
 * Messages larger than CHUNK_SIZE are automatically split into chunks and reassembled on receipt.
 */
function ChromecastTransport() {
    const events = new EventEmitter();
    const messages = {};

    initialize()
        .then(() => {
            cast.framework.CastContext.getInstance().addEventListener(
                cast.framework.CastContextEventType.CAST_STATE_CHANGED,
                onCastStateChanged
            );
            cast.framework.CastContext.getInstance().addEventListener(
                cast.framework.CastContextEventType.SESSION_STATE_CHANGED,
                onSesstionStateChanged
            );
        })
        .then(() => {
            try {
                events.emit('init');
            } catch (error) {
                console.error('ChromecastTransport', error);
            }
        })
        .catch((error) => {
            events.emit('init-error', error);
        });

    /**
     * Handles incoming messages from the Cast receiver.
     * Reassembles chunked messages by collecting all chunks with the same id and emits the complete parsed message.
     * @param {string} _ - The namespace (unused).
     * @param {string} message - The JSON-encoded message chunk received from the Cast receiver.
     */
    function onMessage(_, message) {
        try {
            const { id, chunk, index, length } = JSON.parse(message);
            messages[id] = messages[id] || [];
            messages[id][index] = chunk;
            if (Object.keys(messages[id]).length === length) {
                const parsedMessage = JSON.parse(messages[id].join(''));
                delete messages[id];
                events.emit('message', parsedMessage);
            }
        } catch (error) {
            events.emit('message-error', error);
        }
    }

    /**
     * Forwards application status change events from the Cast session.
     * @param {Object} event - The application status change event from the Cast session.
     */
    function onApplicationStatusChanged(event) {
        events.emit(cast.framework.CastSession.APPLICATION_STATUS_CHANGED, event);
    }

    /**
     * Forwards application metadata change events from the Cast session.
     * @param {Object} event - The application metadata change event from the Cast session.
     */
    function onApplicationMetadataChanged(event) {
        events.emit(cast.framework.CastSession.APPLICATION_METADATA_CHANGED, event);
    }

    /**
     * Forwards active input state change events from the Cast session.
     * @param {Object} event - The active input state change event from the Cast session.
     */
    function onActiveInputStateChanged(event) {
        events.emit(cast.framework.CastSession.ACTIVE_INPUT_STATE_CHANGED, event);
    }

    /**
     * Forwards volume change events from the Cast session.
     * @param {Object} event - The volume change event from the Cast session.
     */
    function onVolumeChanged(event) {
        events.emit(cast.framework.CastSession.VOLUME_CHANGED, event);
    }

    /**
     * Forwards media session events from the Cast session.
     * @param {Object} event - The media session event from the Cast session.
     */
    function onMediaSessionChanged(event) {
        events.emit(cast.framework.CastSession.MEDIA_SESSION, event);
    }

    /**
     * Forwards cast state change events from the Cast context.
     * @param {Object} event - The cast state change event from the Cast context.
     */
    function onCastStateChanged(event) {
        events.emit(cast.framework.CastContextEventType.CAST_STATE_CHANGED, event);
    }

    /**
     * Handles session state changes by attaching or removing event listeners based on the session state.
     * When a session starts, all relevant listeners are attached. When it ends, they are removed.
     * @param {Object} event - The session state change event containing the session and its state.
     */
    function onSesstionStateChanged(event) {
        events.emit(cast.framework.CastContextEventType.SESSION_STATE_CHANGED, event);
        switch (event.sessionState) {
            case cast.framework.SessionState.SESSION_STARTED: {
                event.session.addMessageListener(MESSAGE_NAMESPACE, onMessage);
                event.session.addEventListener(cast.framework.CastSession.APPLICATION_STATUS_CHANGED, onApplicationStatusChanged);
                event.session.addEventListener(cast.framework.CastSession.APPLICATION_METADATA_CHANGED, onApplicationMetadataChanged);
                event.session.addEventListener(cast.framework.CastSession.ACTIVE_INPUT_STATE_CHANGED, onActiveInputStateChanged);
                event.session.addEventListener(cast.framework.CastSession.VOLUME_CHANGED, onVolumeChanged);
                event.session.addEventListener(cast.framework.CastSession.MEDIA_SESSION, onMediaSessionChanged);
                break;
            }
            case cast.framework.SessionState.SESSION_ENDED: {
                event.session.removeMessageListener(MESSAGE_NAMESPACE, onMessage);
                event.session.removeEventListener(cast.framework.CastSession.APPLICATION_STATUS_CHANGED, onApplicationStatusChanged);
                event.session.removeEventListener(cast.framework.CastSession.APPLICATION_METADATA_CHANGED, onApplicationMetadataChanged);
                event.session.removeEventListener(cast.framework.CastSession.ACTIVE_INPUT_STATE_CHANGED, onActiveInputStateChanged);
                event.session.removeEventListener(cast.framework.CastSession.VOLUME_CHANGED, onVolumeChanged);
                event.session.removeEventListener(cast.framework.CastSession.MEDIA_SESSION, onMediaSessionChanged);
                break;
            }
        }
    }

    /**
     * Registers an event listener for the specified event name.
     */
    this.on = function(name, listener) {
        events.on(name, listener);
    };

    /**
     * Removes an event listener for the specified event name.
     */
    this.off = function(name, listener) {
        events.off(name, listener);
    };

    /**
     * Removes all registered event listeners.
     */
    this.removeAllListeners = function() {
        events.removeAllListeners();
    };

    /**
     * Returns the current cast state from the Cast context.
     */
    this.getCastState = function() {
        return cast.framework.CastContext.getInstance().getCastState();
    };

    /**
     * Returns the current session state from the Cast context.
     */
    this.getSessionState = function() {
        return cast.framework.CastContext.getInstance().getSessionState();
    };

    /**
     * Returns the cast device from the current session, or null if no session is active.
     */
    this.getCastDevice = function() {
        const session = cast.framework.CastContext.getInstance().getCurrentSession();
        if (session !== null) {
            return session.getCastDevice();
        }

        return null;
    };

    /**
     * Updates the Cast context options with the provided configuration.
     */
    this.setOptions = function(options) {
        cast.framework.CastContext.getInstance().setOptions(options);
    };

    /**
     * Initiates a request to start a new Cast session.
     * Returns a promise that resolves when the session is established.
     */
    this.requestSession = function() {
        return cast.framework.CastContext.getInstance().requestSession();
    };

    /**
     * Ends the current Cast session with an option to stop casting on the receiver.
     */
    this.endCurrentSession = function(stopCasting) {
        cast.framework.CastContext.getInstance().endCurrentSession(stopCasting);
    };

    /**
     * Sends a message to the Cast receiver by splitting it into chunks if necessary.
     * Returns a promise that resolves when all chunks are sent, or rejects if no session is active.
     */
    this.sendMessage = function(message) {
        const castSession = cast.framework.CastContext.getInstance().getCurrentSession();
        if (castSession !== null) {
            const serializedMessage = JSON.stringify(message);
            const chunksCount = Math.ceil(serializedMessage.length / CHUNK_SIZE);
            const chunks = [];
            for (let i = 0; i < chunksCount; i++) {
                const start = i * CHUNK_SIZE;
                const chunk = serializedMessage.slice(start, start + CHUNK_SIZE);
                chunks.push(chunk);
            }
            const id = hat();
            return Promise.all(chunks.map((chunk, index) => {
                return castSession.sendMessage(MESSAGE_NAMESPACE, {
                    id,
                    chunk,
                    index,
                    length: chunks.length
                });
            }));
        } else {
            return Promise.reject(new Error('Session not started', { cause: 'castSession is null.' }));
        }
    };
}

module.exports = ChromecastTransport;
