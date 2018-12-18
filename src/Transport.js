"use strict";
/**
 * @fileoverview Transport
 */

/**
 * @augments SIP
 * @class Transport
 * @param {SIP.UA} ua
 * @param {Object} server ws_server Object
 */
module.exports = function(SIP, WebSocket) {
    var Transport,
        dgram = require('dgram'),
        C = {
            // Transport status codes
            STATUS_READY: 0,
            STATUS_DISCONNECTED: 1,
            STATUS_ERROR: 2
        };

    Transport = function(ua, server) {

        this.logger = ua.getLogger('sip.transport');
        this.ua = ua;
        this.ws = null;
        this.server = server;
        this.client = null;
        this.reconnection_attempts = 0;
        this.closed = false;
        this.connected = false;
        this.reconnectTimer = null;
        this.lastTransportError = {};

        this.ua.transport = this;

        // Connect
        this.connect();
    };

    Transport.prototype = {
        /**
         * Send a message.
         * @param {SIP.OutgoingRequest|String} msg
         * @returns {Boolean}
         */
        send: function(host, port, msg) {
            var message = msg.toString();

            if (this.ua.configuration.traceSip === true) {
                this.logger.log('sending UDP message:\n\n' + message + '\n');
            }

            var msgToSend = new Buffer(message);

            this.server.send(msgToSend, 0, msgToSend.length, port, host, function(err) {
                if (err) {
                    console.log(err);
                    return false;
                }
            });
            return true;
        },

        /**
         * Connect socket.
         */
        connect: function() {
            var transport = this;

            this.server = dgram.createSocket('udp4');

            this.server.on('listening', function() {
                transport.client = transport.server;
                transport.connected = true;

                // Disable closed
                transport.closed = false;

                // Trigger onTransportConnected callback
                transport.ua.onTransportConnected(transport);
            });

            this.server.on('message', function(msg) {
                transport.onMessage({
                    data: msg
                });
            });

            this.server.bind(this.ua.configuration.uri.port, this.ua.configuration.bind);

        },

        // Transport Event Handlers

        /**
         * @event
         * @param {event} e
         */
        onMessage: function(e) {
            var message, transaction,
                data = e.data;

            if (typeof data !== 'string') {

                try {
                    data = String.fromCharCode.apply(null, new Uint8Array(data));
                } catch (evt) {
                    this.logger.warn('received UDP binary message failed to be converted into string, message discarded');
                    return;
                }
            }

            // CRLF Keep Alive response from server. Ignore it.
            if (data === '\r\n' || data === '\r\n\r\n') {
                if (this.ua.configuration.traceSip === true) {
                    this.logger.log('received UDP message with CRLF Keep Alive response');
                }
                return;
            }

            if (this.ua.configuration.traceSip === true) {
                this.logger.log('received UDP message:\n\n' + data + '\n');
            }

            message = SIP.Parser.parseMessage(data, this.ua);

            if (!message) {
                return;
            }

            if (this.ua.status === SIP.UA.C.STATUS_USER_CLOSED && message instanceof SIP.IncomingRequest) {
                return;
            }

            // Do some sanity check
            if (SIP.sanityCheck(message, this.ua, this)) {
                if (message instanceof SIP.IncomingRequest) {
                    message.transport = this;
                    this.ua.receiveRequest(message);
                } else if (message instanceof SIP.IncomingResponse) {
                    /* Unike stated in 18.1.2, if a response does not match
                     * any transaction, it is discarded here and no passed to the core
                     * in order to be discarded there.
                     */
                    switch (message.method) {
                        case SIP.C.INVITE:
                            transaction = this.ua.transactions.ict[message.via_branch];
                            if (transaction) {
                                transaction.receiveResponse(message);
                            }
                            break;
                        case SIP.C.ACK:
                            // Just in case ;-)
                            break;
                        default:
                            transaction = this.ua.transactions.nict[message.via_branch];
                            if (transaction) {
                                transaction.receiveResponse(message);
                            }
                            break;
                    }
                }
            }
        }
    };

    Transport.C = C;
    return Transport;
};