# SIP.js yet with UDP
This is a fork of the SIP.js project. However, instead of WebSockets as the main transport this library uses UDP. The underlying version of SIP.js is 0.0.7 which supports majority of RFC 3261. I have yet to find a case where the library doesn't support a SIP Method or use case.

## Installation
```
npm install sipjs-udp
```

## Getting Started
This SIP library can be combined with any media engine to create a pretty bad ass b2bua in NodeJS. To help get you started, I've create a couple working examples in the `examples` folder.

## Questions/Bug Reporting
Please open up an issue if you have a question or find a bug. I try my best to be proactive and will try to resolve issues quickly. Thanks!

## Contributing
This is a young project still and needs more attention. There is quite a bit more work that needs to be done with other transports like TCP, TLS and WebSockets. I know... This library is called "sipjs-udp". We can always deprecate an old package and extend this one with the new transports. 
