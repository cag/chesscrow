var bcrypt = require('bcrypt');
var chessjs = require('chess.js');
var blockCypher = require('./block_cypher');


var knex = require('knex')({
    client: 'pg',
    connection: process.env.DATABASE_URL
});
var bookshelf = require('bookshelf')(knex);

var express = require('express');
var session = require('express-session'),
    sessionStore = new session.MemoryStore();
var passport = require('passport'),
    LocalStrategy = require('passport-local').Strategy;
var path = require('path');
var favicon = require('serve-favicon');
var logger = require('morgan');
var cookieParser = require('cookie-parser');
var bodyParser = require('body-parser');

// set up models
var Game = require('./models/game')(bookshelf, chessjs, blockCypher),
    User = require('./models/user')(bookshelf, Game);

// set up routes
var routes = require('./routes/index')(User);
var users = require('./routes/users');

var app = express();

// register models with app
app.set('user model', User)
// TODO: migrations
require('./resetdb')(knex, User, Game);

// middleware setup
passport.use(new LocalStrategy(
    function(username, password, done) {
        new User({ username: username }).fetch().then(function(user) {
            if (!user) {
                return done(null, false, { message: 'Incorrect username.' });
            }
            user.validatePassword(password, function(err, res) {
                if(err) {
                    console.error(err);
                    return done(null, false, { message: err });
                }
                if(res) {
                    return done(null, user);
                }
                return done(null, false, { message: 'Incorrect password.' });
            });
        });
    }
));

passport.serializeUser(function(user, done) {
    done(null, user.get('id'));
});

passport.deserializeUser(function(id, done) {
    new User({ id: id }).fetch().then(function(user) {
        done(null, user);
    });
});


// view engine setup
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'jade');

app.use(favicon(path.join(__dirname, 'public', 'favicon.ico')));
app.use(logger('dev'));
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: false }));
app.use(cookieParser());
app.use(require('less-middleware')(path.join(__dirname, 'public')));
app.use(express.static(path.join(__dirname, 'public')));

app.set('session secret', 'keyboard cat');
app.use(session({ name: 'connect.sid',
                  store: sessionStore,
                  secret: app.get('session secret'), 
                  saveUninitialized: true,
                  resave: true }));
app.set('session store', sessionStore);

app.use(passport.initialize());
app.use(passport.session());

app.use('/', routes);
app.use('/users', users);

// catch 404 and forward to error handler
app.use(function(req, res, next) {
    var err = new Error('Not Found');
    err.status = 404;
    next(err);
});

// error handlers

// development error handler
// will print stacktrace
if (app.get('env') === 'development') {
    app.use(function(err, req, res, next) {
        res.status(err.status || 500);
        res.render('error', {
            message: err.message,
            error: err
        });
    });
}

// production error handler
// no stacktraces leaked to user
app.use(function(err, req, res, next) {
    res.status(err.status || 500);
    res.render('error', {
        message: err.message,
        error: {}
    });
});


module.exports = app;
