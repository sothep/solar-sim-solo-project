var express = require('express');
var path = require('path');
var passport = require('passport');

var router = express.Router();


router.get('/success', function(request, response){
  response.send('success');
});

router.get('/failure', function(request, response){
  response.send('failure');
});

router.get('/signout', function(request, response){
  request.logout();
  response.send('signed out');
});

router.get('/loggedIn', function(request, response){
  if (request.user) response.redirect('/success');
  else response.redirect('/failure');
});

router.get('/', function(request, response){
  response.sendFile(path.join(__dirname, '../public/views/index.html'));
});

router.post('/', passport.authenticate('local', {
  successRedirect: '/success',
  failureRedirect: '/failure'
}));

router.get('/*', function(request, response, next){
    var url = request.originalUrl;
    response.redirect('/#' + url);
});

module.exports = router;
