/**
 * Available Comamnds
 *
 * @author Jared Allard <jaredallard@outlook.com>
 * @license MIT
 * @version 1.0.0
 **/

const decache = require('decache');
const debug   = require('debug')('chat-bridge:commands');

const that = {
  process: (string) => {
    let opts   = string.split(' ');
    let command = opts[0].replace(/!/, '');

    // Invalidate cache each time.
    // decache('./cmd.js');
    that.commands = require('./cmd.js');

    debug('process', 'looking for "'+command+'"')
    debug('process', 'available commands:', that.commands);

    if(that.commands[command]) {
      // Remove the commands from the arg.
      opts.unshift();

      debug('process', 'found', command);

      // execute the comamnd function.
      return {
        func: that.commands[command],
        opts: opts
      }
    }

    return false;
  },
}


module.exports = that;
