// Copyright (C) 2017-2023 Smart code 203358507

const EventEmitter = require('eventemitter3');
const ChromecastTransport = require('./ChromecastTransport');

/**
 * Manages the Chromecast connection lifecycle and state.
 * Provides an interface to start/stop the Chromecast transport and listen to state changes.
 * @constructor
 */
function Chromecast() {
    let active = false;
    let error = null;
    let starting = false;
    let transport = null;

    const events = new EventEmitter();

    /**
     * Handles successful transport initialization by updating state flags.
     */
    function onTransportInit() {
        active = true;
        error = null;
        starting = false;
        onStateChanged();
    }
    /**
     * Handles transport initialization errors by storing the error and resetting state.
     * @param {*} args - The error information from the failed initialization
     */
    function onTransportInitError(args) {
        console.error(args);
        active = false;
        error = new Error('Google Cast API not available', { cause: args });
        starting = false;
        onStateChanged();
        transport = null;
    }
    /**
     * Emits a state change event to notify listeners.
     */
    function onStateChanged() {
        events.emit('stateChanged');
    }

    Object.defineProperties(this, {
        /**
         * Indicates whether the Chromecast transport is active and ready.
         */
        active: {
            configurable: false,
            enumerable: true,
            /**
             * @returns {boolean} True if the transport is active and ready
             */
            get: function() {
                return active;
            }
        },
        /**
         * Contains any error that occurred during initialization, or null if no error.
         */
        error: {
            configurable: false,
            enumerable: true,
            /**
             * @returns {Error|null} The initialization error or null if no error occurred
             */
            get: function() {
                return error;
            }
        },
        /**
         * Indicates whether the transport is currently in the process of starting.
         */
        starting: {
            configurable: false,
            enumerable: true,
            /**
             * @returns {boolean} True if the transport is currently starting
             */
            get: function() {
                return starting;
            }
        },
        /**
         * The underlying ChromecastTransport instance, or null if not initialized.
         */
        transport: {
            configurable: false,
            enumerable: true,
            /**
             * @returns {ChromecastTransport|null} The transport instance or null if not initialized
             */
            get: function() {
                return transport;
            }
        }
    });

    /**
     * Initiates the Chromecast transport if not already active, starting, or in an error state.
     * Creates a new ChromecastTransport instance and sets up initialization event listeners.
     */
    this.start = function() {
        if (active || error instanceof Error || starting) {
            return;
        }

        starting = true;
        transport = new ChromecastTransport();
        transport.on('init', onTransportInit);
        transport.on('init-error', onTransportInitError);
        onStateChanged();
    };
    /**
     * Stops the Chromecast transport by resetting state and cleaning up the transport instance.
     */
    this.stop = function() {
        active = false;
        error = null;
        starting = false;
        onStateChanged();
        if (transport !== null) {
            transport.removeAllListeners();
            transport = null;
        }
    };
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
}

module.exports = Chromecast;
