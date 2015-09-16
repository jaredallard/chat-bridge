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

console.log(config.skype.username, config.skype.password)

skype.connect(config.skype.username, config.skype.password)

/** Connect to IRC **/
irc.init(config.irc.username);
