/**
 * Available commands.
 *
 * @author Jared Allard <jaredallard@outlook.com>
 * @license MIT
 * @version 1.0.1
 **/

'use strict';

const debug   = require('debug')('chat-bridge:cmd')
const decache = require('decache');
const fs      = require('fs');

if(!global.linkRequests) {
  debug('link', 'recreating link object');
  global.linkRequests = {
    created: Date.now(),
    users: {}
  }
}

/* eslint valid-jsdoc: 0 */

module.exports = {

  /**
   * PING, PONG
   **/
  'ping': (opt, send) => {
    send.send('pong')

    return true;
  },

  /**
   * Link a user@source to user@source and display their name as linkName.
   **/
  'link': (opt, send, services) => {
    if(!opt[1] || !opt[2]) {
      return send.send('link::USAGE: name@service identifier')
    }

    let linkTarget = opt[1];
    let linkName   = opt[2];

    // Service we're one.
    let linkSource = send.data.nick+'@'+send.data.source;

    let linkTargetSplit = linkTarget.split('@');
    if(!linkTargetSplit[0] || !linkTargetSplit[1]) {
      return send.send('link::invalid syntax: expected name@service for linkTarget')
    }

    send.send('link username: '+linkSource+' to '+linkTarget+' as '+linkName)

    services.senders.forEach(sender => {
      debug('link', 'itr', sender.ident, '?', linkTargetSplit[1])
      if(sender.ident == linkTargetSplit[1]) {
        debug('link', 'found linkSource', sender.ident);

        debug('link', 'created link request for user', linkTargetSplit[0])

        global.linkRequests.users[linkTargetSplit[0]] = {
          created: Date.now(),
          origin: {
            nick:   send.data.nick,
            source: send.data.source
          },
          remote: {
            nick: linkTargetSplit[0],  // remote nick
            source: linkTargetSplit[1] // remote source
          },
          name: linkName
        };

        sender.send(
          'link::REQUEST: <b>'+linkTargetSplit[0]+'</b> ' +
          '<b>'+send.data.nick+'</b>@'+send.data.source+' has requested to link you as ' +
          linkName+'. Respond !linkconfirm <i>accept/deny</i>.'
        )
      }
    })

    return true;
  },

  'linkconfirm': (opt, send, services) => {
    let sourceNick = send.data.nick
    let linkreq    = global.linkRequests.users[sourceNick];

    // If not accept, fail.
    if(opt[1] !== 'accept') {
      global.linkRequests.users[sourceNick] = undefined;
      return send.send('link::CONFIRM '+sourceNick+' Has been denied.')
    }

    // Verify they have an actual link request.
    if(!linkreq) {
      debug('linkconfirm', linkreq)
      return send.send('link::CONFIRM '+sourceNick+' has no pending request.')
    }

    // Make sure the source is the same.
    if(linkreq.remote.source !== send.data.source) {
      debug('link', linkreq.remote.source, '?', send.data.source);
      return send.send('link::CONFIRM '+sourceNick+' request is not valid on this service.');
    }

    // Send global notice.
    services.senders.forEach(sender => {
      sender.send('<b><i>NOTICE</i></b> <b>'+sourceNick+'</b> is now known as <b>'+linkreq.name+'</b>')
    })

    decache('../usercache.json');
    let usercache = require('../usercache.json')

    // Verify integrity. TOOD: Fix this mess.
    if(!usercache[send.data.source]) usercache[send.data.source] = {};
    if(!usercache[linkreq.origin.source]) usercache[linkreq.origin.source] = {}

    // Mark opposite user as being ident.
    usercache[send.data.source][linkreq.origin.nick] = linkreq.name;
    usercache[linkreq.origin.source][send.data.nick] = linkreq.name;

    // Write the file contents.
    global.usercache = usercache;
    fs.writeFileSync(require('path').join(__dirname, '../usercache.json'), JSON.stringify(usercache), 'utf8')

    // Invalidate request.
    global.linkRequests.users[sourceNick] = undefined;
  },

  'whois': (opt, send) => {
    let source = send.data.source;
    let nick   = opt[1];

    let fail = () => {
      let msg = send.wrapFormatter('bold', nick) + 'doesn\'t go by a nickname, or doesn\'t exist';
      return send.send(msg);
    }

    if(!global.usercache[source]) {
      return fail()
    }

    let done = false;
    Object.keys(global.usercache[source]).forEach(key => {
      let name = global.usercache[source][key];

      debug('whois', 'process', key, name)

      if(name === nick && !done) {
        done = true;

        let bold_name = send.wrapFormatter('bold', nick);
        let bold_key  = send.wrapFormatter('bold', key);
        
        return send.send(bold_name+' is '+bold_key)
      }
    })

    if(!done) {
      return fail()
    }
  },

  /**
   * Return source according to bridge.
   **/
  'source': (opt, send) => {
    return send.send(send.data.source);
  },

  'help': (opt, send) => {
    if(send.data.source.indexOf('skype') !== -1) {
      return send.send(
'Hello! Here\'s a list of available commands: <br /><br /> \
  !<b>source</b>'+'&nbsp;'.repeat(12)  + 'get the logical source you\'re one. <br /> \
  !help'        + '&nbsp;'.repeat(16) + 'get help! <br /> \
  !<b>link</b>' + '&nbsp;'.repeat(17) + 'change your name, run !link for help. <br /> \
  !linkconfirm' + '&nbsp;'.repeat(5)  + 'accept a link request. <br /> \
  !<b>whois</b>'+ '&nbsp;'.repeat(11)  + 'get the name of a user <br /> \
  !ping' + '&nbsp;'.repeat(16) + 'pong!');
    }

    send.send('Hello! Here\'s a list of available commands:')
    send.send('  !source        get the logical source you\'re one.');
    send.send('  !help          get help!');
    send.send('  !link          change your name, run !link for help.');
    send.send('  !linkconfirm   accept a link request.');
    send.send('  !whois         get identity of a user.')
    send.send('  !ping          pong!');
  }
}
