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
   **/
  send(message) {
    that.client.say(that.channel, message);
  }

  /**
   * Special send for forwarding.
   *
   * @param {String} that - this
   * @param {String} nick - nick name that sent message.
   * @param {String} message - message they sent.
   **/
  forward(nick, message, source) {
    if(nick === that.config.nick) return debug('forward:ignore', 'from us:', nick);
    if(that.config.ignore_nicks && that.config.ignore_nicks.indexOf(nick) !== -1) {
      return debug('forward:ignore', 'in block list', nick);
    }

    that.send(nick+'@'+irc.colors.wrap('dark_blue', source)+': '+message);
  }

  /**
   * Wrapper to execute CB on recieved message.
   *
   * @param {Object} that - this.
   * @param {Function} func - callback.
   **/
  recieved(func) {
    that.client.on('message'+that.channel, (nick, text, message) => {
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
