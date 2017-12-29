var rateLimiter = require('./rate-limiter');

var defaultFailMessage = 'Rate limit exceeded, retry after {after}ms';

module.exports = function(opts) {
  var limiter = rateLimiter(opts);
  return function(req, res, next) {
    limiter(req, function(err, rate) {
      if (err) {
        next();
      } else {
        res.set({
          'X-RateLimit-Limit': rate.limit,
          'X-RateLimit-Remaining': rate.current > rate.limit ? 0 : rate.limit - rate.current,
          'X-RateLimit-Reset': (rate.reset / 1000) | 0
        });
        if (rate.current > rate.limit) {
          var after = rate.reset - Date.now();
          var failMessage = defaultFailMessage;
          res.set('Retry-After', (after / 1000) | 0);
          if(opts.failMessage) {
            if(typeof opts.failMessage === 'function') {
              failMessage = opts.failMessage(req);
            }
            else {
              failMessage = opts.failMessage;
            }
          }
          res.status(429).send(failMessage.replace(/{after}/g, after));
          res.end();
        } else {
          next();
        }
      }
    });
  };
};
