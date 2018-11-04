var options = require('./options');

module.exports = function(opts) {
  opts = options.canonical(opts);
  return function(request, callback) {
    var key = opts.key(request);
    var tempKey = 'ratelimittemp:' + key;
    var realKey = 'ratelimit:' + key;
    opts.redis.multi()
         .setex(tempKey, opts.window(), 0)
         .renamenx(tempKey, realKey)
         .incr(realKey)
         .ttl(realKey)
         .exec(function(err, results) {
           if(err) {
             callback(err);
           } else {
             // if multi() used, ioredis returns an array of result set [err | null, value], we need to check the second parameter for such cases
             // see also: https://github.com/luin/ioredis/wiki/Migrating-from-node_redis
             const hasTimeToLive = Array.isArray(results[3]) ? results[3][1] : results[3];
             if (hasTimeToLive === -1) {  // automatically recover from possible race condition
               if (opts.deleteImmediatelyIfRaceCondition) {
                 opts.redis.del(realKey);
               } else {
                 opts.redis.expire(realKey, opts.window());
               }

               if (typeof opts.onPossibleRaceCondition === 'function') {
                 opts.onPossibleRaceCondition(realKey);
               }
             }
             const current = Array.isArray(results[2]) ? results[2][1] : results[2];
             callback(null, {
               key: key,
               current: current,
               limit: opts.limit(),
               window: opts.window(),
               over: (current > opts.limit())
             });
           }
         });
  };
};
