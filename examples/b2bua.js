/*
 *
 * ---------------------------Example B2BUA---------------------------- *
 * This example accepts a SIP INVITE then creates a brand new INVITE    *
 * with the ingress caller's SDP to an test echo bot online             *
 * -------------------------------------------------------------------- *
 *
 */

const SIPUDP = require('../src/index.js')

/* Global variables */
// The IP and Port you want to listen on
// FYI: Must have internet connection for this test to work!
const host = '192.168.30.123', port = '5060'

// Remote URI to call
// This URI is an "echo bot" UA
const ruri = "sip:301@ideasip.com"

// Logger
let logger = null

// Ingress variables
let ingressDesc = null
let ingressSuccess = null
let ingressSession = null

// Egress variables
let egressDesc = null
let egressSuccess = null
let egressSession = null

/*
 * Media Hanlder Class
 *
 * This class is created when a new incoming or outgoing INVITE is made and handles the media negotiation process.
 * The two functions that are used for media negotiation are: getDescription() and setDescription()
 */
class MediaHandler {
  constructor(session) {
    // save the session that was passed in
    this.session = session

    // get a reference to the UA
    this.ua = session.ua

    // get a logger for this media handler
    this.logger = session.ua.getLogger('b2bua.mediaHandler');
  }

  close() {} // need to exist in media handler or else will error
  render() {} // need to exist in media handler or else will error
  mute() {} // need to exist in media handler or else will error
  unmute() {} // need to exist in media handler or else will error

  // Get description is used when getting a local endpoint session description
  // If an INVITE is sent, getDescription will be called before to setDescription
  // If an INVITE is received, setDescription will be called before getDescription
  getDescription(onSuccess, onFailure, mediaHint) {
    if (this.session.request && this.session.request.from_tag) {
      // no from tag, we need to call the egress success function
      egressSuccess()

      // this should be the final call
      // call onSuccess function back to the original ingress caller with the egress description
      this.logger.log('---> Final step :: Call egress success function and send the final egress description to the ingress caller')
      onSuccess(egressDesc)
    } else {

      // send the original ingress description to the new outbound call
      this.logger.log('---> Second Step :: send the original ingress caller description')
      onSuccess(ingressDesc)
    }
  }

  // Set description is used when setting a remote endpoints session description
  setDescription(description, onSuccess, onFailure) {

    if (!ingressDesc && !egressDesc) {
      this.logger.log('---> First Step :: new inbound call')

      // this is a brand new call
      ingressDesc = description

      // create new invite to the defined global ruri
      egressSession = this.ua.invite(ruri)

      egressSession.on('terminated', () => {
        this.logger.log('---> Egress Termination Event :: cleaning up session')

        if (ingressSession && ingressSession.status !== SIPUDP.Session.C.STATUS_TERMINATED) {
          // if not already terminated, send a bye
          ingressSession.bye()
        }

        // set egress variables back to null
        egressSession = null
        egressSuccess = null
        egressDesc = null

      })

      // set ingress success function
      ingressSuccess = onSuccess

    } else {
      // this is not a brand new call and we need to set egress description
      egressDesc = description

      // set egress success function
      egressSuccess = onSuccess

      // call ingress success function to move forward in chain
      this.logger.log('---> Third Step :: Invite was answered, set egress description and call ingress success method to move forward')
      ingressSuccess()
    }
  }
}

// Minimum settings to get a SIP UDP UAS server started
const server = new SIPUDP.UA({
  // provide a valid URI here
  // The host and port are used when creating the UDP server
  uri: 'b2bua@' + host + ':' + port,

  // start the server when we create this UA class
  autostart: true,

  // register needs to be false since we are a UAS
  register: false,

  // enable SIP debug
  traceSip: false,

  // this variable overrides a few settings in the UA class
  doUAS: true,

  // Custom media handler - A class to handle media descriptions
  mediaHandlerFactory: (session) => {
    return new MediaHandler(session)
  }
})

// see all server events here: https://sipjs.com/api/0.7.0/ua/#events
// on connected event
server.on('connected', (t) => {
  // get logger
  logger = t.transport.ua.getLogger('b2bua.server')
  logger.log('SIP server started!')
})

// on invite event
server.on('invite', (session) => {

  logger.log("---> Fourth Step :: receive invite event from stack and accept the call")

  // set ingress session
  ingressSession = session

  // auto accept the call
  ingressSession.accept()

  // see all events here: https://sipjs.com/api/0.7.0/session/#events
  ingressSession.on('terminated', () => {
    logger.log('---> Ingress Termination Event :: cleaning up session')

    if (egressSession && egressSession.status !== SIPUDP.Session.C.STATUS_TERMINATED) {
      // if not already terminated, send a bye
      egressSession.bye()
    }

    // set ingress variables back to null
    ingressSession = null
    ingressSuccess = null
    ingressDesc = null
  })

})
