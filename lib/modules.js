/**
 * Module Abstractor.
 *
 * @author Jared Allard <jaredallard@outlook.com>
 * @license MIT
 **/

'use strict';

const path  = require('path');
const debug = require('debug')('chat-bridge:modules');
const fs    = require('fs');

let Loaded = {
  created: Date.now(),
  modules: {}
}

class Modules {
  constructor() {

  }

  /**
   * Scan a dir and load the modules in it.
   *
   * @param {String} dir - dir to load from.
   * @returns {Array} of modules just inserted: { path: , name: }
   **/
  scan(dir) {
    let isAbsolute = path.isAbsolute(dir);
    let files = fs.readdirSync(dir);
    files.forEach(file => {
      // Append the path.
      file = path.join(dir, file);

      // Fix for non-absolute paths.
      if(!isAbsolute) {
        file = './' + file.replace(/^[/\\]/g, ''); // remove front / or \
      }

      debug('scan', 'load', file);

      this.load(file);
    })
  }

  /**
   * Load a module into the loaded modules table.
   * Name is determined by the basename of the file.
   *
   * @param {String} module - module path.
   * @returns {String} name of the module loaded.
   **/
  load(module) {
    // Get the basename of the file.
    let name = path.parse(module).name;

    // load from base, not from lib dir.
    if(!path.isAbsolute(module)) {
      module = path.join('../', module);
    }


    debug('load', module, 'as', name);

    // Insert into loaded modules table.
    Loaded.modules[name] = require(module)

    return name;
  }
}

module.exports = {
  class: Modules,
  loaded: Loaded
};
