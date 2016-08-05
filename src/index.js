const PouchDB = require('pouchdb');
const debug = require('abacus-debug')('database-stats');

const password = process.env.PASSWORD;
const username = process.env.USERNAME;
const uri = process.env.URI;
const poll = pro

const createDB = (uri, options) => {
  const db = new PouchDB(uri, options);
  return db;
}

const getDBInfo = (db, cb) => {
  db.info().then(function(result) {
    cb(undefined, result);p
  }).catch(function(err) {
    debug(err);
    cb(err);
  });
}

const getLastEntry = (db, cb) => {

}

const getInfoDiff = (last, current, cb) => {
  let result = {};

  try {
    result.updates = current.update_req - last.update_seq;
    result.deltaDocs = current.doc_count - last.doc_count;
    cb(undefined, result);
  } catch(err) {
    debug(err);
    cb(err);
  }
}

const runHealthCheck = (db) => {
  let lastInfo = {};
  const options = {
    auth: {
      password: password,
      username: username
    }
  }

  const db = createDB(uri, options);

  const loop = () => {
    getDBInfo(db, (err, res) => {
      getInfoDiff(lastInfo, res, (err, res) => {
        err ? debug(err) : {
          console.log('DB updates: ' + res.updates);
          console.log('DELTA doc count: ' + res.deltaDocs);
        }
      });
    });
  }

  loop();
  setInterval(loop, process.env.POLL_INTERVAL || 600000);
}

runHealthCheck();
