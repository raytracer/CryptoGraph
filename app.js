'use strict';

var express = require('express'),
    app = express(),
    passport = require('passport'),
    LocalStrategy = require('passport-local').Strategy,
    sockethandler = require('./src/server/sockethandler'),
    jwt = require('jsonwebtoken');

var neo4j = require('neo4j');
var db = new neo4j.GraphDatabase('http://localhost:7474');


app.set('views', __dirname + '/public/views');
app.engine('html', require('ejs').renderFile);
app.use(express.static(__dirname + '/public'));
app.use(express.json());
app.use(express.urlencoded());
app.use(express.logger());
app.use(express.cookieParser());
app.use(express.methodOverride());
app.use(express.session({ secret: 'keyboard cat' }));
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
          'name': req.body.user,
          'password': req.body.pass
      }
  };
  db.query('MATCH (u:user {name: {props}.name, password: {props}.password}) RETURN u.name as name', data, function (err, results) {
    if (err || results.length < 1) {
        res.json(false);
    } else {
        req.login(results[0].name, function(err) {});
        res.json(true);
    }
  });
});

app.get('/user/create', function(req, res){
  res.render('create.html');
});

app.post('/user/create', function(req, res){
  var data = {
      "props": {
          'name': req.body.user,
          'password': req.body.pass,
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

app.post('/user/exists', function(req, res){
  res.json(false);
});


function ensureAuthenticated(req, res, next) {
  if (req.isAuthenticated()) { return next(); }
  res.redirect('/login');
}

var server = require('http').createServer(app);
sockethandler.startPrimus(server, db);

server.listen(8000);
