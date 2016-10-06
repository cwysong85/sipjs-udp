"use strict";
var extend = require('util')._extend;

extend(exports, require('./environment_browser'));

extend(exports, {
  dgram: require('dgram'),
  Promise: exports.Promise || require('promiscuous'),
  console: require('console'),
  timers: require('timers')
});
