const SIPUDP = require('../src/index.js')

let host = '127.0.0.1',
  port = '5060';

class MediaHandler {
  constructor(session) {
    this.session = session
  }
  close() {}
  render() {}
  mute() {}
  unmute() {}
  getDescription(onSuccess, onFailure, mediaHint) {}
  setDescription(description, onSuccess, onFailure) {}
}


const server = new SIPUDP.UA({
  // provide a valid URI here
  // The host and port are used to start the server
  uri: 'simple-uas@' + host + ':' + port,

  bind: host,

  // auto start...
  autostart: true,

  // no need to register since we are UAS
  register: false,

  // trace sip or not
  traceSip: true,

  // enable UAS support
  doUAS: true,

  // Custom media handler - Enabled for custom media handling
  mediaHandlerFactory: (session) => {
    return new MediaHandler(session)
  }
})

server.on('connected', () => {
  console.log('SIP server started')
})

server.on('disconnected', () => {
  console.log('SIP server stopped')
})

server.on('invite', (session) => {
  console.log('SIP INVITE recv')
  console.log(session)
})
