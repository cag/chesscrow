module.exports = function(bookshelf, blockCypher) {
    
    var User = bookshelf.model('User');

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

        white_player: function() { return this.belongsTo(User, 'white_id'); },
        black_player: function() { return this.belongsTo(User, 'black_id'); },

    }, {

        states: {
            NOT_STARTED: 0,
            GOING: 1,
            WHITE_WIN: 2,
            BLACK_WIN: 3,
            STALEMATE: 4,
        },

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
                        white_escrow: white_escrow,
                        black_escrow: black_escrow,
                        active: true })
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

    return bookshelf.model('Game', Game);
};