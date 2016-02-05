var app = angular.module('SolarApp', ['ngRoute', 'ngCookies']);

app.config(['$routeProvider', '$locationProvider', function($routeProvider, $locationProvider){
  $routeProvider
    .when('/login', {
      templateUrl: 'views/login.html',
      controller: 'LoginController'
    })
    .when('/register', {
      templateUrl: 'views/register.html',
      controller: 'RegisterController'
    })
    .when('/', {
      templateUrl: 'views/home.html',
      controller: 'HomeController'
    })
    .when('/create', {
      templateUrl: 'views/create.html',
      controller: 'CreateController'
    })
    .when('/view', {
      templateUrl: 'views/view.html',
      controller: 'ViewController'
    })
    .otherwise({
      templateUrl: 'views/login.html',
      controller: 'LoginController'
    });

    /*I probably need to enforce a 403/Forbidden
    if the user attempts to access any server routes directly.*/

    /*Likewise, if the user attempts to access any of the *permitted*
    client-side routes before authentication, would I want to enforce
    401 / unauthenticated?  Or can I accomplish all of this using
    $location.path()??*/

    /*For general structure: every controller will address an
    authentication factory to verify that the user has been logged in.
    If not, the user should be redirected to the login page.*/

    /*Do I need to do anything, e.g. with sessions, to prevent or
    handle the same user logging in multiple times concurrently?

    If I do not, I suspect this could break some things, such as
    the maximum number of saves per user, and the interface to
    enforce that.*/

  $locationProvider.html5Mode(true);
}]);

//use "controller as" syntax somewhere??

app.controller('MainController', ['$scope', '$location', 'AuthentiService', function($scope, $location, AuthentiService){
  $scope.loggedIn = function(){
    return AuthentiService.loggedIn();
  };
  $scope.maxInstalls = function(){
    return false; //placeholder...
  };
  $scope.signOut = function(){
    AuthentiService.signOut().then(function(response){
      $location.path('/login');
    });
  };
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
      console.log('server response:', response.data);
      if (response.data == 'success'){
        AuthentiService.logIn();
        $location.path('/');
      }
      else $scope.badLogin = true;
      console.log('Logged in?', AuthentiService.loggedIn());
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
          console.log('server response:', response.data);
          if (response.data == 'success'){
            AuthentiService.logIn();
            $location.path('/');
          }
          else $scope.badLogin = true;
          console.log('Logged in?', AuthentiService.loggedIn());
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
  console.log()
  if (!AuthentiService.loggedIn()) $location.path('/login');

}]);

app.controller('ViewController', ['$scope', '$location', 'AuthentiService', function($scope, $location, AuthentiService){
  if (!AuthentiService.loggedIn()) $location.path('/login');

}]);

app.controller('CreateController', ['$scope', '$location', 'AuthentiService', 'SolarService', function($scope, $location, AuthentiService, SolarService){
  $scope.error = null;
  $scope.installData = { //initialize to default values
    name: "Install-01", //***MAKE THIS BLANK & html-required
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
  };

  $scope.newSolarInstall = function(){
    $scope.resetFlags();
    SolarService.newInstall($scope.installData).then(function(response){
      if (response.data == 'success'){
        $location.path('/view');
      }
      else {
        $scope.error = "Error connecting to PVWatts5 API.  Please try again later.";
      }
    });
  };
}]);

app.factory('SolarService', ['$http', function($http){
  var newInstall = function(installData){
    return $http.post('/pvwatts5/new', installData);
  }

  return {
    newInstall: newInstall
  }
}]);

app.factory('AuthentiService', ['$http', '$cookies', function($http, $cookies){
  var signOut = function(){
    $cookies.put('loggedIn', '');
    return $http.get('/signout');
  };
  var register = function(userInfo){
    signOut();
    var params = userInfo.username + '/' + userInfo.password;
    return $http.post('/auth/register/' + params);
  };
  var signIn = function(userInfo){
    signOut();
    console.log('userInfo:', userInfo);
    return $http.post('/', userInfo);
  };
  var logIn = function(){
    $cookies.put('loggedIn', 'true');
  };
  var loggedIn = function(){
    if ($cookies.get('loggedIn') == 'true') return true;
    return false;
  };

  return {
    register: register,
    signIn: signIn,
    signOut: signOut,
    logIn: logIn,
    loggedIn: loggedIn
  };
}]);
