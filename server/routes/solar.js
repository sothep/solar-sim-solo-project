var express = require('express');
var bodyParser = require('body-parser');
var https = require('https');

var PV_KEY = 'WHsWTJkyK8rv3wIcuj6EEgBoMdMzOUtqps1jmskV';

var router = express.Router();
router.use(bodyParser.json());

router.post('/new', function(request, response){
  //need to add case (both here and @client) to reject
  //names that already exist in the database and abort API call.
  var reqParams = request.body;
  var apiHost = 'developer.nrel.gov';
  var apiParams = '/api/pvwatts/v5.json?api_key='+PV_KEY+'&lat='+
                reqParams.latitude+'&lon='+reqParams.longitude+
                '&system_capacity='+reqParams.capacityKW+'&azimuth='+
                reqParams.azimuth+'&tilt='+reqParams.tilt+'&array_type='+
                reqParams.arrayType+'&module_type='+reqParams.moduleType+
                '&losses='+reqParams.percentLosses;
  console.log(apiParams);
  console.log('user:', request.user);

  var options = {
    host: apiHost,
    port: 443, //I guess this is the default for https?
    path: apiParams,
    method: 'GET'
  };

  

  response.send('success');
});

module.exports = router;
