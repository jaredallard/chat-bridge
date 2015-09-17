/**
 * IRC aspect
 *
 * @author Jared Allard <jaredallard@outlook.com>
 * @license MIT
 **/

var irc = require('irc'),
    events = require('events');

var irc_obj = {
  events: new events.EventEmitter(),
  init: function(username) {
    var self = this;

    var client = new irc.Client('irc.pony.so', username, {
        channels: ['#ff'],
        secure: true,
        port: 6697,
        selfSigned: true
    });

    client.addListener('message', function (from, to, message) {
      if(to === '#ff') {
        console.log('forward message from:', from, 'to skype');
        self.events.emit('irc_message', {
          from: from,
          content: message
        });
      }
    });

    client.addListener('error', function(message) {
        console.log('error:', message);
    });

    client.addListener('join#ff', function() {
      console.log('relay status ==> up');
      self.events.emit('irc_connected');
    });

    this.client = client;
  },

  send: function(channel, message) {
    this.client.say(channel, message)
  }
}

module.exports = irc_obj;
