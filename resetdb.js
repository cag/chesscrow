var bcrypt = require('bcrypt');

module.exports = function(knex, User) {

    knex.schema.dropTableIfExists('users').then(function() {
        knex.schema.createTable('users', function(t) {
            t.increments();
            t.string('username').unique();
            t.string('password_hash');
            t.timestamps();
        }).then(function() {
            User.register('alan', 'bacon');
        });
    });

}