'use strict';

var express = require('express'),
    app = express(),
    passport = require('passport'),
    LocalStrategy = require('passport-local').Strategy,
    sockethandler = require('./src/server/sockethandler');

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

passport.deserializeUser(function(id, done) {
  done(null, id);
});

app.get('/', ensureAuthenticated, function(req, res){
  res.render('stream.html', {id: req.user});
});

app.get('/user/getid', ensureAuthenticated, function(req, res){
  res.json(req.user);
});

app.post('/user/getdata', ensureAuthenticated, function(req, res){
  db.getNodeById(req.body.id, function(err, node) {
    res.json(node.data);
  });
});

app.post('/user/getpublickey', ensureAuthenticated, function(req, res){
  var data = {
      "props": {
          'name': req.body.name
      }
  };
  db.query('MATCH (u:user {name: {props}.name) RETURN u.n as n, u.e as e', data, function (err, results) {
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
  db.query('MATCH (u:user {name: {props}.name, password: {props}.password}) RETURN id(u) as id', data, function (err, results) {
    if (err || results.length < 1) {
        res.json(false);
    } else {
        req.login(results[0].id, function(err) {});
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
          'd': req.body.d,
          'n': req.body.n,
          'salt': req.body.salt,
          'iv': req.body.iv
      }
  };

  db.query('CREATE (u:user {props}) RETURN id(u) as id', data, function (err, results) {
    if (err || results.length < 1) {
        res.json(false);
    } else {
        req.login(results[0].id, function(err) {});
        res.json(results[0].id);
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
sockethandler.startPrimus(server);

server.listen(8000);
