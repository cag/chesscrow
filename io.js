// HACK: YUCK YUCK EW
// Speed up calls to hasOwnProperty
var hasOwnProperty = Object.prototype.hasOwnProperty;

function isEmpty(obj) {

    // null and undefined are "empty"
    if (obj == null) return true;

    // Assume if it has a length property with a non-zero value
    // that that property is correct.
    if (obj.length > 0)    return false;
    if (obj.length === 0)  return true;

    // Otherwise, does it have any properties of its own?
    // Note that this doesn't handle
    // toString and valueOf enumeration bugs in IE < 9
    for (var key in obj) {
        if (hasOwnProperty.call(obj, key)) return false;
    }

    return true;
}

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
    var hs = socket.handshake,
        cookie = hs.headers.cookie;
    debug('handshake: ' + JSON.stringify(hs));

    sessionFromCookie(cookie, function(err, s) {
        session = new Session(hs, s);

        new User({ id: session.passport.user }).fetch().then(function(user) {
            if(user) {
                debug('user ' + user.id + ' (' + user.get('username') + ') connected');

                if(!(user.id in activeUsers)) {
                    activeUsers[user.id] = { 'username': user.get('username'), 'activeCookies': {} };
                }
                activeUsers[user.id].activeCookies[cookie] = Date.now();
                
                io.emit('active users update', activeUsers);

                socket.on('ping', function() {
                    activeUsers[user.id].activeCookies[cookie] = Date.now();
                });

                socket.on('disconnect', function() {
                    delete activeUsers[user.id].activeCookies[cookie];
                    if(isEmpty(activeUsers[user.id].activeCookies)) {
                        delete activeUsers[user.id];
                    }

                    io.emit('active users update', activeUsers);
                    debug('user ' + user.id + ' (' + user.get('username') + ') disconnected');
                });

            } else debug("Could not find user " + session.passport.user);
        });

    });

});

}