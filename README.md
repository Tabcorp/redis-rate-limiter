# connect-rate-limiter

Rate-limit your `Node.js` API, backed by Redis.

- easy to configure
- can set limits for different routes
- tested under heavy load for race conditions

[![NPM](http://img.shields.io/npm/v/redis-rate-limiter.svg?style=flat)](https://npmjs.org/package/redis-rate-limiter)
[![License](http://img.shields.io/npm/l/redis-rate-limiter.svg?style=flat)](https://github.com/TabDigital/redis-rate-limiter)

[![Build Status](http://img.shields.io/travis/TabDigital/redis-rate-limiter.svg?style=flat)](http://travis-ci.org/TabDigital/redis-rate-limiter)
[![Dependencies](http://img.shields.io/david/TabDigital/redis-rate-limiter.svg?style=flat)](https://david-dm.org/TabDigital/redis-rate-limiter)
[![Dev dependencies](http://img.shields.io/david/dev/TabDigital/redis-rate-limiter.svg?style=flat)](https://david-dm.org/TabDigital/redis-rate-limiter)

The simplest example is

```coffee
RateLimiter = require 'connect-rate-limiter'

limiter = new RateLimiter(redis: 'redis://localhost:6379')
server.use limiter.middleware(key: 'ip', rate: '10 req/second')
```

That's it!
No one will be able to make more than 10 requests per second from a given IP.

## Events

You can listen to the `accepted` event to apply extra logic, for example adding custom headers.

```coffee
limiter.on 'accepted', (rate, req, res) ->
  res.headers('X-RateLimit-Window',  rate.window)   # 60   = 1 minute
  res.headers('X-RateLimit-Total',   rate.total)    # 100  = 100 req/minute
  res.headers('X-RateLimit-Current', rate.current)  # 35   = 35 out of 100
```

By default, rate-limited requests get terminated with a status code of `429`.
You can listen to the `rejected` event to override this behaviour.
If you attach an event handler, you **must** terminate the request yourself.

```coffee
limiter.on 'rejected', (rate, req, res, next) ->
  res.send 429, 'Too many requests'
  # or for example
  next new restify.RequestThrottledError('Too many requests')
```

Finally, if Redis is not available the middleware won't apply any rate-limiting.
You can catch that event for logging purposes.

```coffee
limiter.on 'unavailable', (err) ->
  console.log 'Failed to rate limit', err
```

# Rate-limiting key

Rate-limiting is applied per user - which are identified with a unique key.
There are several helpers built-in:

```coffee
# identify users by IP
key: 'ip'

# identify users by their IP network (255.255.255.0 mask)
key: 'ip/32'

# identify users by the X-Forwarded-For header
# careful: this is just an HTTP header and can easily be spoofed
key: 'x-forwarded-for'
```

You can also specify a custom function to extract the key from the request.

```coffee
# use your own custom function
key: (req) -> req.body.account.number
```

# Request rate

The rate is made of two components.

```coffee
limit: 100   # 100 requests
window: 60   # per minute
```

You can also use a shorthand notation using the `rate` property.

```coffee
rate: '10 req/second'
rate: '200 req/minute'
rate: '5000 req/hour'
```

# Multiple limiters

You can combine several rate-limiters, either on the entire server or at the route level.

```coffee
# rate limit the whole server to 10/sec from any IP
server.use limiter.middleware(key: 'ip', rate: '10 req/second')

# but you also can't create more than 1 user/min from a given IP
server.post '/api/users',
  limiter.middleware(key: 'ip', rate: '5 req/minute'),
  controller.create
```

You can also apply several limiters with different criteria.
They will be executed in series, as a logical `AND`.

```coffee
# no more than 100 requests per IP
# and no more than 10 requests per account
server.use limiter.middleware(key: uniqueIp, rate: '100 req/second')
server.use limiter.middleware(key: accountNumber, rate: '50 req/minute')
```
