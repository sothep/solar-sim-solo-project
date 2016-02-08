var express = require('express');
var passport = require('passport');
var localStrategy = require('passport-local').Strategy;
var session = require('express-session');
var mongoose = require('mongoose');
var bodyParser = require('body-parser');

var SolarUser = require('../models/solar-user');
var index = require('./routes/index');
var register = require('./routes/register');
var solarAPI = require('./routes/solar');

var app = express();
app.use(express.static('server/public'));
app.use(session({
  secret: 'secret',
  key: 'user',
  resave: true,
  saveUninitialized: false,
  cookie: { maxAge: null, secure: false }
}));

app.use(bodyParser.json());
app.use(passport.initialize());
app.use(passport.session());

app.use('/auth', register);
app.use('/pvwatts5', solarAPI);
app.use('/', index);

var mongoURI = 'mongodb://localhost:27017/solar-test';
mongoose.connect(mongoURI);

passport.serializeUser(function(user, done){
  done(null, user.id);
});

passport.deserializeUser(function(id, done){
  SolarUser.findById(id, function(err, user){
    if (err) done(err);
    done(null, user);
  });
});

passport.use('local', new localStrategy({
    passReqToCallback: true,
    usernameField: 'username'
  }, function(request, username, password, done){
    SolarUser.findOne({ username: username }, function(err, user){
      if (err) throw err;
      if (!user) return done(null, false, { message: 'Incorrect username and/or password.' });
      user.checkPassword(password, function(err, isMatch){
        if (err) throw err;
        if (isMatch){
          console.log('Success!');
          return done(null, user);
        }
        else {
          console.log('Failure!');
          return done(null, false, { message: 'Incorrect username and/or password.' });
        }
      });
    });
}));

var server = app.listen(process.env.PORT || 3000, function(){
  var port = server.address().port;
  console.log('Listening on port:', port);
});
