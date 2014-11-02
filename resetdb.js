var debug = require('debug')('chesscrow');
var bcrypt = require('bcrypt');

module.exports = function(knex, User, Game) {
    debug('resetting db like an idiot');

    knex.schema.dropTableIfExists('users').then(function() {

    knex.schema.createTable('users', function(t) {
        t.increments();
        t.string('username').unique();
        t.string('password_hash');
        t.timestamps();
    }).then(function() {

    User.register('alan', 'bacon', function() {

    User.register('foo', 'bar', function() {
    debug('initialized users table');

    knex.schema.dropTableIfExists('games').then(function() {
        
    knex.schema.createTable('games', function(t) {
        t.increments();
        t.integer('white_id');
        t.integer('black_id');
        t.integer('white_wager');
        t.integer('black_wager');
        t.json('white_escrow');
        t.json('black_escrow');
        t.text('pgn');
        t.boolean('white_wager_lock');
        t.boolean('black_wager_lock');
        t.boolean('wager_set');
        t.boolean('active');
        t.timestamps();
    }).then(function() {

    Game.create(1, 2, function() {

    Game.create(2, 1);
    debug('initialized games table');

    }); }); }); }); }); }); });

}