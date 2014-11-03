var bcrypt = require('bcrypt');

module.exports = function(bookshelf) {

    var User = bookshelf.Model.extend({

        tableName: 'users',
        
        validatePassword: function(password, callback) {
            bcrypt.compare(password, this.get('password_hash'), callback);
        },

        games_as_white: function() { return this.hasMany('Game', 'white_id'); },
        games_as_black: function() { return this.hasMany('Game', 'black_id'); },

    }, {

        register: function(username, password, callback) {
            bcrypt.hash(password, 10, function(err, hash) {
                new User({ username: username, password_hash: hash })
                    .save()
                    .then(function(user) {
                        if(callback) callback(null, user);
                    });
            });
        }

    });

    return bookshelf.model('User', User);

};