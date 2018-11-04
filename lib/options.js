var assert  = require('assert');
var moment  = require('moment');

var getMatches =  function(opts){
  return getRate(opts).match(/^(\d+)\s*\/\s*([a-z]+)$/);
};

var keyShorthands = {
  'ip': function(req) {
    return req.connection.remoteAddress;
  }
};

var getRate = function(opts){
  if(typeof opts.rate === 'function') return opts.rate();
  return opts.rate;
};

var getLimit = function(opts){
  if(getRate(opts)) return parseInt(getMatches(opts)[1], 10);
  if(typeof opts.limit === 'function') return opts.limit();
  return opts.limit;
};

var getWindow = function(opts){
  if(getRate(opts)) return moment.duration(1, getMatches(opts)[2]) / 1000;
  if(typeof opts.window === 'function') return opts.window();
  return opts.window;
};

var getKey = function(opts){
  if(typeof opts.key === 'function') return opts.key;
  return keyShorthands[opts.key];
};

var validate = function(opts){
  assert.equal(typeof opts.redis, 'object', 'Invalid redis client');
  assert.equal(typeof getKey(opts), 'function', 'Invalid key: ' + opts.key);
  if(opts.rate) assert.ok(getMatches(opts), 'Invalid rate: ' + getRate(opts));
  assert.equal(typeof getLimit(opts), 'number', 'Invalid limit: ' + getLimit(opts));
  assert.equal(typeof getWindow(opts), 'number', 'Invalid window: ' + getWindow(opts));
  assert.notEqual(getLimit(opts), 0,  'Invalid rate limit: ' + getRate(opts));
  assert.notEqual(getWindow(opts), 0, 'Invalid rate window: ' + getRate(opts));
};

canonical = function(opts) {
  validate(opts);
  return {
    redis: opts.redis,
    key: getKey(opts),
    rate: getRate.bind(null, opts),
    limit: getLimit.bind(null, opts),
    window: getWindow.bind(null, opts),
    deleteImmediatelyIfRaceCondition: opts.deleteImmediatelyIfRaceCondition,
    onPossibleRaceCondition: opts.onPossibleRaceCondition
  };
};

module.exports = {
  canonical: canonical
};
