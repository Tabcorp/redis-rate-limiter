var redis        = require('redis');
var util         = require('util');
var url          = require('url');
var EventEmitter = require('events').EventEmitter;
var options      = require('./options');

function RateLimiter(config) {
  var cnx = url.parse(config.redis);
  this.client = redis.createClient(cnx.port, cnx.hostname, {enable_offline_queue: false});
  this.client.on('error', this.emit.bind(this, 'unavailable'));
}

util.inherits(RateLimiter, EventEmitter);
module.exports = RateLimiter;

RateLimiter.prototype.middleware = function(opts) {
  var self = this;
  opts = options.canonical(opts);
  return function(req, res, next) {
    var key = opts.key(req);
    var tempKey = 'ratelimittemp:' + key;
    var realKey = 'ratelimit:' + key;
    self.client
        .multi()
        .setex(tempKey, opts.window, 0)
        .renamenx(tempKey, realKey)
        .incr(realKey)
        .exec(function(err, results) {
          if(err) {
            self.emit('unavailable', err);
            next();
          } else {
            var rate = {
              current: results[2],
              limit: opts.limit,
              window: opts.window
            };
            if (rate.current <= rate.limit) {
              self.emit('accepted', rate, req, res, next);
              next();
            } else {
              if (self.listeners('rejected').length === 0) {
                res.writeHead(429);
                res.end();
              } else {
                self.emit('rejected', rate, req, res, next);
              }
            }
          }
        });
  };
};
