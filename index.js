/**
 * Chat Bridge.
 *
 * @author Jared Allard <jaredallard@outlook.com>
 * @license MIT
 * @version 1.0.1
 **/

'use strict';

const async = require('async');
const Modules = require('./lib/modules.js');
const debug   = require('debug')('chat-bridge');
const raven = require('raven');

let modules   = new Modules.class();
modules.scan('./modules');


let methods = [];
Object.keys(Modules.loaded.modules).forEach(key => {
  methods.push(key);
})

console.log('Available Pipes:', methods);


let pipeline = require('./pipeline.js');

if(pipeline.sentry.enabled) {
  debug('sentry', 'enabled')
  let client = new raven.Client();
  client.patchGlobal(pipeline.sentry.DSN);
}

debug('pipeline', 'has', pipeline.pipeline.length, 'pipes');

// Log our order
let i = 0;
while(i !== pipeline.pipeline.length) {
  let pipe = pipeline.pipeline[i];

  // increment to length.
  i++;

  let module = pipe.module;
  if(!Modules.loaded.modules[module]) {
    throw new Error('Invalid Module, '+module);
  }

  if(i !== pipeline.pipeline.length) {
    process.stdout.write(pipe.module+'['+pipe.method+']'+' -> ');
  } else {
    console.log(pipe.module+'['+pipe.method+']');
  }
}

// Init the modules and connect them.
let senders = [];
let recievers = [];
let id = 0;

let ignore_nicks = [];
pipeline.pipeline.forEach(pipe => {
  // Give us a new ID.
  id++;

  let module = new Modules.loaded.modules[pipe.module].class(pipe.config);
  module.connect();
  module.ready(() => {
    module.init(() => {
      ready();
    });
  });

  // Setup our metadat.
  module.metadata = {
    id: id,
    ident: module.ident,
    module: pipe.module
  };

  // If a "multicast" pipe, ignore feedback.
  if(pipe.method == 'both') {
    debug('ignore_nicks', 'push', pipe.config.nick)
    ignore_nicks.push(pipe.config.nick);
  }

  if(pipe.method == 'send' || pipe.method == 'both') {
    senders.push({
      module: pipe.module,
      id: id,
      sender: module.forward
    })
  }

  if(pipe.method == 'recv' || pipe.method == 'both') {
    recievers.push({
      module: pipe.module,
      id: id,
      onmessage: module.recieved
    })
  }
})

let count = 0;
let ready = () => {
  count++;
  if(count !== pipeline.pipeline.length) return;
  // Setup the recievers.

  recievers.forEach(function(recv) {
    debug('link', recv.module+'['+recv.id+']');
    recv.onmessage((nick, message, from) => {
      if(ignore_nicks.indexOf(nick) !== -1) {
        return debug('send:ignore', 'from a registered forwarder');

      }
      senders.forEach(send => {
        if(send.id === from.id) {
          return debug('send:ignore', 'came from us', send.module, 'to', from.module);
        }

        debug('send', send.module+'['+send.id+']', message, 'from', nick);
        send.sender(nick, message, from.ident);
      });
    });
  })
}
