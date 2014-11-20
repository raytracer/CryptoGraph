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
mongodb = require('mongodb');

var db = undefined,
	usersCol = undefined;



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
	usersCol.findOne({name: req.user}, function(err, result) {
		if (err || result === null) {
            res.json(false);
		} else {
			res.json(result);
		}
	});
});

app.post('/user/getpublickey', ensureAuthenticated, function(req, res){
	usersCol.findOne({name: req.body.name}, function(err, result) {
		if (err || result === null) {
            res.json(false);
		} else {
			var prunedResult = {
				n: result.n,
				e: result.e
			};

			res.json(prunedResult);
		}
	});
});

app.get('/login', function(req, res){
    res.render('login.html');
});

app.post('/login', function(req, res){
	var name = req.body.user;

	usersCol.findOne({name: name}, function(err, result) {
		if (err || result === null) {
            res.json(false);
		} else {
            crypto.pbkdf2(req.body.pass, result.salt, 1000, 512, function(err, dk) {
                if (dk.toString('hex') !== result.password) {
                    res.json(false);
                } else {
                    req.login(name, function(err) {});
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
        var user = {
			'name': req.body.user,
			'password': dk.toString('hex'),
			'salt': salt,
			'e': req.body.e,
			'n': req.body.n,
			'pem': req.body.pem
        };

		usersCol.insert(user, function(err, results) {
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
	if (usersCol === undefined) {
		res.json(false);
		return;
	}

	usersCol.findOne({name: req.user}, function(err, result) {
		if (err || result === null) {
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
var mongo_url = process.env.OPENSHIFT_MONGODB_DB_URL || "mongodb://localhost:27017/"

mongo_url += "cryptograph";

mongodb.MongoClient.connect(mongo_url, function(err, db_async) {
	if (!err) {
		db = db_async;	
		sockethandler.startPrimus(server, db);
		db.createCollection("users", function(err, col) {
			usersCol = col
		});
		db.createCollection("messages", function(err, col) {
		});
	}
});

var server_port = process.env.OPENSHIFT_NODEJS_PORT || 8000
var server_ip_address = process.env.OPENSHIFT_NODEJS_IP || '127.0.0.1'
server.listen(server_port, server_ip_address);
