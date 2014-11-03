var debug = require('debug')('chesscrow');
var chessjs = require('chess.js');
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
        t.integer('white_wager').defaultTo(0);
        t.integer('black_wager').defaultTo(0);
        t.json('white_escrow');
        t.json('black_escrow');
        t.boolean('white_wager_accepted').defaultTo(false);
        t.boolean('black_wager_accepted').defaultTo(false);
        t.boolean('white_wager_funded').defaultTo(false);
        t.boolean('black_wager_funded').defaultTo(false);
        t.integer('game_state').defaultTo(Game.states.NOT_STARTED);
        t.text('pgn').defaultTo(chessjs.Chess().pgn());
        t.boolean('active');
        t.timestamps();
    }).then(function() {

    Game.create(1, 2, function() {

    Game.create(2, 1);

    debug('initialized games table');

    }); }); }); }); }); }); });

}