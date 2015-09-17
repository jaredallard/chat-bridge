/**
 * Skype library utilizing the Web Skype API.
 *
 * Heavily based on: https://github.com/sdimkov/hubot-skype-web
 *
 * @author Jared Allard <jaredallard@outlook.com>
 * @version 0.0.1
 * @license MIT
 **/

var rqst    = require('request'),
    phantom = require('phantom'),
    util    = require('util'),
    fs      = require('fs');

var skype = {
  /**
   * Connect to skype, uses skype credentials.
   *
   * @param {string} username - bot's username.
   * @param {string} password - bot's password.
   **/
  connect: function(username, password) {
    this.username = username;
    this.passsword = password;
    url = "https://client-s.gateway.messenger.live.com";
    this.pollUrl = url + "/v1/users/ME/endpoints/SELF/subscriptions/0/poll";
    this.sendUrl = function(user) {
      return url + "/v1/users/ME/conversations/" + user + "/messages";
    };
    this.sendBody = {
      messagetype: 'RichText',
      contenttype: 'text',
      content: ''
    };

    var phantomOptions, self;
    self = this;
    options = {};
    phantomOptions = {};

    options.error = function() {
      console.log(arguments);
    }

    options.success = function() {
      console.log(arguments);
    }

    // add weak opt to windows platform.
    if (process.platform.indexOf('win') !== -1) {
      phantomOptions.dnodeOpts = {
        weak: false
      };
    }

    // create phantom object.
    return phantom.create((function(ph) {
      return ph.createPage(function(page) {
        var errorTimer, requestsCount, success;
        errorTimer = setTimeout((function() {
          console.error('SkypeWeb adapter failed to login!');
          page.close();
          ph.exit(0);
          return options != null ? typeof options.error === "function" ? options.error() : void 0 : void 0;
        }), 50000);

        requestsCount = 0;
        success = false;

        // capture page nav
        page.set('onResourceRequested', function(request) {
          var method;

          if(request.method === 'POST') { // ignore anything else for debug
            method = 'POST';
            console.log(method, request.url.substr(0,70),'...');
          }

          if(request.method === 'GET') {
            method = 'GET '
            console.log(method, request.url.substr(0,70),'...');
          }

          var header, i, len1, ref1;
          if (request.url.indexOf('poll' > 0 && request.method === 'POST')) {
            ref1 = request.headers;
            for (i = 0, len1 = ref1.length; i < len1; i++) {
              header = ref1[i];
              if (header.name === 'RegistrationToken') {
                if (requestsCount++ < 5 || success) {
                  return;
                }
                page.close();
                ph.exit(0);
                clearTimeout(errorTimer);
                console.info('SkypeWeb adapter logged in successfully!');
                console.log('Captured poll request: \n' + util.inspect(request));
                self.copyHeaders(request);
                success = true;
                if (options != null) {
                  if (typeof options.success === "function") {
                    options.success();
                  }
                }
              }
            }
          } else {
            console.log('Skype during login: ' + request.url);
          }
        });

        page.set('settings.userAgent', 'Mozilla/5.0 (Windows NT 6.1) AppleWebKit/537.36 ' + '(KHTML, like Gecko) Chrome/41.0.2228.0 Safari/537.36');
        return page.open('https://web.skype.com', function(status) {
          return setTimeout((function() {
            return page.evaluate((function(username, password) {
              document.getElementById('username').value = username;
              document.getElementById('password').value = password;
              return document.getElementById('signIn').click();
            }), (function() {}), self.username, self.password);
          }), 5000);
        });
      });
    }), phantomOptions);
  }
};

module.exports = skype;
