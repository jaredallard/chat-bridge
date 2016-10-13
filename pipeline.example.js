'use strict';

module.exports = {
  sentry: {
    enabled: false,
    DSN: ''
  },
  pipeline: [
    {
      method: 'both',
      module: 'irc',
      config: {
        channel:       '#bridgetest',
        server:        'weber.freenode.net',
        nick:          process.env.IRC_TEST_NICK,
        irc_opts: {
          port:        6697,
          secure:      true,
          userName:    process.env.IRC_TEST_USERNAME,
          password:    process.env.IRC_TEST_PASSWORD,
        },
        ignore_nicks: ['ffbrigetest']
      },
    },

    {
      method: 'both',
      module: 'skype',
      config: {
        microsoft: true,
        room:           process.env.SKYPE_TEST_GROUP,
        nick:           process.env.SKYPE_TEST_NICK,
        display_name:   process.env.SKYPE_TEST_DISPLAYNAME,
        username:       process.env.SKYPE_TEST_EMAIL,
        password:       process.env.SKYPE_TEST_PASSWORD
      }
    }
  ]
}
