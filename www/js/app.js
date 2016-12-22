angular.module('ict4awe-demo', ['ionic'])

.run(function($rootScope, $state, $ionicPlatform, Config, MqttService) {
  $ionicPlatform.ready(function() {

    if (window.cordova && window.cordova.plugins.Keyboard) {
      cordova.plugins.Keyboard.hideKeyboardAccessoryBar(true);
      cordova.plugins.Keyboard.disableScroll(true);
    }

    // Load settings from a previous session
    var savedConfig = window.localStorage.getItem('radio-mqtt-config');
    if (savedConfig) {
      Config.broker = JSON.parse(savedConfig);
    }

    $rootScope.$watch(function () {
      return MqttService.connected;
    }, function (status) {
      if (!status) {
        console.log('Disconnected');
        $state.go('intro');
      }
    })

  });
})

.config(function($stateProvider, $urlRouterProvider) {
  $stateProvider

  .state('intro', {
    url: '/intro',
    templateUrl: 'templates/intro.html',
    controller: 'IntroCtrl as intro'
  })

  .state('app', {
    url: '/app',
    abstract: true,
    templateUrl: 'templates/menu.html',
    controller: 'AppCtrl as app'
  })

  .state('app.settings', {
    url: '/settings',
    templateUrl: 'templates/settings.html',
    controller: 'SettingsCtrl as settings'
  })

  .state('app.recordings', {
    url: '/recordings',
    templateUrl: 'templates/recordings.html',
    controller: 'RecordingsCtrl as rec',
    resolve: {
      recordingsList: ['$log', '$q', '$ionicLoading', 'RadioClient', function ($log, $q, $ionicLoading, RadioClient) {
        var d = $q.defer();

        $ionicLoading.show({
          template: 'Getting Recordings...'
        });

        RadioClient.getRecordings()
          .then(function (data) {
            $log.debug('getRecordings() response: ', data);
            var list = Object.keys(data).map(function (x) {
              return {name: x, duration: data[x]};
            });
            d.resolve(list);
          }, function (error) {
            d.reject(error);
          })
          .finally(function () {
            $ionicLoading.hide();
          });

        return d.promise;
      }]
    }
  })

  .state('app.classifiers', {
    url: '/classifiers',
    templateUrl: 'templates/classifiers.html',
    controller: 'ClassifiersCtrl as cls',
    resolve: {
      classifiersList: ['$log', '$q', '$ionicLoading', 'RadioClient', function ($log, $q, $ionicLoading, RadioClient) {
        var d = $q.defer();
        $ionicLoading.show({
          template: 'Getting Classifiers...'
        });
        RadioClient.getClassifiers()
          .then(function (data) {
            $log.debug('getClassifiers() response: ', data);
            d.resolve(data);
          }, function (error) {
            d.reject(error);
          })
          .finally(function () {
            $ionicLoading.hide();
          });

        return d.promise;
      }]
    }
  })

  .state('app.eventsLog', {
    url: '/events-log',
    templateUrl: 'templates/events-log.html',
    controller: 'EventsLogCtrl as log'
  })

  .state('app.about', {
    url: '/about',
    templateUrl: 'templates/about.html'
  });

  // if none of the above states are matched, use this as the fallback
  $urlRouterProvider.otherwise('intro');
});
