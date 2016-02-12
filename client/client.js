var app = angular.module('SolarApp', ['ngRoute', 'ngCookies', 'trNgGrid']);
var MAX_INSTALLS_PERMITTED = 10;
//Note regarding above: currently selected D3 palette contains 10 colors
var DEG_SYMBOL = '\u00B0';

app.config(['$routeProvider', '$locationProvider', function($routeProvider, $locationProvider){
  $routeProvider
    .when('/login', {
      templateUrl: 'views/login.html',
      controller: 'LoginController'
    }).when('/register', {
      templateUrl: 'views/register.html',
      controller: 'RegisterController'
    }).when('/', {
      templateUrl: 'views/home.html',
      controller: 'HomeController'
    }).when('/create', {
      templateUrl: 'views/create.html',
      controller: 'CreateController',
      resolve: {
        numInstallResponse: ['$http', 'SolarService', function($http, SolarService){
          return SolarService.numInstalls();
        }]
      }
    }).when('/view', {
      templateUrl: 'views/view.html',
      controller: 'ViewController'
    }).otherwise({
      templateUrl: 'views/login.html',
      controller: 'LoginController'
    });
  $locationProvider.html5Mode(true);
}]);

app.controller('MainController', ['$scope', '$location', '$interval', 'AuthentiService', 'SolarService', function($scope, $location, $interval, AuthentiService, SolarService){
  this.username = "";
  this.loggedIn = function(){
    this.username = AuthentiService.getName();
    return AuthentiService.loggedIn();
  };
  var signOut = function(){
    AuthentiService.signOut().then(function(response){
      $location.path('/login');
    });
  };
  this.signOut = signOut;
  var checkServerLogin = function(){
    AuthentiService.serverLoggedIn().then(function(response){
      console.log('checking login status with server...');
      if (response.data == 'failure') signOut();
    });
  };
  this.isNavButtonActive = function(path){
    if ($location.path().toString() === path) return 'active';
    else return false;
  };
  $interval(checkServerLogin, 30000);
}]);

app.controller('LoginController', ['$scope', '$location', 'AuthentiService', function($scope, $location, AuthentiService){
  $scope.user = {
    username: "",
    password: ""
  };
  $scope.badLogin = false;

  $scope.resetFlags = function(){
    $scope.badLogin = false;
  };
  $scope.register = function(){
    $location.path('/register');
  };
  $scope.login = function(){
    $scope.resetFlags();
    AuthentiService.signIn($scope.user).then(function(response){
      if (response.data == 'success'){
        AuthentiService.logIn($scope.user.username);
        $location.path('/');
      }
      else $scope.badLogin = true;
    }, function(error){
      console.log('Error: authentication failed.');
      return false;
    });;
  }
}]);

app.controller('RegisterController', ['$scope', '$location', 'AuthentiService', function($scope, $location, AuthentiService){
  $scope.userExists = false;
  $scope.badLogin = false;
  $scope.user = {
    username: "",
    password: ""
  };
  $scope.passwordConfirm = "";

  var resetFlags = function(){
    $scope.passwordUnmatched = false;
    $scope.userExists = false;
    $scope.badLogin = false;
  };

  $scope.register = function(){
    resetFlags();
    if ($scope.user.password != $scope.passwordConfirm){
      $scope.passwordUnmatched = true;
      return;
    }
    AuthentiService.register($scope.user).then(function(response){
      if (response.data == 'success'){
        AuthentiService.signIn($scope.user).then(function(response){
          if (response.data == 'success'){
            AuthentiService.logIn($scope.user.username);
            $location.path('/');
          }
          else $scope.badLogin = true;
        }, function(error){
          console.log('Error: authentication failed.');
          return false;
        });;
      }
      else $scope.userExists = true;
    });
  };
}]);

app.controller('HomeController', ['$scope', '$location', 'AuthentiService', function($scope, $location, AuthentiService){
  if (!AuthentiService.loggedIn()) $location.path('/login');
}]);

app.controller('WarningController', ['$scope', '$location', 'AuthentiService', function($scope, $location, AuthentiService){
  if (!AuthentiService.loggedIn()) $location.path('/login');
}]);

