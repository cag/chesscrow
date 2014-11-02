var debug = require('debug')('chesscrow');
var cookie = require('cookie'),
    cookieParser = require('cookie-parser');

var crypto = require('crypto');

module.exports = function(http, app) {

var io = require('socket.io')(http),
    Session = require('express-session').Session,
    sessionStore = app.get('session store');
    User = app.get('user model');

function sessionFromCookie(ck, callback) {
    var sessionID;
    if(ck) {
        var unsignedSessionID = cookie.parse(ck)['connect.sid'];
        sessionID = cookieParser.signedCookie(unsignedSessionID, app.get('session secret'));
        if(unsignedSessionID == sessionID) {
            return accept('Cookie is invalid.', false);
        }
    } else {
        return accept('No cookie transmitted.', false);
    }

    sessionStore.get(sessionID, callback);
}

io.set('authorization', function(data, accept) {
    sessionFromCookie(data.headers.cookie, function(err, session) {
        if(err) {
            accept(err, false);
        } else if(!session) {
            accept("Could not find session", false);
        } else {
            accept(null, true);
        }
    });
});

var activeUsers = {};

io.on('connection', function(socket) {
    var hs = socket.handshake;
    // debug('handshake: ' + JSON.stringify(hs));

    sessionFromCookie(hs.headers.cookie, function(err, s) {
        session = new Session(hs, s);

        new User({ id: session.passport.user }).fetch().then(function(user) {
            if(user) {
                debug('user ' + user.id + ' (' + user.get('username') + ') connected');
                activeUsers[user.id] = user.get('username');
                io.emit('active users update', activeUsers);

                socket.on('disconnect', function() {
                    delete activeUsers[user.id];
                    io.emit('active users update', activeUsers);
                    debug('user ' + user.id + ' (' + user.get('username') + ') disconnected');
                });

            } else debug("Could not find user " + session.passport.user);
        });

    });

});

}