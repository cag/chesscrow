var bcrypt = require('bcrypt');

module.exports = function(bookshelf, Game) {

    var User = bookshelf.Model.extend({
        tableName: 'users',
        
        validatePassword: function(password, callback) {
            bcrypt.compare(password, this.get('password_hash'), callback);
        },

        games: function() { return bookshelf.hasMany(Game); }

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

    return User;

};