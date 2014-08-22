var assert  = require('assert');
var moment  = require('moment');
var ip      = require('ip');

exports.canonical = function(opts) {

  var canon = {};

  // Redis connection
  assert.equal(typeof opts.redis, 'object', 'Invalid redis client');
  canon.redis = opts.redis;

  // Key function
  if (typeof opts.key === 'function') canon.key = opts.key;
  if (typeof opts.key === 'string')   canon.key = keyShorthands[opts.key];

  // Rate shorthand
  if (opts.rate) {
    assert.equal(typeof opts.rate, 'string', 'Invalid rate: ' + opts.rate);
    var match = opts.rate.match(/^(\d+)\s*\/\s*([a-z]+)$/);
    assert.ok(match, 'Invalid rate: ' + opts.rate);
    canon.limit = parseInt(match[1], 10);
    canon.window = moment.duration(1, match[2]) / 1000;
  }

  // Limit + window
  if (opts.limit)  canon.limit  = opts.limit;
  if (opts.window) canon.window = opts.window;

  // Check option types
  assert.equal(typeof canon.key, 'function', 'Invalid key: ' + opts.key);
  assert.equal(typeof canon.limit, 'number', 'Invalid limit: ' + canon.limit);
  assert.equal(typeof canon.window, 'number', 'Invalid window: ' + canon.window);

  return canon;
};


var keyShorthands = {
  'ip': function(req) {
    return req.connection.remoteAddress;
  },
  'ip/32': function (req) {
    return ip.mask(req.connection.remoteAddress, '255.255.255.0') + '/32';
  }
};
