module.exports = function(bookshelf, chessjs, blockCypher) {
    
    var Game = bookshelf.Model.extend({
        tableName: 'games',

        setWager: function(callback) {
            if(this.get('wager_set') && callback) callback('wager for game ' + this.id + ' already set');
            else {
                this.save({ wager_set: true }).then(function(game) {
                    if(callback) {
                        if(game) callback(null, game);
                        else callback('error occurred while setting wager for game ' + this.id)
                    }
                });
            }
        },
    }, {

        create: function(white_id, black_id, callback) {
            new User({ id: white_id }).fetch().then(function(white) {
                if(white) {
            new User({ id: black_id }).fetch().then(function(black) {
                if(black) {
            blockCypher.createAddress(function(err, white_escrow) {
                if(err && callback) callback('error while creating white escrow: ' + err);
                else {
            blockCypher.createAddress(function(err, black_escrow) {
                if(err && callback) callback('error while creating black escrow: ' + err);
                else {
                    new Game({
                        white_id: white_id,
                        black_id: black_id,
                        white_wager: 0,
                        black_wager: 0,
                        white_escrow: white_escrow,
                        black_escrow: black_escrow,
                        pgn: chessjs.Chess().pgn(),
                        wager_set: false,
                        active: false })
                    .save()
                    .then(function(game) {
                        if(callback) callback(null, game);
                    });
                }
            });
                }
            });
                } else {
                    if(callback) callback('could not find user ' + black_id + ' for black');
                }
            });
                } else {
                    if(callback) callback('could not find user ' + white_id + ' for white');
                }
            });
        }

    });

    return Game;
};