
// Remove all rate-limiting keys from Redis
// To clean up tests
// Don't use in production because of bad O(n) performance
// See: http://redis.io/commands/keys
exports.allkeys = function(redisClient, done) {
  redisClient.keys('ratelimit*:*', function(err, keys) {
    if (err) return done();
    if (keys.length === 0) return done();
    redisClient.del.call(redisClient, keys, function(err) {
      done();
    });
  });
};
