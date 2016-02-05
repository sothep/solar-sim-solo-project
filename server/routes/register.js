var express = require('express');
var passport = require('passport');
var SolarUser = require('../../models/solar-user');
var bodyParser = require('body-parser');

var router = express.Router();
router.use(bodyParser.json());

router.post('/register/:username/:password', function(request, response){
  var userName = request.params.username;
  var passWord = request.params.password;
  console.log('router info: ' + userName + ',' + passWord);
  SolarUser.create({ username: userName, password: passWord }, function(err){
    if (err) {
      response.send('registration failed');
    }
    else {
      response.send('success');
    }
  });
});

module.exports = router;
