var express = require('express');
var router = express.Router();
var passport = require('passport');
var debug = require('debug')('chesscrow');

module.exports = function(User) {

function renderHomePage(req, res) {
    debug('render home page');
    res.render('home', { title: 'Home' });
}

/* GET home page. */
router.get('/', function(req, res) {
    if(req.user) {
        renderHomePage(req, res);
    }
    else {
  		res.render('index', { title: 'Express' });
    }
});

router.post('/',
    passport.authenticate('local', { failureRedirect: '/' }),
    renderHomePage);

router.get('/logout', function(req, res) {
    req.logout();
    res.redirect('/');
});

router.post('/register', function(req, res, next) {
    var username = req.body.username,
        password = req.body.password,
        confirm_password = req.body.confirm_password;

    if(password === confirm_password) {
        User.register(username, password, function(err, user) {
            if(err) {
                return next(err);
            } else if(!user) {
                return res.redirect('/');
            } else {
                req.login(user, function(err) {
                    if(err) { return next(err); }
                    return res.redirect('/');
                });
            }
        })
    } else {
        res.redirect('/');
    }
});

return router;

}