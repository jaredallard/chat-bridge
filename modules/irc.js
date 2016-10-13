/**
 * Irc Bridge.
 *
 * @author Jared Allard <jaredallard@outlook.com>
 * @license MIT
 * @version 1.0.0
 **/

'use strict';

const irc     = require('irc');
const debug   = require('debug')('chat-bridge:modules:irc');

// Irc Colors.
require('irc-colors').global();

let that = null;

class Irc {
  constructor(config) {
    this.channel       = config.channel;
    this.clientinit    = config.init;
    this.config        = config;

    this.ident = 'irc'+this.channel;

    that = this;

    debug('constructor', 'channel', this.channel);
    debug('constructor', 'nick',    config.nick);
  }

  connect() {
    this.client  = new irc.Client(
      this.config.server,
      this.config.nick,
      this.config.irc_opts
    );

    this.client.on('error', err => {
      debug('err', err);
    });

    this.client.on('raw', msg => {
      if(msg.command === 'PONG') return; // No.
      debug('raw', msg.command, msg.args[1] || msg.args[0])
    })
  }

  ready(func) {
    this.client.on('registered', func);
  }

  /**
   * Authenticate *this* instance.
   *
   * @param {Function} done - finished.
   * @returns {undefined} use done
   **/
  init(done) {
    if(!done) done = () => {};

    this.client.join(this.config.channel)
    if(!this.clientinit) return done();

    this.clientinit(this.config, this.client, function() {
      return done();
    });
  }

  /**
   * Send a message
   *
   * @param {String} message - message to send.
   * @returns {node-irc#client.say} response
   **/
  send(message) {
    let msg = message;

    if(msg.content) {
      debug('send', 'message is an object');
      msg = message.content;
    }

    debug('send', msg);
    that.client.say(that.channel, msg);
  }

  /**
   * Wrap text in type formatter.
   *
   * @param {String} type - type of format, i.e bold, italic.
   * @param {Array} text - arry of text, or string.
   *
   * @returns {String} formatted text, or unformatted if unsupported.
   **/
  wrapFormatter(type, ...text) {
    let formatters = {

    };

    const proc_text = text.join(' ');
    debug('wrapFormatter', 'got', text);
    debug('wrapFormatter', 'corrected:', proc_text);

    if(!formatters[type]) {
      debug('wrapFormatter', type, 'not found');
      return proc_text;
    }

    let formatted = formatters[type].replace('{{text}}', proc_text);
    debug('wrapFormatter', 'formatted:', formatted);

    // Return formatted text.
    return formatted;
  }

  /**
   * Special send for forwarding.
   *
   * @param {String} nick - nick name that sent message.
   * @param {String} message - message they sent.
   * @param {String} source - source of the message.
   *
   * @returns {this#send} response
   **/
  forward(nick, message, source) {
    if(nick === that.config.nick) return debug('forward:ignore', 'from us:', nick);
    if(that.config.ignore_nicks && that.config.ignore_nicks.indexOf(nick) !== -1) {
      return debug('forward:ignore', 'in block list', nick);
    }

    let prefix = nick.irc.green()+'@'+source.irc.cyan()+': ';
    debug('forward', prefix, message);

    that.send(prefix+message);
  }

  /**
   * Wrapper to execute CB on recieved message.
   *
   * @param {Function} func - callback.
   * @returns {node-irc#client.on} response
   **/
  recieved(func) {
    that.client.on('message'+that.channel, (nick, text) => {
      debug('recieved', 'message')
      return func(nick, text, that.metadata)
    })
  }
}

// Export
module.exports = {
  version: 1,            // Module Type Version
  instances: Infinity,   // Number of allowed instances using the same credentials.
  class: Irc             // Class to instance.
};
