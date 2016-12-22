angular.module('ict4awe-demo')

.constant('Config', {
  broker: {
    host: 'broker.mqttdashboard.com',//  'localhost',
    port: '8000',
    username: '',//  'radioproject',
    password: '',// 'charlottetheharlot'
    connectTimeout: 2000,
    reconnectPeriod: 3000,
    path: '/mqtt'
  },

  topics: {
    recording: '/rrac/cmd/record',
    classifier: '/rrac/cmd/classification',
    ping: '/rrac/ping',
    response: '/rrac/response',
    events: '/rrac/events'
  }
})



.factory('MqttService', ['$log', '$q', '$rootScope', 'Config', function ($log, $q, $rootScope, Config) {
  var _callbacks = {}
    , _callbackId = 0
    , MQTTClient = null
  ;

  // var publish = function (topic, message) {
  //   var d = $q.defer();
  //   if (!MQTTClient || ! MQTTClient.connected) {
  //     d.reject();
  //   }
  //
  //   _callbacks[ ++_callbackId ] = d;
  //   console.log('callback id is', _callbackId, _callbacks[_callbackId]);
  //   var payload = angular.merge({}, {id: _callbackId}, message);
  //   console.log('MM', payload);
  //   MQTTClient.publish(topic, JSON.stringify(payload));
  //   return d.promise;
  // };


  return {
    get connected() {
      return MQTTClient && MQTTClient.connected;
    },

    publish: function (topic, message) {

      if (!MQTTClient || ! MQTTClient.connected) {
        return $q.reject();
      }

      var d = $q.defer();

      _callbacks[ ++_callbackId ] = d;
      $log.debug('callback id is', _callbackId, _callbacks[_callbackId]);
      var payload = angular.merge({}, {id: _callbackId}, message);
      MQTTClient.publish(topic, JSON.stringify(payload));
      return d.promise;
    },

    connect: function () {
      var d = $q.defer();

      if (MQTTClient) {
        $log.debug('Closing existing MQTT client');
        MQTTClient.end();
      }

      console.log('connecting to', Config.broker);
      MQTTClient = mqtt.connect(angular.copy(Config.broker));

      // MQTTClient = mqtt.connect('broker.mqttdashboard.com:8000', Math.random().toFixed(15));

      MQTTClient.on('error', function (error) {
        MQTTClient.end();
        d.reject(error);
      });

      MQTTClient.on('close', function () {
        $log.debug('MQTT connection closed');
        MQTTClient.end();
        d.reject();
      });

      MQTTClient.on('connect', function (connack) {
        console.log('client', MQTTClient);
        MQTTClient.subscribe(Config.topics.response);
        MQTTClient.subscribe(Config.topics.events);

        MQTTClient.on('message', function (topic, message) {
          var payload = JSON.parse(message.toString());

          if (topic === Config.topics.events) {
            $rootScope.$broadcast('eventReceived', payload);
            return;
          }

          if (payload.id && _callbacks[payload.id]) {
            var callbackId = payload.id;
            var promiseData = payload.data;

            try {
              promiseData = JSON.parse(payload.data);
            } catch (err) {
              // do nothing
            }

            if (!payload.status && typeof(payload.status) === 'boolean')
              _callbacks[callbackId].reject(promiseData);
            else
              _callbacks[callbackId].resolve(promiseData);

            delete _callbacks[callbackId];
          }
        });

        d.resolve();
      });

      return d.promise;
    }
  };
}])

.factory('RadioClient', ['$log', 'Config', 'MqttService', function ($log, Config, MqttService) {
  var tag = '[RadioClient]';

  return {
    startRecording: function (audioEvent) {
      $log.debug(tag + ' start recording ${audioEvent}');
      return MqttService.publish(Config.topics.recording, {'action': 'start', 'event': audioEvent});
    },

    stopRecording: function () {
      $log.debug(tag + ' stop recording');
      return MqttService.publish(Config.topics.recording, {'action': 'stop'});
    },

    getRecordings: function () {
      $log.debug(tag + ' get recordings');
      return MqttService.publish(Config.topics.recording, {'action': 'list'});
    },

    createClassifier: function (audioEvents) {
      $log.debug(tag + ' creating classifier with events ${audioEvents}');
      return MqttService.publish(Config.topics.classifier, {'action': 'create', 'events': audioEvents})
    },

    startClassifier: function (classifier) {
      $log.debug(tag + ' start classifier ' + classifier);
      return MqttService.publish(Config.topics.classifier, {'action': 'start', 'classifierName': classifier});
    },

    stopClassifier: function () {
      $log.debug(tag + ' stop classifier');
      return MqttService.publish(Config.topics.classifier, {'action': 'stop'});
    },

    getClassifiers: function () {
      $log.debug(tag + ' get classifiers');
      return MqttService.publish(Config.topics.classifier, {'action': 'list'});
    },

    ping: function () {
      $log.debug(tag + ' ping');
      return MqttService.publish(Config.topics.ping, '');
    }
  };
}]);
