'use strict';

var container = require('./container');
var dataset = container.get('dataset');
var config = container.get('config');

var key = dataset.key({
  namespace: config.gcloud.namespace,
  path: ['User', 'foo']
});

dataset.saveAsync({
  key: key,
  data: {
    beep: 'boop'
  }
}).then(function () {
  return dataset.getAsync(key);
}).then(function (user) {
  console.log(user.data);
  return dataset.saveAsync({
    key: key,
    data: {
      foo: 'bar'
    }
  });
}).then(function () {
  return dataset.getAsync(key);
}).then(function (user) {
  console.log(user.data);
}).catch(function (err) {
  console.error(err.stack);
});
