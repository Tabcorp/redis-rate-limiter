var _            = require('lodash');
var async        = require('async');
var should       = require('should');
var redis        = require('redis');
var rateLimiter  = require('../lib/rate-limiter');

describe('Rate-limiter', function() {

  this.slow(5000);
  this.timeout(5000);

  var client  = null;

  before(function(done) {
    client = redis.createClient(6379, 'localhost', {enable_offline_queue: false});
    client.on('ready', done);
  });

  beforeEach(function(done) {
    async.series([
      client.del.bind(client, 'ratelimit:a'),
      client.del.bind(client, 'ratelimit:b'),
      client.del.bind(client, 'ratelimit:c')
    ], done);
  });

  it('calls back with the rate data', function(done) {
    var limiter = createLimiter('10/second');
    var reqs = request(limiter, 5, {id: 'a'});
    async.parallel(reqs, function(err, rates) {
      _.map(rates, 'current').should.eql([1, 2, 3, 4, 5]);
      _.each(rates, function(r) {
        r.key.should.eql('a');
        r.limit.should.eql(10);
        r.window.should.eql(1);
        r.over.should.eql(false);
      });
      done();
    });
  });

  it('sets the over flag when above the limit', function(done) {
    var limiter = createLimiter('10/second');
    var reqs = request(limiter, 15, {id: 'a'});
    async.parallel(reqs, function(err, rates) {
      _.each(rates, function(r, index) {
        rates[index].over.should.eql(index >= 10);
      });
      done();
    });
  });

  it('uses one bucket per key', function(done) {
    var limiter = createLimiter('10/second');
    var reqs = _.flatten([
      request(limiter, 10, {id: 'a'}),
      request(limiter, 12, {id: 'b'}),
      request(limiter, 10, {id: 'c'})
    ]);
    async.parallel(reqs, function(err, rates) {
      _.filter(rates, {over: true}).should.have.length(2);
      done();
    });
  });

  it('can handle a lot of requests', function(done) {
    var limiter = createLimiter('1000/second');
    var reqs = request(limiter, 1200, {id: 'a'});
    async.parallel(reqs, function(err, rates) {
      rates[999].should.have.property('over', false);
      rates[1000].should.have.property('over', true);
      done();
    });
  });

  it('resets after the window', function(done) {
    var limiter = createLimiter('10/second');
    async.series([
      requestParallel(limiter, 15, {id: 'a'}),
      wait(1100),
      requestParallel(limiter, 15, {id: 'a'})
    ], function(err, data) {
      _.each(data[0], function(rate, index) {
        rate.should.have.property('over', index > 9);
      });
      _.each(data[2], function(rate, index) {
        rate.should.have.property('over', index > 9);
      });
      done();
    });
  });

  function createLimiter(rate) {
    return rateLimiter({
      redis: client,
      key: function(x) { return x.id },
      rate: rate
    });
  }

  function request(limiter, count, data) {
    return _.times(count, function() {
      return function(next) {
        limiter(data, next);
      };
    });
  }

  function requestParallel(limiter, count, data) {
    return function(next) {
      async.parallel(request(limiter, count, data), next);
    };
  }

  function wait(millis) {
    return function(next) {
      setTimeout(next, 1100);
    };
  }

});
