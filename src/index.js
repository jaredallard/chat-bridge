/**
 * A Simple skype-to-irc relay.
 *
 * @author Jared Allard <jaredallard@outlook.com>
 * @version 0.0.1
 * @license MIT
 **/

// config
var config = require('./cfg/config.json');

// local plugins
var skype = require('./libs/skype.js'),
    irc = require('./libs/irc.js');

skype.connect(config.skype.username, config.skype.password, config.skype.room);

/** Connect to IRC **/
irc.init(config.irc.username);

irc.events.on('irc_message', function(data) {
  console.log(data);
  skype.send(config.skype.room, data.from+': '+data.content);
})

skype.events.on('skype_message', function(data) {
  irc.send('#ff', data.from+": "+data.content);
})
