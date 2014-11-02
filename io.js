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

        new User({ id: session.passport.user }).fetch({
            withRelated: ['games_as_white', 'games_as_black']
        }).then(function(user) {
            if(user) {
                var games_as_white = user.related('games_as_white'),
                    games_as_black = user.related('games_as_black');

                function registerUserInGameRoom(game) {
                    socket.join('game ' + game.id);
                }

                games_as_white.each(registerUserInGameRoom);
                games_as_black.each(registerUserInGameRoom);

                function filterGameFields(game, is_white) {
                    var escrow_obj = game.get(is_white ? 'white_escrow' : 'black_escrow'),
                        wager_set = game.get('wager_set'),
                        ret = {
                            id: game.id,
                            white_id: game.get('white_id'),
                            black_id: game.get('black_id'),
                            white_wager: game.get('white_wager'),
                            black_wager: game.get('black_wager'),
                            pgn: game.get('pgn'),
                            wager_set: wager_set,
                            active: game.get('active'),
                            is_white: is_white
                        };
                    if(wager_set) {
                        ret.escrow_addr = escrow_obj.address;
                    }
                    return ret;
                }

                var all_games = games_as_white.map(function(game) { return filterGameFields(game, true); }).concat(
                    games_as_black.map(function(game) { return filterGameFields(game, false); }));
                all_games.sort(function(a, b) { return a.id - b.id; });

                socket.emit('linked session to user', {
                    'user_id': user.id,
                    'games': all_games,
                });
                socket.on('user activated', function() {

                    if(!(user.id in activeUsers)) {
                        activeUsers[user.id] = { 'username': user.get('username'), 'activeCookies': {} };
                    }
                    activeUsers[user.id].activeCookies[cookie] = Date.now();
                    debug('user ' + user.id + ' (' + user.get('username') + ') connected');

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

                });

            } else debug("Could not find user " + session.passport.user);
        });

    });

});

}