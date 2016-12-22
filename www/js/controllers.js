angular.module('ict4awe-demo')

.controller('AppCtrl', ['MqttService', function (MqttService) {
    var vm = this;
    vm.mqtt = MqttService;
}])

.controller('SettingsCtrl', ['Config', function (Config) {
  var vm = this;
  vm.broker = angular.copy(Config.broker);

  vm.save = function () {
    window.localStorage.setItem('radio-mqtt-config', JSON.stringify(vm.broker));
    Config.broker = vm.broker;
  };
}])

.controller('IntroCtrl', ['$log', 'MqttService', function ($log, MqttService) {
    var vm = this;
    vm.connect = function () {
      MqttService.connect().then(function () {
        $log.debug('connected');
      }, function (error) {
        $log.debug('no connection...');
      });
    };

    vm.status = function () { return MqttService.connected; };
    // vm.status();
}])

.controller('RecordingsCtrl', ['$log', '$scope', '$state', '$ionicLoading', '$ionicPopup', 'RadioClient', 'recordingsList',
function ($log, $scope, $state, $ionicLoading, $ionicPopup, RadioClient, recordingsList) {
  var vm = this;

  vm.selectMode = false;
  vm.targetEvent = '';
  vm.list = recordingsList;

  vm.selectEvent = function (index) {
    vm.targetEvent = vm.list[index].name;
  };

  vm.toSelectMode = function (index) {
    $log.debug('going to select mode.')
    vm.selectMode = true;
    vm.targetEvent = ' ';
    vm.list[index].selected = true;
  };

  vm.toListMode = function () {
    $log.debug('going to list mode');
    vm.selectMode = false;
    vm.targetEvent = '';
    vm.list.map(function (x) { x.selected = false; });
  };

  vm.start = function () {
    if (!vm.targetEvent) {
      $ionicPopup.alert({
        title: 'Error',
        template: 'Empty [event] field.'
      });
    } else {
      $log.debug('start recording ' + vm.targetEvent);
      $ionicLoading.show({
        template: '<h5>Recording ' + vm.targetEvent + '</h5>' +
                    '<ion-spinner icon="ripple" style="font-size: 3em"></ion-spinner><br>' +
                  '<button class="button button-small button-block button-outline" ng-click="rec.stop()">Stop</button>',
        scope: $scope
      });

      RadioClient.startRecording(vm.targetEvent)
        .then(function (data) {
          // do nothing on success
        }, function (error) {
          $ionicPopup.show({
            title: 'Error',
            template: 'Could not start recording'
          });

          $ionicLoading.hide();
        });
    }
  };

  vm.stop = function () {
    $log.debug('stop recording');
    RadioClient.stopRecording().then(function (data) {
      vm.list = Object.keys(data).map(function (x) {
        return {name: x, duration: data[x]};
      });
      $ionicLoading.hide();
    });
  };

  vm.createClassifier = function () {
    var events = vm.list.filter(function (x) {
      return x.selected;
    }).map(function (x) {
      return x.name;
    });

    if (events.length < 2) {
      $ionicPopup.alert({
        title: 'Error',
        template: 'At least two events must be selected'
      }).then(function () {
        console.log('no classifier created');
      });
    } else {
      $log.debug('create classifier with events', events);

      $ionicLoading.show({
        template: '<div>Creating Classifier</div>' +
                  '<ion-spinner icon="ripple"></ion-spinner> '
      });

      RadioClient.createClassifier(events)
        .then(function (data) {
          $ionicPopup.alert({
            title: 'Success!',
            template: 'Classifier is ready'
          }).then(function () {
            $state.go('app.classifiers');
          });
        }, function (error) {
          $ionicPopup.alert({
            title: 'Error',
            template: 'Something went wrong while creating the classifier.'
          });
        })
        .finally(function () {
          $ionicLoading.hide();
        });
    }
  };

}])

.controller('ClassifiersCtrl', ['$state', '$ionicLoading', '$ionicPopup', 'RadioClient', 'classifiersList',
function ($state, $ionicLoading, $ionicPopup, RadioClient, classifiersList) {
  var vm = this;
  vm.list = classifiersList;

  vm.use = function (classifierName) {
    $ionicLoading.show({
      template: 'Starting classifier ' + classifierName
    });

    RadioClient.startClassifier(classifierName)
      .then(function () {
        $state.go('app.eventsLog');
      }, function () {
        $ionicPopup.show({
          title: 'Error',
          template: 'Could not start classifier'
        });
      })
      .finally(function () {
        $ionicLoading.hide();
      });
  };
}])

.controller('EventsLogCtrl', ['$scope', '$state', '$ionicLoading', '$ionicPopup', 'RadioClient',
function ($scope, $state, $ionicLoading, $ionicPopup, RadioClient) {
  var vm = this;
  vm.list = [];

  vm.stop = function () {
    $ionicLoading.show({
      template: 'Stopping classifier'
    });
    RadioClient.stopClassifier()
      .then(function () {
        $state.go('app.classifiers');
      }, function () {
        $ionicPopup.show({
          title: 'Error',
          template: 'Could not stop classifier'
        })
      })
      .finally(function () {
        $ionicLoading.hide();
      });
  };

  $scope.$on('eventReceived', function (event, data) {
    $scope.$evalAsync(function () {
      vm.list.unshift(data);
    });

    if (vm.list.length > 300)
     vm.list.splice(150, 500);
  });

  $scope.$on('$destroy', function () {
    console.log('bye');
    RadioClient.stopClassifier(); // just in case of back button
  });
}])


;
