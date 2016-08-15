//Archan patel
//Partition testing script

'use strict'

const monitor = require('../src/index.js');
const nano = require('nano');
const PouchDB = require('pouchdb');
const dbUrl = 'http://localhost:5984/';
const prefix = 'testing';

const couch = nano(dbUrl);
couch.db.create('testing');
const db = couch.use('testing');


const sTime = 1300000000000;

/*db.bulk(
  {
    docs: [
      {title: 'The Heart of Darkness', _id: 'k/abcde' + '/t/' + 1400000000000},
      {title: 'The Old Man and the Sea', _id: 'k/efghi' + '/t/' + 1400000000000},
      {title: 'The Sound and the Fury', _id: 'k/jklmno' + '/t/' + 1400000000000},
      {title: 'The Brothers Karamazov', _id: 'k/pqrst' + '/t/' + 1400000000000}
    ]
  },
  function(err, res) {
    console.log(res);
});

db.bulk([
  {title : 'Lisa Says', _id: 't/' + Date.now() + '/k/kkefhcfd'},
  {title : 'Space Oddity', _id: 't/' + Date.now() + '/k/doc1'}
]);

/*var keys = require('../test/keys.json');
keys.forEach(function(key, index, array) {
  db.put(
    {title: key, _id: 't/' + Date.now() + '/k/' + key}
  ).then(function (res) {
    console.log(res);
  }).catch(function (err) {
    console.log(err);
  });
});*/

const influx = monitor.createInfluxClient('localhost', 8086, 'user', 'pass');
//console.log(influx);
//sinflux.writePoint('test', {value: 0});
//console.log("influx: " + JSON.stringify(influx));
//monitor.createInfluxDBs(influx, ['couchdb', 'httpd', 'httpd_status_codes', 'httpd_request_methods']);
monitor.pollStats(couch, influx);
