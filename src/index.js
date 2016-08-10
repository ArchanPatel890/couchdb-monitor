/**
 * This is a utility for monitoring the health of a couchDB server instance.
 * It allows the user to check the stats of the DBs with flags.
 * It allows for the storage of statistics using InfluxDB.
 * @author Archan Patel
 */

'use strict'

const nano = require('nano');
const influx = require('influx');
const _ = require('lodash');
const debug = require('abacus-debug')('database-stats');

/**
 * createCouchClient initializes a couch client for requests.
 * @param  {string} url Database Url to use.
 * @param  {params} options
 * @return {Object} Couch client used for requests.
 */
const createCouchClient = (url, options) => {
  const opt = Object.assign({url: url}, options);
  const couch = nano(opt);
  return couch;
}

/**
 * Creates a client handle for an InfluxDB.
 * @param  {string} host hostname for server
 * @param  {string} port server port number
 * @param  {string} user username
 * @param  {string} pass password
 * @return {Object}      Influx DB client.
 */
const createInfluxClient = (host, port, user, pass) => {
  const client = influx({
    host: host,
    port: port,
    username: user,
    password: pass
  });

  return client;
}

/**
 * Returns a JSON object of the information of a pariticular DB.
 * @param  {Object} couch   nano client initialized with URL.
 * @param  {string} dbname  name of db.
 * @return {JSON}
 */
const getInfo = (couch, dbname) => new Promise(function(resolve, reject) {
  console.log("getInfo() called.");
  couch.db.get(dbname, (err, body) => {
    console.log(body);
    if(err) {
      debug('Error retrieving db info from ' + dbname);
      debug(err);
      reject(err);
    } else {
      resolve(body);
    }
  });
});

/**
 * Returns a JSOn object of the statistics of a couchdb server.
 * @param  {Object} couch couchdb nano client
 * @return {JSON}       The JSON _stats response of the server.
 */
const getStats = (couch) => new Promise(function(resolve, reject) {
  console.log('getStats() called.');
  couch.db.get('_stats', (err, body) => {
    if(err) {
      debug('Error retrieving db _stats from the server.');
      debug(err);
      reject(err);
    } else {
      resolve(body);
    }
  });
});

/**
 * Get the _active_tasks from a couchdb database.
 * @param  {Object} couch couchclient handle
 * @return {JSON}  The _active_tasks JSON object.
 */
const getActiveTasks = (couch) => new Promise(function(resolve, reject) {
  couch.db.get('_active_tasks', (err, body) => {
    if(err) {
      debug('Error retrieving db _active_tasks from ' + dbname);
      debug(err);
      reject(err);
    } else {
      resolve(body);
    }
  });
});


const publishDataToInflux = (influxdb, data, seriesName) =>
        new Promise(function(resolve, reject) {
  influxdb.writePoint(seriesName, data, function(err) {
    if (err) {
      debug(err);
      reject(err);
    } else {
      resolve(body);
    }
  })
});

const pollStats = (source, sink) => new Promise(function(resolve, reject) {
  getStats(source)
    .then((stats) => {
      if (sink) {
        _.forIn(stats, function(value, key) {
          publishDataToInflux(sink, value, key);
        });
      }
    })
    .catch((err) => {
      console.log('Unable to publish statistics.');
    })
});

const generateMonitor = (url, options) => {
  return {
    dbclient: createCouchClient(url, options),
    //pollStats: pollStats
  }
}

/*
const createDatabaseMonitor = (couch, dbname) => {

}

const getResponseTime = (db, cb) => {

}

const getConfig = (db, cb) => {

}

const writeToInflux = (db) => {

}
*/

module.exports = generateMonitor;
module.exports.getInfo = getInfo;
module.exports.getStats = getStats;
module.exports.pollStats = pollStats;
module.exports.publishDataToInflux = publishDataToInflux;
module.exports.createCouchClient = createCouchClient;
module.exports.createInfluxClient = createInfluxClient;
