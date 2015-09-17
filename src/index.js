/**
 * A Simple skype-to-irc relay.
 *
 * @author Jared Allard <jaredallard@outlook.com>
 * @version 0.0.1
 * @license MIT
 **/

var striptags = require('striptags'),
    fs        = require('fs'),
    Entities  = require('html-entities').XmlEntities;

entities = new Entities();

if(fs.existsSync('./cfg/users.json') === false) {
  fs.writeFileSync('./cfg/users.json', JSON.stringify({}), 'utf8');
}

// config
var config = require('./cfg/config.json'),
    users  = require('./cfg/users.json');

// local plugins
var skype = require('./libs/skype.js'),
    irc = require('./libs/irc.js');

function getNickname(username) {
  if(users[username] !== undefined && users[username] !== "") {
    return users[username];
  } else {
    return username; // fallback
  }
}

/** Connect to Skype **/
skype.connect(config.skype.username, config.skype.password, config.skype.room);

/** Connect to IRC **/
irc.init(config.irc.username);

irc.events.on('irc_message', function(data) {
  skype.send(config.skype.room, ':: '+data.from+' :: '+data.content);
})

skype.events.on('skype_connected', function() {
  irc.send('#ff', 'Established connection with Skype Forwarder.');
})

skype.events.on('skype_message', function(data) {
  var regex = /\!nickname [a-zA-Z0-9]+/g;
  if(regex.test(data.content)) {
    var match = data.content.match(regex);
    users[data.from] = match[0].replace('!nickname ', '');

    fs.writeFile('./cfg/users.json', JSON.stringify(users), 'utf8'); // send to disk.

    return; // don't display commands.
  }

  irc.send('#ff', ":: "+getNickname(data.from)+" :: "+entities.decode(striptags(data.content)));
})
