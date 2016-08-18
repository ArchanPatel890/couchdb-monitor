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
const debug = require('abacus-debug')('couchdb-monitor');

/**
 * createCouchClient initializes a couch client for requests.
 * @param  {string} url       Database Url to use.
 * @param  {Object} options   Options for the couchdb nano client.
 * @return {Object} Couch     client used for requests.
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
const createInfluxClient = (host, port, user, pass, database) => {
  const client = influx({
    host: host,
    port: port,
    username: user,
    password: pass
  });

  if (database) {
    client.options.database = database;
  }

  return client;
}

const createCustomInflux = (options) => {
  const client = influx(options);
  return client;
}

/**
 * Returns a JSON object of the information of a pariticular DB.
 * @param  {Object} couch   nano client initialized with URL.
 * @param  {string} dbname  name of db.
 * @return {JSON}
 */
const getInfo = (couch, dbname) => new Promise(function(resolve, reject) {
  debug("getInfo() ...");
  couch.db.get(dbname, (err, body) => {
    console.log(body);
    if(err) {
      debug('Error retrieving db info from ' + dbname);
      debug(err);
      reject(err);
    } else {
      debug(body);
      resolve(body);
    }
  });
});

/**
 * Returns a JSOn object of the statistics of a couchdb server.
 * @param  {Object} couch couchdb nano client
 * @return {JSON}         _stats response of the server.
 */
const getStats = (couch) => new Promise(function(resolve, reject) {
  debug('getStats() ...');
  debug(couch);
  couch.db.get('_stats', (err, body) => {
    if(err) {
      debug('Error retrieving db _stats from the server.');
      debug(err);
      reject(err);
    } else {
      debug('Retrieved db _stats.');
      debug(body);
      resolve(body);
    }
  });
});

/**
 * Get the _active_tasks from a couchdb database.
 * @param  {Object} couch couchclient handle
 * @return {JSON}         The _active_tasks JSON object.
 */
const getActiveTasks = (couch) => new Promise(function(resolve, reject) {
  couch.db.get('_active_tasks', (err, body) => {
    if(err) {
      debug('Error retrieving db _active_tasks from ' + dbname);
      debug(err);
      reject(err);
    } else {
      debug(body);
      resolve(body);
    }
  });
});

/**
 * Publish a point to InfluxDB
 * @param  {Object} influxdb   InfluxDB Client
 * @param  {Object} data       point data {value: ____, time: ____}
 * @param  {Object} tags       tags used for the point
 * @param  {Object} opt        options for displaying point
 * @param  {string} seriesName name of the series put in thre db
 * @return {Object}            The response of the database.
 */
const publishPointToInflux = (influxdb, seriesName, data, tags, opt) =>
        new Promise(function(resolve, reject) {
  debug('Publishing to InfluxDB...');
  debug(data);
  debug(tags);
  influxdb.writePoint(seriesName, data, tags, opt, function(err, res) {
    if (err) {
      debug(err);
      reject(err);
    } else {
      resolve(res);
    }
  });
});

/**
 * Publish a series of data to an InfluxDB
 * @param  {Object} influxdb  influxDB client with database name
 * @param  {Array} series     The array of series names
 * @param  {Array} data       The array of data points
 * @return {Object}           Success or failure message.
 */
const publishSeriesToInflux = (influxdb, series, data) =>
        new Promise(function(resolve, reject) {
  debug('Publishing to InfluxDB...');
  debug(influxdb);
  debug(data);
  influxdb.writeSeries(series, data, function(err, res) {
    if (err) {
      debug(err);
      reject(err);
    } else {
      resolve(res);
    }
  });
});

/**
 * Formats the _stats JSON response into arrays of data points.
 * @param  {Object} stats   _stats JSON object from CouchDB
 * @param  {Number} time    Either Data.now() or another representation of time.
 * @return {Object}         Object with arrays of data point formatted for influx.
 */
const formatStatsData = (stats, time) => new Promise(function(resolve, reject) {
  debug('Formatting _stats data...');
  let data = {};
  data.couchdb = [];
  data.httpd = [];
  data.httpd_request_methods = [];
  data.httpd_status_codes = [];

  _.forIn(stats, function(value, key) {
    let ref = data[key];
    if (ref) {
      _.forIn(value, function(val, k) {
        let valString = JSON.stringify(val);
        valString = valString.replace(/null/gi, '0');
        val = JSON.parse(valString);
        ref.push({
          seriesName: k,
          value: time ? _.extend({ value: val.current}, {time: time}) :
                        {value: val.current},
          tags: val
        });
      });
    }
  });
  debug(data);
  resolve(data);
});

