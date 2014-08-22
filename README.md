# redis-rate-limiter

Rate-limit any operation, backed by Redis.

- Inspired by [ratelimiter](https://www.npmjs.org/package/ratelimiter)
- But uses a fixed-window algorithm
- Great performance (>10000 checks/sec on local redis)
- No race conditions

Very easy to plug into `Express` or `Restify` to rate limit your `Node.js` API.

## Usage

Step 1: create a Redis connection

```js
var redis = require('redis');
var client = redis.createClient(6379, 'localhost', {enable_offline_queue: false});
```

Step 2: create your rate limiter

```js
var rateLimiter = require('redis-rate-limiter');
var limit = rateLimiter.create({
  redis: client,
  key: function(x) { return x.id },
  rate: '100/minute'
});
```

And go

```js
limit(request, function(err, rate) {
  if (err) {
    console.warn('Rate limiting not available');
  } else {
    console.log('Rate window: '  + rate.window);  // 60
    console.log('Rate limit: '   + rate.limit);   // 100
    console.log('Rate current: ' + rate.current); // 74
    if (rate.over) {
      console.error('Over the limit!');
    }
  }
});
```

## Options

### `redis`

A pre-created Redis client.
Make sure offline queueing is disabled.

```js
var client = redis.createClient(6379, 'localhost', {
  enable_offline_queue: false
});
```

### `key`

The key is how requests are grouped for rate-limiting.
Typically, this would be a user ID, a type of operation...
There are several helpers built-in:

```js
// identify users by IP
key: 'ip'

// identify users by their IP network (255.255.255.0 mask)
key: 'ip/32'

// identify users by the X-Forwarded-For header
// careful: this is just an HTTP header and can easily be spoofed
key: 'x-forwarded-for'
```

You can also specify any custom function:

```js
// rate-limit each user separately
key: function(x) { return x.user.id; }

// rate limit per user and operation type
key: function(x) { return x.user.id + ':' + x.operation; }

// rate limit everyone in the same bucket
key: function(x) { return 'single-bucket'; }
```

### `window`

This is the duration over which rate-limiting is applied, in seconds.

```js
// rate limit per minute
window: 60

// rate limit per hour
window: 3600
```

Note that this is **not a rolling window**.
If you specify `10 requests / minute`, a user would be able
to execute 10 requests at `00:59` and another 10 at `01:01`.
Then they won't be able to make another request until `02:00`.


### `limit`

This is the total number of requests a unique `key` can make during the `window`.

```js
limit: 100
```

### `rate`

Rate is a shorthand notation to combine `limit` and `window`.

```js
rate: '10/second'
rate: '100/minute'
rate: '1000/hour'
```

Or the even shorter

```js
rate: '10/s'
rate: '100/m'
rate: '100/h'
```

*Note:* the rate is parsed ahead of time, so this notation doesn't affect performance.

## HTTP middleware

This package  contains a pre-built middleware,
which takes the same options


```js
var rateLimiter = require('redis-rate-limiter');

var middleware = rateLimiter.middleware({
  redis: client,
  key: 'ip',
  rate: '100/minute'
});

server.use(middleware);
```

It rejects any rate-limited requests with a status code of `HTTP 429`,
and an empty body.
