module.exports = {

  /**
   * PING, PONG
   **/
  "ping": (opt, send) => {
    send.send('pong')

    return true;
  },

  /**
   * Link a user@source to user@source and display their name as linkName.
   **/
  "link": (opt, send) => {
    let linkTarget = opt[1];
    let linkName   = opt[2];

    // Service we're one.
    let linkSource = send.data.nick+'@'+send.data.source;

    let linkTargetSplit = linkTarget.split("@");
    if(!linkTargetSplit[0] || !linkTargetSplit[1]) {
      return send.send('link::invalid syntax: expected name@service for linkTarget')
    }

    send.send('link username: '+linkSource+' to '+linkTarget+' as '+linkName)

    return true;
  },

  /**
   * Return source according to bridge.
   **/
  "source": (opt, send) => {
    return send.send(send.data.source);
  }
}