app.controller('ViewController', ['$scope', '$location', '$filter', 'AuthentiService', 'SolarService', function($scope, $location, $filter, AuthentiService, SolarService){
  if (!AuthentiService.loggedIn()) $location.path('/login');
  $scope.installData = [];
  $scope.tableData = [];
  $scope.tableIds = [];
  $scope.selectedInstall = null;
  $scope.error = null;

  $scope.getInstalls = function(){
    SolarService.getInstalls().then(function(response){
      if (response.data && response.data.installs){
        $scope.installData = response.data.installs;
        setTableData();
      }
      else {
        $scope.error = "Error connecting to PVWatts5 API.  Please try again later.";
      }
    });
  }

  var setTableData = function(){
    $scope.tableData = [];
    for (var i = 0; i < $scope.installData.length; i++){
      var data = $scope.installData[i];
      $scope.tableData.push({
        "id": data._id,
        "Name": data.name,
        "Created": $filter('date')(data.created, "MM/dd/yy"),
        "Location": formatGeocode(data.location.long, data.location.lat),
        "Power": (data.panel.capacity + " kW"),
        "Losses": (data.panel.losses + "%"),
        "Placement": formatPanelData(data.panel.array_type),
        "Panel": formatModuleData(data.panel.module_type),
        "AC_monthly_kWh": data.ac_monthly
      });
    }
    setGraphData();
  };

  //-------------------------------------------------
  //&&&&&&&&&&*****D3 Graph Generation*****&&&&&&&&&&
  //-------------------------------------------------

  var gWidth = 600;
  var gHeight = 360;
  var pad = 50;

  var gData = [];
  var legendInfo = [];
  var palette = d3.scale.category10();

  var setGraphData = function(){
    gData = [];
    for (var i = 0; i < $scope.tableData.length; i++){
      gData.push([]);
      for (var j = 0; j < $scope.tableData[i].AC_monthly_kWh.length; j++){
        gData[gData.length - 1].push({x: j, y:  $scope.tableData[i].AC_monthly_kWh[j]});
      }
      legendInfo.push({'name': $scope.tableData[i].Name, 'color': palette(i)});
    }
    console.log('gData:', gData);
    console.log('legendInfo:', legendInfo);

    var yRange = d3.extent(d3.merge(gData), function(axisData){ return axisData.y; });
    var xRange = d3.extent(d3.merge(gData), function(axisData){ return axisData.x; });
    yRange[0] = 0; //override y-min value to be zero

    var xScale = d3.scale.linear()
      .domain([xRange[0], xRange[1]])
      .range([pad, gWidth - pad * 2]);

    var yScale = d3.scale.linear()
      .domain([yRange[0], yRange[1]])
      .range([gHeight - pad, pad]);

    d3.select("svg").remove(); //clear chart for rebuild

    var svg = d3.select('.chartArea')
      .append("svg")
      .attr("width", gWidth)
      .attr("height", gHeight);

    var xAxis = d3.svg.axis().scale(xScale).orient("bottom").ticks(12)
      .tickFormat(function(d){ return catLabel(d); });
    var yAxis = d3.svg.axis().scale(yScale).orient("left").ticks(8);

    svg.append("g").attr("class", "axis")
      .attr("transform", "translate(0," + (gHeight - pad) + ")").call(xAxis);

    svg.append("g").attr("class", "axis")
      .attr("transform", "translate(" + pad + ",0)").call(yAxis);

    var linePath = svg.selectAll("g.line").data(gData);

    linePath.enter().append("g")
  	  .attr("class", "line").attr("style", function(d) {
  		     return "stroke: " + palette(gData.indexOf(d));
  	  });

	  linePath.selectAll("path").data(function (d) { return [d]; })
	    .enter().append('path').attr("d", d3.svg.line()
	      .x(function (d) { return xScale(d.x); })
	       .y(function (d) { return yScale(d.y); })
	  );
  }


  function catLabel(monthIndex) {
    switch (monthIndex){
      case 0: return "Jan";
      case 1: return "Feb";
      case 2: return "Mar";
      case 3: return "Apr";
      case 4: return "May";
      case 5: return "Jun";
      case 6: return "Jul";
      case 7: return "Aug";
      case 8: return "Sep";
      case 9: return "Oct";
      case 10: return "Nov";
      case 11: return "Dec";
    }
  }


  var formatGeocode = function(longitude, latitude){
    var tempLong = longitude.toFixed(1);
    var tempLat = latitude.toFixed(1);
    var northSouth, eastWest;
    if (longitude > 0) eastWest = "E";
    else {
      eastWest = "W";
      tempLong = tempLong/(-1);
    }
    if (latitude > 0) northSouth = "N";
    else {
      northSouth = "S";
      tempLat = tempLat/(-1);
    }
    return tempLat + DEG_SYMBOL + " " + northSouth + ", " + tempLong + DEG_SYMBOL + " " + eastWest;
  };

  var formatSystemData = function(capacity, losses){
    return capacity + "kW, est. " + losses + "% loss";
  }

  var formatPanelData = function(arrayType){
    switch(arrayType){
      case 1: return "Roof-Mounted";
      case 4: return "2-Axis Tracking";
      default: return "Open Rack";
    }
  };

  var formatModuleData = function(moduleType){
    switch(moduleType){
      case 0: return "Standard";
      case 1: return "Premium";
      default: return "Thin Film";
    }
  };

  $scope.deleteInstall = function(installId){
    SolarService.deleteInstall(installId).then(function(response){
      $scope.getInstalls();
    });
  };
  $scope.getInstalls();
}]);