/**
 * Created DBs in an influxDB instance
 * @param  {Object} influx   the InfluxDB client
 * @param  {Array} names     Array of strings for the db names.
 * @return {String}          Success or failure message.
 */
const createInfluxDBs = (influx, names) => new Promise(function(resolve,reject) {
  _.map(names, function(name) {
    influx.createDatabase(name, function(err, res) {
      if(err)
        reject(err);
      debug(res);
    });
  });

  debug('Created DBs: \n' + JSON.stringify(names));
  resolve('Created DBs.');
});

/**
 * Requests the CouchDB instance for _stats, and then publishes the results to
 * the provided sink influxDB.
 * @param  {Object} source nano couchDB handle
 * @param  {Object} sink   influxDB handle
 * @return {Object}        Success of failure message.
 */
const pollStats = (source, sink) => new Promise(function(resolve, reject) {
  debug('pollStats() ...');
  getStats(source)
    .then((stats) => {
      if (sink)
        createInfluxDBs(influx,
          ['couchdb', 'httpd', 'httpd_status_codes', 'httpd_request_methods']);
      return stats;
    })
    .then((stats) => {
      if (sink) {
        let client = _.cloneDeep(sink);
        formatStatsData(stats, Date.now()).then((data) => {
          debug(data);
          _.forIn(data, function(value, key) {
            client.options.database = key;
            _.map(data.couchdb, function(point) {
              publishPointToInflux(client, point.seriesName, point.value, point.tags);
            });
          });
        });
        resolve('Published values to sink.');
      } else {
        reject('No sink database provided.');
      }
    })
    .catch((err) => {
      debug(err);
      console.log('Unable to publish statistics.');
      reject(err);
    });
});

const startPolling = (obj, influxOpt, pollInterval) => {
  let influx;
  if(influxOpt) {
    influx = createCustomInflux(influxOpt);
  } else {
    influx = createInfluxClient('localhost', 8086, process.env.username || '',
                                process.env.password || '');
  }

  const db = obj.dbclient;
  obj.loopFunction = () => {
    pollStats(db, influx);
  }

  if (typeof pollInterval == 'number'); {
      obj.POLL_INTERVAL = pollInterval;
      obj.loop = setInterval(obj.loopFunction, pollInterval);
  }
}

const continuePolling = (obj, pollInterval) => {
  if (obj.loopFunction) {
    if (typeof pollInterval == 'number') {
      obj.POLL_INTERVAL = pollInterval;
      obj.loop = setInterval(obj.loopfunction, obj.POLL_INTERVAL);
    }
    else if (this.POLL_INTERVAL) {
      obj.loop = setInterval(obj.loopfunction, obj.POLL_INTERVAL);
    }
  } else {
    debug('loop function not available');
  }
}

const stopPolling = (obj) => {
  clearInterval(obj.loop);
}

const generateMonitor = (url, options) => {
  let mon = {
    POLL_INTERVAL: undefined,
    loopFunction: undefined,
    loop: undefined,
    dbclient: createCouchClient(url, options),
    pollStats: pollStats,
    getStats: getStats,
    getInfo: getInfo,
  };

  mon.startPolling = startPolling.bind(undefined, mon);
  mon.continuePolling = continuePolling.bind(undefined, mon);
  mon.stopPolling = stopPolling.bind(undefined, mon);

  return mon;
}

/*
const createDatabaseMonitor = (couch, dbname) => {

}

const getResponseTime = (db, cb) => {

}

const getConfig = (db, cb) => {

}

const processActiveTasks = () => {}


*/
module.exports = generateMonitor;
module.exports.getInfo = getInfo;
module.exports.getStats = getStats;
module.exports.pollStats = pollStats;
module.exports.createInfluxDBs = createInfluxDBs;
module.exports.publishPointToInflux = publishPointToInflux;
module.exports.createCouchClient = createCouchClient;
module.exports.createInfluxClient = createInfluxClient;
