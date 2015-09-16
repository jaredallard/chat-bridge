/**
 * A Simple skype-to-irc relay.
 *
 * @author Jared Allard <jaredallard@outlook.com>
 * @version 0.0.1
 * @license MIT
 **/

// std reqs
var rqst = require('request'),
    irc  = require('irc');

// config
var config = require('./cfg/config.json');

// local plugins
var skype = require('./libs/skype.js');

skype.connect(config.skype.username, config.skype.password)

/** Connect to IRC **/
var client = new irc.Client('irc.pony.so', 'ffrelay', {
    channels: ['#ff'],
    secure: true,
    port: 6697,
    selfSigned: true
});

client.addListener('message', function (from, to, message) {
  if(to === '#ff') {
    console.log('forward message from:', from, 'to skype');
  }
});

client.addListener('error', function(message) {
    console.log('error:', message);
});

client.addListener('join#ff', function() {
  console.log('relay status ==> up');
});

function onSkypeMessage(from, message) {
  client.say('#ff', from+': '+message);
}
