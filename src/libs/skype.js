/**
 * Skype library utilizing the Web Skype API.
 *
 * Heavily based on: https://github.com/sdimkov/hubot-skype-web
 *
 * @author Jared Allard <jaredallard@outlook.com>
 * @version 0.0.1
 * @license MIT
 **/

var request = require('request'),
    phantom = require('phantom'),
    escape  = require('escape-html'),
    util    = require('util'),
    events  = require('events'),
    fs      = require('fs');

var skype = {
  events: new events.EventEmitter(),

  /**
   * Connect to skype, uses skype credentials.
   *
   * @param {string} username - bot's username.
   * @param {string} password - bot's password.
   **/
  connect: function(username, password, room) {
    this.username = username;
    this.password = password;
    this.room = room;
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
    this.sendQueues = {};
    this.headers = false;
    this.eventsCache = [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0];
    this.reconnectInterval = 240;

    var phantomOptions, self;
    self = this;
    options = {};
    phantomOptions = {};

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
                // OVERLY DEBUG console.log('Captured poll request: \n' + util.inspect(request));
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

        console.log(self.username, self.password);

        page.set('settings.userAgent', 'Mozilla/5.0 (Windows NT 6.1) AppleWebKit/537.36 ' + '(KHTML, like Gecko) Chrome/41.0.2228.0 Safari/537.36');
        return page.open('https://web.skype.com', function(status) {
          return setTimeout((function() {
            page.injectJs('./inject/Blob.js'); // phantom 1.x doesn't support blob.
            return page.evaluate((function(username, password) {
              document.getElementById('username').value = username;
              document.getElementById('password').value = password;
              return document.getElementById('signIn').click();
            }), (function() {}), self.username, self.password);
          }), 5000);
        });
      });
    }), phantomOptions);
  },

  pollLoop: function() {
    console.log('EMIT', 'skype_connected');
    this.events.emit('skype_connected');
    console.log('INFO', 'connected to skype');
    this.pollRequest();
  },

  sendRequest: function(user, msg) {
    var now, self;
    self = this;
    now = new Date().getTime();
    this.headers.ContextId = now;
    this.sendBody.clientmessageid = now;
    this.sendBody.content = escape(msg);
    return request.post({
      url: this.sendUrl(user),
      headers: this.headers,
      body: this.sendBody,
      gzip: true,
      json: true
    }, function(error, response, body) {
      var ref1;
      if ((ref1 = response.statusCode) !== 200 && ref1 !== 201) {
        console.error("Send request returned status " + (response.statusCode + ". user='" + user + "' msg='" + msg + "'"));
      }
      if (error) {
        console.error("Send request failed: " + error);
      }
    });
  },

  onEventMessage: function(msg) {
    var ref1, ref2, ref3, user, userID;
    if (msg.resourceType === 'NewMessage' && ((ref1 = (ref2 = msg.resource) != null ? ref2.messagetype : void 0) === 'Text' || ref1 === 'RichText')) {
      userID = msg.resource.from.split('/contacts/')[1].replace('8:', '');

      if (userID === this.username) {
        return;
      }

      user = {}
      user.name = userID;
      user.room = msg.resource.conversationLink.split('/conversations/')[1];

      if(user.room !== this.room) {
        return; // not in our room.
      }

      // DEBUG: console.log(msg);

      if (user.room.indexOf('19:') !== 0) {
        console.debug('Prefix personal message from ' + user.name);
        msg.resource.content = msg.resource.content;
      }

      this.events.emit('skype_message', {
        from: user.name,
        content: msg.resource.content
      })
    }
  },

  pollRequest: function() {
    var self;
    self = this;
    this.headers.ContextId = new Date().getTime();
    return request.post({
      url: this.pollUrl,
      headers: this.headers,
      gzip: true
    }, function(error, response, body) {
      var err, i, len1, message, ref1;
      if (error) {
        console.error("Poll request failed: " + error);
      } else { // request handles JSON?
        body = JSON.parse(body);

        if (body.eventMessages) {
          ref1 = body.eventMessages;
          for (i = 0, len1 = ref1.length; i < len1; i++) {
            message = ref1[i];
            self.onEventMessage(message);
          }
        } else if (body.errorCode) {
          console.error("Poll response error " + body.errorCode + ": " + body.message);
        } else {
          // DEBUG: console.error("Unexpected poll response body: ", body);
        }
      }

      return self.pollRequest();
    });
  },

  copyHeaders:  function(request) {
    var backup, header, i, len1, ref1, self;
    this.headers = {};
    ref1 = request.headers;
    for (i = 0, len1 = ref1.length; i < len1; i++) {
      header = ref1[i];
      this.headers[header.name] = header.value;
    }
    delete this.headers['Content-Length'];
    this.headers['Host'] = 'client-s.gateway.messenger.live.com';
    this.headers['Connection'] = 'keep-alive';
    this.headers['Accept-Encoding'] = 'gzip, deflate';
    self = this;
    backup = JSON.stringify({
      expire: new Date(new Date().getTime() + self.reconnectInterval * 60 * 1000),
      headers: self.headers
    });
    return fs.writeFile('hubot-skype-web.backup', backup, function(err) {
      if (err) {
        return console.error('IO error while storing ' + 'Skype headers to disc:' + err);
      } else {
        return self.pollLoop();
      }
    });
  },

  /**
   * Send Message
   *
   * @param {string} to - who to send it too (or room ID);
   * @param {string} message - message contents
   **/
  send: function(to, message) {
    this.sendRequest(to, message);
  }
};

module.exports = skype;
