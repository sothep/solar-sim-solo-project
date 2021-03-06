var express = require('express');
var bodyParser = require('body-parser');
var https = require('https');
var requestPromise = require('request-promise');

var SolarInstall = require('../../models/solar-install');
var SolarUser = require('../../models/solar-user');
var PV_KEY = 'WHsWTJkyK8rv3wIcuj6EEgBoMdMzOUtqps1jmskV';

var router = express.Router();
router.use(bodyParser.json());

router.get('/numInstalls', function(request, response){
  if (!confirmLogin(request, response)) return;
  var userId = request.user._id;
  var installQuery = SolarUser.findById(userId);
  installQuery.select('installs');
  installQuery.exec(function(err, installs){
    if (err) {
      console.log(err);
      response.send('failure');
      return;
    }
    var installCount = {
      count: installs.installs.length
    }
    response.send(JSON.stringify(installCount));
  });
});

router.get('/userInstalls', function(request, response){
  if (!confirmLogin(request, response)) return;
  var userId = request.user._id;
  var installQuery = SolarUser.findById(userId);
  installQuery.select('installs');
  installQuery.exec(function(err, installs){
    if (err) {
      console.log(err);
      response.send('failure');
      return;
    }
    response.send(JSON.stringify(installs));
  });
});

router.delete('/install/:id', function(request, response){
  if (!confirmLogin(request, response)) return;
  var userId = request.user._id;
  var installId = request.params.id;

  SolarUser.findById(userId, function(err, user){
    if (err) {
      console.log(err);
      response.send('failure');
      return;
    }
    user.installs.pull({ _id: installId });
    user.save(function(err, result){
      if (err) {
        console.log(err);
        response.send('failure');
        return;
      }
      console.log(result);
    });
  });
  response.send('success');
});

router.post('/new', function(request, response){
  if (!confirmLogin(request, response)) return;
  getSolarData(request).then(function(res){
    var userId = request.user._id;
    var newInstall = newSolarInstall(res, request.body.name);

    SolarUser.findById(userId, function(err, user){
      if (err) console.log(err);
      user.installs.push(newInstall);
      user.save(function(err, result){
        if (err) console.log(err);
        console.log(result);
      });
    });
    response.send('success'); //should this be nested in the user-save function above?
  }).catch(function(err){
    console.log('error:', err);
    response.send('error in PVWatts5 API call');
  });
});

function confirmLogin(request, response){
  if (!request.user) {
    response.redirect('/signout');
    return false;
  }
  else return true;
}

function newSolarInstall(APIData, installName){
  var dcAnnualSum = 0;
  for (var i = 0; i < APIData.outputs.dc_monthly.length; i++){
    dcAnnualSum += APIData.outputs.dc_monthly[i];
  }
  return new SolarInstall({ name: installName,
    location: { lat: APIData.inputs.lat, long: APIData.inputs.lon },
    orientation: { tilt: APIData.inputs.tilt, azimuth: APIData.inputs.azimuth },
    panel: { capacity: APIData.inputs.system_capacity, losses: APIData.inputs.losses,
            array_type: APIData.inputs.array_type, module_type: APIData.inputs.module_type },
    dc_monthly: APIData.outputs.dc_monthly,
    ac_monthly: APIData.outputs.ac_monthly,
    dc_annual: dcAnnualSum,
    ac_annual: APIData.outputs.ac_annual
  });
}

function getSolarData(request){
  var reqParams = request.body;
  var apiHost = 'https://developer.nrel.gov';
  var apiParams = '/api/pvwatts/v5.json?api_key='+PV_KEY+'&lat='+
                reqParams.latitude+'&lon='+reqParams.longitude+
                '&system_capacity='+reqParams.capacityKW+'&azimuth='+
                reqParams.azimuth+'&tilt='+reqParams.tilt+'&array_type='+
                reqParams.arrayType+'&module_type='+reqParams.moduleType+
                '&losses='+reqParams.percentLosses;

  var options = {
    url: apiHost + apiParams,
    headers: {'User-Agent': 'Request-Promise'},
    json: true
  };

  return requestPromise(options);
}

module.exports = router;
