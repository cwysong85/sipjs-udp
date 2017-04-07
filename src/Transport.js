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
module.exports = function(SIP, dgram) {
  var Transport,
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
    // this.client = null;
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
    send: function(msg) {

      var sendToHost = null, sendToPort = 5060, parsedMsg;

      if(typeof msg === 'string') {
        // parse message
        parsedMsg = SIP.Parser.parseMessage(msg, this.ua);

        if(!parsedMsg) {
          return false;
        }

      } else {

        if(msg instanceof SIP.OutgoingRequest) {
          // All outgoing requests have URIs...
          // But if there is a Route header then we need to use that instead of the RURI

          var routeHdr = msg.getHeader('Route');
          if(routeHdr !== undefined) {
            // remove < and >
            var route = routeHdr.replace('<', '').replace('>', '');

            var routeUri = SIP.URI.parse(route);
            sendToHost = routeUri.host;
            sendToPort = routeUri.port || 5060;
          } else {
            sendToHost = msg.ruri.host;
            sendToPort = msg.ruri.port || 5060;
          }

        }

        parsedMsg = msg.toString();
      }

      if(parsedMsg.via) {
        // use via to send
        if(parsedMsg.via.host) {
          sendToHost = parsedMsg.via.host;
        }
        if(parsedMsg.via.port) {
          sendToPort = parsedMsg.via.port;
        }
      }

      if(parsedMsg.from && parsedMsg.from.uri && parsedMsg.from.uri.port) {
        sendToPort = parsedMsg.from.uri.port;
      }

      if(!sendToHost) {
        if(parsedMsg.from && parsedMsg.from.uri && parsedMsg.from.uri.host) {
          sendToHost = parsedMsg.from.uri.host;
        }
      }

      var parsedMsgToString = parsedMsg.toString();

      if (this.ua.configuration.traceSip === true) {
        this.logger.log('sending UDP message:\n\n' + parsedMsgToString + '\n');
      }

      var msgToSend = new Buffer(parsedMsgToString);

      this.client.send(msgToSend, 0, msgToSend.length, sendToPort, sendToHost, function(err) {
        if (err) {
          console.log(err);
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
        transport.client = this.server;
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

      this.server.bind(this.ua.configuration.uri.port, this.ua.configuration.uri.host);

    },

    // Transport Event Handlers

    /**
     * @event
     * @param {event} e
     */
    onMessage: function(e) {
      var message, transaction,
        data = e.data;

      // CRLF Keep Alive response from server. Ignore it.
      if (data === '\r\n') {
        if (this.ua.configuration.traceSip === true) {
          this.logger.log('received UDP message with CRLF Keep Alive response');
        }
        return;
      } else if (typeof data !== 'string') {
        try {
          data = String.fromCharCode.apply(null, new Uint8Array(data));
        } catch (evt) {
          this.logger.warn('received UDP binary message failed to be converted into string, message discarded');
          return;
        }

        if (this.ua.configuration.traceSip === true) {
          this.logger.log('received UDP binary message:\n\n' + data + '\n');
        }
      } else {
        if (this.ua.configuration.traceSip === true) {
          this.logger.log('received UDP text message:\n\n' + data + '\n');
        }
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
