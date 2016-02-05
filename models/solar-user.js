var mongoose = require('mongoose');
var Schema = mongoose.Schema;
var bcrypt = require('bcrypt');
var SALT_WORK_FACTOR = 12;

var SolarSchema = new Schema({
  name: { type: String, required: true },
  created: { type: Date, default: Date.now },
  location: {
    lat: { type: Number, required: true },
    long: { type: Number, required: true },
    city: { type: String } //might be nice to have...
  },
  orientation: {
    tilt: { type: Number, required: true },
    azimuth: { type: Number, required: true }
  },
  panel: {
    capacity: { type: Number, required: true },
    losses: { type: Number, required: true },
    array_type: { type: Number, required: true },
    module_type: { type: Number, required: true }
  },
  dc_monthly: [ { type: Number, required: true } ],
  ac_monthly: [ { type: Number, required: true } ],
  dc_annual: { type: Number, required: true },
  ac_annual: { type: Number, required: true }
}, { _id: false });

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
