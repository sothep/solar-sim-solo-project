var mongoose = require('mongoose');
var Schema = mongoose.Schema;

var SolarSchema = new Schema({
  name: { type: String, required: true },
  created: { type: Date, default: Date.now },
  location: {
    lat: { type: Number, required: true },
    long: { type: Number, required: true }//,
    //city: { type: String } //might be nice to have...
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
});
// }, { _id: false });

module.exports = mongoose.model('SolarSchema', SolarSchema);
