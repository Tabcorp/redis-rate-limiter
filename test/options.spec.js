require('should');
var options = require('../lib/options');

describe('Options', function() {

  describe('key', function() {

    it('can specify a function', function() {
      var opts = options.canonical({
        redis: {},
        key: function(req) { return req.id; },
        limit: 10,
        window: 60
      });
      opts.key({
        id: 5
      }).should.eql(5);
    });

    it('can be the full client IP', function() {
      var opts = options.canonical({
        redis: {},
        key: 'ip',
        limit: 10,
        window: 60
      });
      opts.key({
        connection: { remoteAddress: '1.2.3.4' }
      }).should.eql('1.2.3.4');
    });

    it('can be the client IP/32 mask', function() {
      var opts = options.canonical({
        redis: {},
        key: 'ip/32',
        limit: 10,
        window: 60
      });
      opts.key({
        connection: { remoteAddress: '1.2.3.4' }
      }).should.eql('1.2.3.0/32');
    });

    it('fails for invalid keys', function() {
      (function() {
        var opts = options.canonical({
          redis: {},
          key: 'something',
          limit: 10,
          window: 60
        });
      }).should.throw('Invalid key: something');
    });

  });

  describe('limit and window', function() {

    it('should accept numeric values in seconds', function() {
      var opts = options.canonical({
        redis: {},
        key: 'ip',
        limit: 10,   // 10 requests
        window: 60   // per 60 seconds
      });
      opts.limit.should.eql(10);
      opts.window.should.eql(60);
    });

  });

  describe('rate shorthand notation', function() {

    function assertRate(rate, limit, window) {
      var opts = options.canonical({
        redis: {},
        key: 'ip',
        rate: rate
      });
      opts.limit.should.eql(limit, 'Wrong limit for rate ' + rate);
      opts.window.should.eql(window, 'Wrong window for rate ' + rate);
    }

    it('can use the full unit name (x/second)', function() {
      assertRate('10/second', 10, 1);
      assertRate('100/minute', 100, 60);
      assertRate('1000/hour', 1000, 3600);
      assertRate('5000/day', 5000, 86400);
    });

    it('can use the short unit name (x/s)', function() {
      assertRate('10/s', 10, 1);
      assertRate('100/m', 100, 60);
      assertRate('1000/h', 1000, 3600);
      assertRate('5000/d', 5000, 86400);
    });

    it('has to be a valid rate', function() {
      (function() {
        var opts = options.canonical({
          redis: {},
          key: 'ip',
          rate: '50 things'
        });
      }).should.throw('Invalid rate: 50 things');
    });

  });

});