app.controller('CreateController', ['$scope', '$location', 'numInstallResponse', 'AuthentiService', 'SolarService', function($scope, $location, numInstallResponse, AuthentiService, SolarService){
  if (!AuthentiService.loggedIn()) $location.path('/login');
  var numInstalls = numInstallResponse.data.count;
  var checkInstallStatus = function(){
    if (numInstalls >= MAX_INSTALLS_PERMITTED) return true;
    else return false;
  };
  $scope.formInfo = {
    numRemaining: MAX_INSTALLS_PERMITTED - numInstalls,
    disableForm: checkInstallStatus()
  }

  $scope.error = null;
  $scope.dupName = false;
  $scope.suggestedTilt = "";//set equal to latitude
  $scope.suggestedAzi = "";//0 for southern hemisphere; 180 for northern
  $scope.installData = { //initialize to default values
    name: "",
    latitude: 40,
    longitude: -105,
    tilt: 40,
    azimuth: 180,
    capacityKW: 4,
    percentLosses: 14,
    arrayType: 1,
    moduleType: 0
  };

  $scope.resetFlags = function(){
    $scope.error = null;
    $scope.dupName = false;
  };

  $scope.newSolarInstall = function(){
    $scope.resetFlags();
    SolarService.getInstalls().then(function(response){
        if (response.data && response.data.installs){
          for (var i = 0; i < response.data.installs.length; i++){
            if (response.data.installs[i].name == $scope.installData.name){
              $scope.dupName = true;
              return;
            }
          }
        }
        SolarService.newInstall($scope.installData).then(function(response){
          if (response.data == 'success'){
            $location.path('/view');
          }
          else {
            $scope.error = true
          }
        });
    });
  };
}]);


app.factory('SolarService', ['$http', function($http){
  var newInstall = function(installData){
    return $http.post('/pvwatts5/new', installData);
  };
  var getInstalls = function(){
    return $http.get('/pvwatts5/userInstalls');
  };
  var deleteInstall = function(installId){
    return $http.delete('/pvwatts5/install/' + installId);
  };
  var numInstalls = function(){
    return $http.get('/pvwatts5/numInstalls');
  };
  return {
    newInstall: newInstall,
    getInstalls: getInstalls,
    deleteInstall: deleteInstall,
    numInstalls: numInstalls
  };
}]);

app.factory('AuthentiService', ['$http', '$cookies', function($http, $cookies){
  var user = false;

  var signOut = function(){
    user = false;
    $cookies.put('loggedIn', '');
    $cookies.put('user', '');
    return $http.get('/signout');
  };
  var register = function(userInfo){
    signOut();
    var params = userInfo.username + '/' + userInfo.password;
    return $http.post('/auth/register/' + params);
  };
  var signIn = function(userInfo){
    signOut();
    return $http.post('/', userInfo);
  };
  var logIn = function(username){
    user = true;
    $cookies.put('loggedIn', 'true');
    $cookies.put('username', username);
  };
  var loggedIn = function(){
    if (user || $cookies.get('loggedIn') == 'true') return true;
    return false;
  };
  var serverLoggedIn = function(){
    return $http.get('/loggedIn');
  };
  var getName = function(){
    var userName = $cookies.get('username');
    if (userName && userName.length > 0) return userName;
    return null;
  };

  return {
    register: register,
    signIn: signIn,
    signOut: signOut,
    logIn: logIn,
    loggedIn: loggedIn,
    serverLoggedIn: serverLoggedIn,
    getName: getName
  };
}]);
