/**
 * @author Archan Patel
 */

'use strict'

const nano = require('nano');
const influx = require('influx');
const debug = require('abacus-debug')('database-stats');

/**
 * createCouchClient initializes a couch client for requests.
 * @param  {string}   url           Database Url to use.
 * @param  {params}   options
 * @return {Object}   Couch client used for requests.
 */
const createCouchClient = (url, options) => {
  const opt = Object.assign({url: url}, options);
  const couch = nano(opt);
  return couch;
}

const createInfluxClient = (host, port, user, pass) => {
  const client = influx({
    host: host,
    port: port,
    username: user,
    password: pass
  });

  return client;
}

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

const generateMonitor = (url, options) => {
  return {
    dbclient: createCouchClient(url, options),
    pollStats: pollStats
  }
}

/*
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
