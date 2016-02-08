var mongoose = require('mongoose');
var bcrypt = require('bcrypt');

var Schema = mongoose.Schema;
var SolarSchema = require('./solar-install').schema;
var SALT_WORK_FACTOR = 12;

var UserSchema = new Schema({
  username: { type: String, required: true, index: { unique: true } },
  password: { type: String, required: true },
  installs: [ SolarSchema ]
}, { minimize: false }); //force storage of empty installs array

UserSchema.pre('save', function(next){
  var user = this;

  if (!user.isModified('password')) return next();
  bcrypt.genSalt(SALT_WORK_FACTOR, function(err, salt){
    if (err) return next(err);
    bcrypt.hash(user.password, salt, function(err, hash){
      //console.log('user:', user);
      if (err) return next(err);
      user.password = hash;
      next();
    });
  });
});

UserSchema.methods.checkPassword = function(checkingPassword, callback){
  bcrypt.compare(checkingPassword, this.password, function(err, isMatch){
    if (err) return callback(err);
    callback(null, isMatch);
  });
};

module.exports = mongoose.model('SolarUser', UserSchema);
