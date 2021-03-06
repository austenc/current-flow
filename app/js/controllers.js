'use strict';

/* Controllers */

angular.module('myApp.controllers', []) 

   .controller('HeaderCtrl', ['$scope', 'loginService', function($scope, loginService) {
      $scope.logout = function() {
         loginService.logout();
      }
   }])

   .controller('HomeCtrl', ['$scope', '$http', '$modal', '$cookieStore', 'syncData', function($scope, $http, $modal, $cookieStore, syncData) {
      $scope.sites       = '';
      $scope.heights     = '';
      $scope.searchSite  = '';
      $scope.searchState = $cookieStore.get('state');
      $scope.favs        = new Array();
      $scope.favcodes    = new Array();

      // User favorites
      $scope.$watch('auth', function(auth) {
         if($scope.auth.user != null)
         {
            $scope.favs     = syncData('users').$child($scope.auth.user.uid).$child('favorites');
            $scope.favs.$on('loaded', function() {
              $scope.favcodes = $scope.favs.$getIndex();
            }); 

         }
         else
         {
            $scope.favs = new Array();
         }
      }, true); // true to compare object values instead of references


      $scope.$watch('favs', function(favs){
         // get the data for the favs 
         if(($scope.auth.user != null) && (!!$scope.favs))
         {
            $scope.updateFavs();
            $scope.favcodes = $scope.favs.$getIndex();
         }
      }, true);

      // For graphs
      $scope.siteCode    = '';
      $scope.siteName    = '';

      // FAVORITES
      $scope.toggleFav = function(siteCode)
      {
         if( ! $scope.hasFavorite(siteCode))
         {
            // not in favs, add it
            $scope.favs.$child(siteCode).$set(true);
         }
         else
         {
            // remove it from array
            $scope.favs.$remove(siteCode);
         }
      }


      $scope.hasFavorite = function(which)
      {
         return ($scope.favs != null) ? ($scope.favs.$getIndex().indexOf(which) != -1) : false;
      }      

      // Open a graph for a given site
      $scope.showGraph = function(siteCode, siteName) {

         $scope.siteCode = siteCode;
         $scope.siteName = siteName;

         var modalInstance = $modal.open({
            templateUrl: 'siteGraph.html',
            controller: ModalInstanceCtrl,
            //windowClass: 'modal-large', // can't use .modal-lg because ui-bootstrap doesn't apply it to .modal-dialog but parent element instead
            resolve: {
              siteCode: function () {
                return $scope.siteCode;
              },
              siteName: function () {
                return $scope.siteName;
              }
            }
         });
      };

      var ModalInstanceCtrl = function ($scope, $modalInstance, siteCode, siteName) {

         $scope.siteCode = siteCode;
         $scope.siteName = siteName;

         $scope.cancel = function () {
            $modalInstance.dismiss('cancel');
         };
      };

      // Favorite sites
      $scope.updateFavs = function() {
            if($scope.favs.$getIndex().length > 0)
            {
               // CFS Data
               $http.get("http://waterservices.usgs.gov/nwis/iv/?format=json&parameterCd=00060&sites="+$scope.favs.$getIndex().join()).success(function(data){
                  $scope.favsites = data.value.timeSeries;
               })
               .error(function(errorData, errorStatus){
                  $scope.favsites = errorData;
               });

               // Gage Height
               $http.get("http://waterservices.usgs.gov/nwis/iv/?format=json&parameterCd=00065&sites="+$scope.favs.$getIndex().join()).success(function(data){
                  $scope.favheights = data.value.timeSeries;
               })
               .error(function(errorData, errorStatus){
                  $scope.favheights = errorData;
               });

               // Temperature
               $http.get("http://waterservices.usgs.gov/nwis/iv/?format=json&parameterCd=00011&sites="+$scope.favs.$getIndex().join()).success(function(data){
                  $scope.favtemps = data.value.timeSeries;
               })
               .error(function(errorData, errorStatus){
                  $scope.favtemps = errorData;
               });
            }
            else
            {
               $scope.favsites   = null;
               $scope.favheights = null;
               $scope.favtemps   = null
            }
      }


      // All sites from a given state
      $scope.updateSites = function() {
            // Set cookie to remember the state selected at least!
            $cookieStore.put('state', $scope.searchState)

            // CFS Data
            $http.get("http://waterservices.usgs.gov/nwis/iv/?format=json&parameterCd=00060&stateCd="+$scope.searchState).success(function(data){
               $scope.sites = data.value.timeSeries;
            })
            .error(function(errorData, errorStatus){
               $scope.sites = errorData;
            });

            // Gage Height
            $http.get("http://waterservices.usgs.gov/nwis/iv/?format=json&parameterCd=00065&stateCd="+$scope.searchState).success(function(data){
               $scope.heights = data.value.timeSeries;
            })
            .error(function(errorData, errorStatus){
               $scope.heights = errorData;
            });

            // Temperature
            $http.get("http://waterservices.usgs.gov/nwis/iv/?format=json&parameterCd=00011&stateCd="+$scope.searchState).success(function(data){
               $scope.temps = data.value.timeSeries;
            })
            .error(function(errorData, errorStatus){
               $scope.temps = errorData;
            });
      };

      // if the state is set by a cookie, load the sites by default for that state
      if( ! angular.isUndefined($scope.searchState))
         $scope.updateSites();


   }])

   .controller('LoginCtrl', ['$scope', 'loginService', '$location', function($scope, loginService, $location) {
      $scope.email      = null;
      $scope.pass       = null;
      $scope.confirm    = null;
      $scope.createMode = false;

      $scope.login = function(cb) {
         $scope.err = null;
         if( !$scope.email ) {
            $scope.err = 'Please enter an email address';
         }
         else if( !$scope.pass ) {
            $scope.err = 'Please enter a password';
         }
         else {
            loginService.login($scope.email, $scope.pass, function(err, user) {
               $scope.err = err? err + '' : null;
               if( !err ) {
                  cb && cb(user);
               }
            });
         }
      };

      $scope.createAccount = function() {
         $scope.err = null;
         if( assertValidLoginAttempt() ) {
            loginService.createAccount($scope.email, $scope.pass, function(err, user) {
               if( err ) {
                  $scope.err = err? err + '' : null;
               }
               else {
                  // must be logged in before I can write to my profile
                  $scope.login(function() {
                     loginService.createProfile(user.uid, user.email);
                     $location.path('/account');
                  });
               }
            });
         }
      };

      function assertValidLoginAttempt() {
         if( !$scope.email ) {
            $scope.err = 'Please enter an email address';
         }
         else if( !$scope.pass ) {
            $scope.err = 'Please enter a password';
         }
         else if( $scope.pass !== $scope.confirm ) {
            $scope.err = 'Passwords do not match';
         }
         return !$scope.err;
      }
   }])

   .controller('AccountCtrl', ['$scope', 'loginService', 'syncData', '$location', function($scope, loginService, syncData, $location) {
      syncData(['users', $scope.auth.user.uid]).$bind($scope, 'user');

      $scope.logout = function() {
         loginService.logout();
      };

      $scope.oldpass = null;
      $scope.newpass = null;
      $scope.confirm = null;

      $scope.reset = function() {
         $scope.err = null;
         $scope.msg = null;
      };

      $scope.updatePassword = function() {
         $scope.reset();
         loginService.changePassword(buildPwdParms());
      };

      function buildPwdParms() {
         return {
            email: $scope.auth.user.email,
            oldpass: $scope.oldpass,
            newpass: $scope.newpass,
            confirm: $scope.confirm,
            callback: function(err) {
               if( err ) {
                  $scope.err = err;
               }
               else {
                  $scope.oldpass = null;
                  $scope.newpass = null;
                  $scope.confirm = null;
                  $scope.msg = 'Password updated!';
               }
            }
         }
      }

   }]);