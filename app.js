'use strict';

var express = require('express'),
app = express(),
compression = require('compression'),
bodyParser = require('body-parser'),
cookieParser = require('cookie-parser'),
session = require('express-session'),
crypto = require('crypto'),
passport = require('passport'),
LocalStrategy = require('passport-local').Strategy,
sockethandler = require('./src/server/sockethandler'),
jwt = require('jsonwebtoken'),
fs = require('fs'),
neo4j = require('neo4j');

var dbcredentials = fs.readFileSync('dbcredentials.conf').toString();
dbcredentials = dbcredentials.slice(0, dbcredentials.length - 1);
var db = new neo4j.GraphDatabase(dbcredentials);


app.use(compression());
app.set('views', __dirname + '/public/views');
app.engine('html', require('ejs').renderFile);
app.use(express.static(__dirname + '/public'));
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({extended: true}));
app.use(cookieParser());
app.use(session({ secret: 'keyboard cat', saveUninitialized: true,
                 resave: true}));
// Initialize Passport!  Also use passport.session() middleware, to support
// persistent login sessions (recommended).
app.use(passport.initialize());
app.use(passport.session());


passport.serializeUser(function(user, done) {
    done(null, user);
});

passport.deserializeUser(function(name, done) {
    done(null, name);
});

app.get('/', ensureAuthenticated, function(req, res){
    res.render('stream.html');
});

app.get('/user/getname', ensureAuthenticated, function(req, res){
    var response = {
        'name': req.user,
        'token': jwt.sign({'name': req.user}, 'debug_secret')
    }

    res.json(response);
});

app.get('/user/getdata', ensureAuthenticated, function(req, res){
    var data = {
        "props": {
            'name': req.user
        }
    };
    db.query('MATCH (u:user {name: {props}.name}) RETURN u', data, function (err, results) {
        if (err || results.length < 1) {
            res.json(false);
        } else {
            res.json(results[0].u._data.data);
        }
    });
});

app.post('/user/getpublickey', ensureAuthenticated, function(req, res){
    var data = {
        "props": {
            'name': req.body.name
        }
    };
    db.query('MATCH (u:user {name: {props}.name}) RETURN u.n as n, u.e as e', data, function (err, results) {
        if (err || results.length < 1) {
            res.json(false);
        } else {
            res.json(results[0]);
        }
    });
});

app.get('/login', function(req, res){
    res.render('login.html');
});

app.post('/login', function(req, res){
    var data = {
        "props": {
            'name': req.body.user
        }
    };

    db.query('MATCH (u:user {name: {props}.name}) RETURN u.name as name, u.password as password, u.salt as salt', data, function (err, results) {
        if (err || results.length < 1) {
            res.json(false);
        } else {
            var salt = results[0].salt;
            crypto.pbkdf2(req.body.pass, salt, 1000, 512, function(err, dk) {
                if (dk.toString('hex') !== results[0].password) {
                    res.json(false);
                } else {
                    req.login(results[0].name, function(err) {});
                    res.json(true);
                }
            });
        }
    });
});

app.get('/user/create', function(req, res){
    res.render('create.html');
});

app.post('/user/create', function(req, res){
    var salt = crypto.randomBytes(128).toString('base64');
    crypto.pbkdf2(req.body.pass, salt, 1000, 512, function(err, dk) {
        var data = {
            "props": {
                'name': req.body.user,
                'password': dk.toString('hex'),
                'salt': salt,
                'e': req.body.e,
                'n': req.body.n,
                'pem': req.body.pem
            }
        };

        db.query('CREATE (u:user {props}) RETURN u.name as name', data, function (err, results) {
            if (err || results.length < 1) {
                res.json(false);
            } else {
                req.login(results[0].name, function(err) {});
                res.json(results[0].name);
            }
        });
    });


});

app.post('/user/exists', function(req, res){
    var data = {
        "props": {
            'name': req.user
        }
    };
    db.query('MATCH (u:user {name: {props}.name}) RETURN u', data, function (err, results) {
        if (err || results.length < 1) {
            res.json(false);
        } else {
            res.json(true);
        }
    });
});


function ensureAuthenticated(req, res, next) {
    if (req.isAuthenticated()) { return next(); }
    res.redirect('/login');
}

var server = require('http').createServer(app);
sockethandler.startPrimus(server, db);

server.listen(8000);
