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
    sessionStore = app.get('session store'),
    User = app.get('user model'),
    Game = app.get('game model');

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
    // debug('handshake: ' + JSON.stringify(hs));

    sessionFromCookie(cookie, function(err, s) {
        session = new Session(hs, s);

        new User({ id: session.passport.user }).fetch({
            withRelated: [
                'games_as_white.white_player', 'games_as_white.black_player',
                'games_as_black.white_player', 'games_as_black.black_player'
            ]
        }).then(function(user) {
            if(user) {
                var games_as_white = user.related('games_as_white'),
                    games_as_black = user.related('games_as_black');

                function registerUserInGameRoom(game) {
                    if(game.get('active'))
                        socket.join('game ' + game.id);
                }

                games_as_white.each(registerUserInGameRoom);
                games_as_black.each(registerUserInGameRoom);

                function filterGameFields(game, is_white) {
                    var white_wager_accepted = game.get('white_wager_accepted'),
                        black_wager_accepted = game.get('black_wager_accepted'),
                        escrow_obj = game.get(is_white ? 'white_escrow' : 'black_escrow');
                    
                    return {
                        id: game.id,
                        white_id: game.get('white_id'),
                        black_id: game.get('black_id'),
                        white_username: game.related('white_player').get('username'),
                        black_username: game.related('black_player').get('username'),
                        white_wager: game.get('white_wager'),
                        black_wager: game.get('black_wager'),
                        white_wager_accepted: white_wager_accepted,
                        black_wager_accepted: black_wager_accepted,
                        pgn: game.get('pgn'),
                        active: game.get('active'),
                        is_white: is_white,
                        escrow_addr: escrow_obj.address,
                    };
                }

                (function() {
                    var all_active_games =
                        games_as_white.where({ active: true }).map(function(game) { return filterGameFields(game, true); }).concat(
                        games_as_black.where({ active: true }).map(function(game) { return filterGameFields(game, false); }));
                    all_active_games.sort(function(a, b) { return a.id - b.id; });

                    socket.emit('linked session to user', {
                        'user_id': user.id,
                        'games': all_active_games,
                    });
                })();

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

                socket.on('game control', function(msg) {
                    debug('game control: ' + JSON.stringify(msg));

                    new Game({ id: msg.game_id, active: true }).fetch().then(function(game) {
                        if(game) {
                            var channel = io.to('game ' + msg.game_id);
                            if(msg.type === 'accept wager') {
                                if(game.get('white_id') === user.id) {
                                    game.save({ white_wager_accepted: true }).then(function() {
                                        channel.emit('update game', { game_id: game.id, white_wager_accepted: true });
                                    });
                                } else if(game.get('black_id') === user.id) {
                                    game.save({ black_wager_accepted: true }).then(function() {
                                        channel.emit('update game', { game_id: game.id, black_wager_accepted: true });
                                    });
                                }
                            } else if(msg.type === 'reject wager') {
                                game.save({ active: false }).then(function() {
                                    channel.emit('destroy game', { game_id: game.id });
                                });
                            }
                        }
                    });
                });

            } else debug("Could not find user " + session.passport.user);
        });

    });

});

}