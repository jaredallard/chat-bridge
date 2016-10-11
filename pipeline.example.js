'use strict';

module.exports = {
  command: { // to come...
    identity: ""
  },
  sentry: { // https://sentru.io
    enabled: true,
    DSN: ''
  },
  pipeline: [
    {
      method: 'both', // send, recieve, or both
      module: "irc",
      config: {
        channel: '#fillies',
        server: "weber.freenode.net",
        nick: "", // must be bot nick
        irc_opts: { // see node-irc opts
          port: 6697, // 6697 for secure 6667 for not
          sasl: true,
          secure: true,
          userName: "",
          password: "",
        },
        init: (config, client, done) => {
          client.say('chan', 'hello im up!');

          return done();
        }
      },
    },

    {
      method: 'both',
      module: "skype",
      config: {
        microsoft: true,
        room: '19:8bce7a3a99d3476c9128d894eda92bb9@thread.skype',
        nick: 'live:jaredallard_2', // must be skype username.
        display_name: 'ff bridge',  // must be skype bot display name for compat
        username: "",
        password: ""
      }
    }
  ]
}
