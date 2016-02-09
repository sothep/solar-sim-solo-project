var app = angular.module('SolarApp', ['ngRoute', 'ngCookies']);
var MAX_INSTALLS_PERMITTED = 5;

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
      controller: 'CreateController'
    }).when('/view', {
      templateUrl: 'views/view.html',
      controller: 'ViewController'
    }).when('/tooManyInstalls', {
      templateUrl: 'views/tooMany.html',
      controller: 'WarningController'
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
  $interval(checkServerLogin, 30000);
}]);

app.controller('LoginController', ['$scope', '$location', 'AuthentiService', function($scope, $location, AuthentiService){
  $scope.user = {
    username: "",
    password: ""
  }
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
  }
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

app.controller('ViewController', ['$scope', '$location', 'AuthentiService', 'SolarService', function($scope, $location, AuthentiService, SolarService){
  if (!AuthentiService.loggedIn()) $location.path('/login');
  $scope.installData = [];
  $scope.selectedInstall = null;
  $scope.error = null;

  $scope.getInstalls = function(){
    SolarService.getInstalls().then(function(response){
      if (response.data && response.data.installs){
        $scope.installData = response.data.installs;
      }
      else {
        $scope.error = "Error connecting to PVWatts5 API.  Please try again later.";
      }
    });
  }
  $scope.deleteInstall = function(installId){
    SolarService.deleteInstall(installId).then(function(response){
      $scope.getInstalls();
    });
  };
  $scope.getInstalls();
}]);

app.controller('CreateController', ['$scope', '$location', 'AuthentiService', 'SolarService', function($scope, $location, AuthentiService, SolarService){
  if (!AuthentiService.loggedIn()) $location.path('/login');
  $scope.numRemaining = MAX_INSTALLS_PERMITTED;
  SolarService.numInstalls().then(function(response){
    $scope.numRemaining -= response.data.count;
    if ($scope.numRemaining <= 0){
      $location.path('/tooManyInstalls');
    }
  });
  $scope.error = null;
  $scope.dupName = false;
  $scope.suggestedTilt = "";//set equal to latitude
  $scope.suggestedAzi = "";//0 for southern hemisphere; 180 for northern
  $scope.installData = { //initialize to default values
    name: "", //***MAKE THIS BLANK & html-required
    latitude: 40, //*** html-required
    longitude: -105, //*** html-required
    //add html-form min/max for all below...
    tilt: 40,
    azimuth: 180,
    capacityKW: 4,
    percentLosses: 14,
    arrayType: 0,
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
            $scope.error = "Error connecting to PVWatts5 API.  Please try again later.";
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
