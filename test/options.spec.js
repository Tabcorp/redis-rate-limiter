require('should');
var options = require('../lib/options');

describe('Options', function() {

  describe('key', function() {

    it('can specify a function', function() {
      var opts = options.canonical({
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
        key: 'ip',
        limit: 10,   // 10 requests
        window: 60   // per 60 seconds
      });
      opts.limit.should.eql(10);
      opts.window.should.eql(60);
    });

  });

  describe('rate shorthand notation', function() {

    it('X req/second', function() {
      var opts = options.canonical({
        key: 'ip',
        rate: '10 req/second'
      });
      opts.limit.should.eql(10);
      opts.window.should.eql(1);
    });

    it('X req/minute', function() {
      var opts = options.canonical({
        key: 'ip',
        rate: '20 req/minute'
      });
      opts.limit.should.eql(20);
      opts.window.should.eql(60);
    });

    it('X req/hour', function() {
      var opts = options.canonical({
        key: 'ip',
        rate: '1000 req/hour'
      });
      opts.limit.should.eql(1000);
      opts.window.should.eql(3600);
    });

    it('X req/day', function() {
      var opts = options.canonical({
        key: 'ip',
        rate: '5000 req/day'
      });
      opts.limit.should.eql(5000);
      opts.window.should.eql(86400);
    });

    it('has to be a valid rate', function() {
      (function() {
        var opts = options.canonical({
          key: 'ip',
          rate: '50 things'
        });
      }).should.throw('Invalid rate: 50 things');
    });

  });

});
