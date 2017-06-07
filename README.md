# SIP.js UDP Implementation
This project is very young and doesn't have much support as of yet. This was a P.O.C. for one of my test applications and works pretty good. This version of SIP.js just replaces the WebSocket transport with the UDP transport.

```
npm install https://github.com/cwysong85/sipjs-udp
```

### UAS Implementation
```
const SIPUDP = require('sipjs-udp')

let host = '127.0.0.1', port = '5060';

class UasMediaHandler {
    constructor() {}
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
    uri: 'uas@' + host + ':' + port,

    // auto start...
    autostart: true,

    // no need to register since we are UAS
    register: false,

    // trace sip or not
    traceSip: true,
    hackViaTcp: true,

    // enable UAS support
    doUAS: true,

    // Custom media handler - Enabled for custom media handling
    // dev notes: I've only implemented this library using a custom media handler.
    // I'm unsure how the built in media handler works with the UDP transport.
    mediaHandlerFactory: new UasMediaHandler()
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
```
