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

module.exports = {

  /**
   * PING, PONG
   **/
  "ping": (opt, send) => {
    send.send('pong')

    return true;
  },

  /**
   * Link a user@source to user@source and display their name as linkName.
   **/
  "link": (opt, send, services) => {
    if(!opt[1] || !opt[2]) {
      return send.send('link::USAGE: name@service identifier')
    }

    let linkTarget = opt[1];
    let linkName   = opt[2];

    // Service we're one.
    let linkSource = send.data.nick+'@'+send.data.source;

    let linkTargetSplit = linkTarget.split("@");
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

  "linkconfirm": (opt, send, services) => {
    let sourceNick = send.data.nick
    let linkreq    = global.linkRequests.users[sourceNick];

    if(!linkreq) {
      debug('linkconfirm', linkreq)
      debug('linkconfirm', linkRequests)
      return send.send('link::CONFIRM '+sourceNick+' has no pending request.')
    }

    if(linkreq.remote.source !== send.data.source) {
      debug('link', linkreq.remote.source, '?', send.data.source);
      return send.send('link::CONFIRM '+sourceNick+' request is not valid on this service.');
    }

    services.senders.forEach(sender => {
      sender.send('link::NOTICE <b>'+sourceNick+'</b> is now known as <b>'+linkreq.name+'</b>')
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
  },

  "whois": (opt, send, services) => {
    let source = send.data.source;
    let nick   = opt[1];

    let fail = () => {
      return send.send('<b>'+nick+'</b> doesn\'t go by a nickname, or doesn\'t exist.');
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
        return send.send('<b>'+nick+'</b> is <b>'+key+'</b>')
      }
    })

    if(!done) {
      return fail()
    }
  },

  /**
   * Return source according to bridge.
   **/
  "source": (opt, send) => {
    return send.send(send.data.source);
  }
}
