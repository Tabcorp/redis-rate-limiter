var _            = require('lodash');
var async        = require('async');
var should       = require('should');
var connect      = require('connect');
var supertest    = require('supertest');
var RateLimiter  = require('../lib/index');

describe('Rate-limit middleware', function() {

  this.slow(5000);
  this.timeout(5000);

  var limiter = null;

  before(function(done) {
    limiter = new RateLimiter({redis: 'redis://localhost:6379'});
    limiter.client.on('connect', done);
  });

  beforeEach(function(done) {
    limiter.client.del('ratelimit:127.0.0.1', done);
  });

  describe('IP throttling', function() {

    it('works under the limit', function(done) {
      var server = connect();
      server.use(limiter.middleware({key: 'ip', rate: '10 req/second'}));
      server.use(fastResponse);
      var reqs = requests(server, '/test', 9);
      async.parallel(reqs, function(err, data) {
        withStatus(data, 200).should.have.length(9);
        done();
      });
    });

    it('fails over the limit', function(done) {
      var server = connect();
      server.use(limiter.middleware({key: 'ip', rate: '10 req/second'}));
      server.use(fastResponse);
      var reqs = requests(server, '/test', 12);
      async.parallel(reqs, function(err, data) {
        withStatus(data, 200).should.have.length(10);
        withStatus(data, 429).should.have.length(2);
        done();
      });
    });

    it('can go under / over / under', function(done) {
      var server = connect();
      server.use(limiter.middleware({key: 'ip', rate: '10 req/second'}));
      server.use(fastResponse);
      async.series([
        function(next) { async.parallel(requests(server, '/test', 9), next); },
        function(next) { setTimeout(next, 1100); },
        function(next) { async.parallel(requests(server, '/test', 12), next); },
        function(next) { setTimeout(next, 1100); },
        function(next) { async.parallel(requests(server, '/test', 9), next); }
      ], function(err, data) {
        withStatus(data[0], 200).should.have.length(9);
        withStatus(data[2], 200).should.have.length(10);
        withStatus(data[2], 429).should.have.length(2);
        withStatus(data[4], 200).should.have.length(9);
        done();
      });
    });

  });

  describe('Custom key throttling', function() {

  });

});



  // describe 'Account throttling', ->
  //
  //   it 'concurrent requests (different accounts)', (done) ->
  //     server.use authToken
  //     server.use restify.throttle(username: true, burst: 2, rate: 0)
  //     server.get '/test', slowResponse
  //     reqs = [
  //       (next) -> request(server).get('/test?username=bob').end(next)
  //       (next) -> request(server).get('/test?username=jane').end(next)
  //       (next) -> request(server).get('/test?username=john').end(next)
  //     ]
  //     async.parallel reqs, (err, data) ->
  //       withStatus(data, 200).should.have.length 3
  //       done()
  //
  //   it 'concurrent requests (under the limit)', (done) ->
  //     server.use authToken
  //     server.use restify.throttle(username: true, burst: 3, rate: 0)
  //     server.get '/test', slowResponse
  //     reqs = [
  //       (next) -> request(server).get('/test').end(next)
  //       (next) -> request(server).get('/test').end(next)
  //     ]
  //     async.parallel reqs, (err, data) ->
  //       withStatus(data, 200).should.have.length 2
  //       done()
  //
  //   it 'concurrent requests (over the limit)', (done) ->
  //     server.use authToken
  //     server.use restify.throttle(username: true, burst: 2, rate: 0)
  //     server.get '/test', slowResponse
  //     reqs = [
  //       (next) -> request(server).get('/test?username=bob').end(next)
  //       (next) -> request(server).get('/test?username=bob').end(next)
  //       (next) -> request(server).get('/test?username=bob').end(next)
  //     ]
  //     async.parallel reqs, (err, data) ->
  //       withStatus(data, 200).should.have.length 2
  //       withStatus(data, 429).should.have.length 1
  //       done()

function request(server, url) {
  return function(next) {
    supertest(server).get('/test').end(next);
  };
}

function requests(server, url, count) {
  return _.times(count, function() {
    return request(server, url);
  });
}

function fastResponse(req, res, next) {
  res.writeHead(200);
  res.end('ok');
}

function withStatus(data, code) {
  var pretty = data.map(function(d) {
    return {
      statusCode: d.res.statusCode,
      body: d.res.body
    }
  });
  // console.log('pretty', pretty)
  return _.filter(pretty, {statusCode: code});
}
