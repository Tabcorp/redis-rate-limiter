var options = require('./options');

module.exports = function(opts) {
  opts = options.canonical(opts);
  return function(request, callback) {
    var key = opts.key(request);
    var tempKey = 'ratelimittemp:' + key;
    var realKey = 'ratelimit:' + key;
    opts.redis.multi()
         .setex(tempKey, opts.window, 0)
         .renamenx(tempKey, realKey)
         .incr(realKey)
         .exec(function(err, results) {
           if(err) {
             callback(err);
           } else {
             var current = results[2];
             callback(null, {
               current: current,
               limit: opts.limit,
               window: opts.window,
               over: (current > opts.limit)
             });
           }
         });
  };
};
