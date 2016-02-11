var app = angular.module('SolarApp', ['ngRoute', 'ngCookies', 'trNgGrid']);
var MAX_INSTALLS_PERMITTED = 5;
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
    for (var i = 0; i < $scope.installData.length; i++){
      var data = $scope.installData[i];
      $scope.tableData.push({
        "Name": data.name,
        "Created": $filter('date')(data.created, "MM/dd/yy"),
        "Location": formatGeocode(data.location.lat, data.location.long),
        "Jan": data.dc_monthly[0].toFixed(1),
        "Feb": data.dc_monthly[1].toFixed(1),
        "Mar": data.dc_monthly[2].toFixed(1),
        "Apr": data.dc_monthly[3].toFixed(1),
        "May": data.dc_monthly[4].toFixed(1),
        "Jun": data.dc_monthly[5].toFixed(1),
        "Jul": data.dc_monthly[6].toFixed(1),
        "Aug": data.dc_monthly[7].toFixed(1),
        "Sep": data.dc_monthly[8].toFixed(1),
        "Oct": data.dc_monthly[9].toFixed(1),
        "Nov": data.dc_monthly[10].toFixed(1),
        "Dec": data.dc_monthly[11].toFixed(1),
      });
    }
  };

  var formatGeocode = function(longitude, latitude){
    var northSouth, eastWest;
    if (longitude > 0) eastWest = "E";
    else eastWest = "W";
    if (latitude > 0) northSouth = "N";
    else northSouth = "S";

    return latitude + DEG_SYMBOL + " " + northSouth + ", " + longitude + DEG_SYMBOL + " " + eastWest;
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

// CreateController.resolve = {
//   numInstalls: ['$http', 'SolarService', function($http, SolarService){
//     return SolarService.numInstalls();
//   }]
// };

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
