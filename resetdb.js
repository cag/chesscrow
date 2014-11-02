var debug = require('debug')('chesscrow');
var bcrypt = require('bcrypt');

module.exports = function(knex, User) {
    debug('resetting db like an idiot');

    knex.schema.dropTableIfExists('users').then(function() {
        knex.schema.createTable('users', function(t) {
            t.increments();
            t.string('username').unique();
            t.string('password_hash');
            t.timestamps();
        }).then(function() {
            User.register('alan', 'bacon');
            debug('initialized users table');

        });
    });

    knex.schema.dropTableIfExists('games').then(function() {
        knex.schema.createTable('games', function(t) {
            t.increments();
            t.integer('user_id');
            t.timestamps();
        }).then(function() {
            debug('initialized games table');
        });
    });

}