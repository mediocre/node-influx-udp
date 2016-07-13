var mock_udp = require('mock-udp');
var assert = require('assert');

var InfluxUdp = require('../');

suite('influx-udp');

test('should send a single data point via UDP', function(done) {
   var influx_udp = new InfluxUdp({
     host: 'example.com',
     port: '8086',
     protocol: 'line',
     reportTime: true,
   });

    var scope = mock_udp('example.com:8086');

    influx_udp.send({
        'metric1': [
            {
                values: { fkey: "fval", fkey2: "fval2" },
                tags: { tkey1: "tval1", tkey2: "tval2" },
                time: 1468430065292
            }
        ]
    });

    assert.equal(
        scope.buffer.toString(),
        "metric1,tkey1=tval1,tkey2=tval2 fkey=fval,fkey2=fval2 1468430065292"
    );
    scope.done();
    done();
});

test('should send a single data point via UDP-json', function(done) {
   var influx_udp = new InfluxUdp({
     host: 'example.com',
     port: '8086',
     protocol: 'json',
     reportTime: true,
   });

    var scope = mock_udp('example.com:8086');

    influx_udp.send({
        'metric1': [
            {
                values: { fkey: "fval", fkey2: "fval2" },
                tags: { tkey1: "tval1", tkey2: "tval2" },
                time: 1468430065292
            }
        ]
    });

    assert.deepEqual(
        JSON.parse(scope.buffer.toString()),
        [{
            "name": "metric1",
            "columns": ["values", "tags", "time"],
            "points": [
                [
                    {"fkey": "fval", "fkey2": "fval2"},
                    {"tkey1": "tval1", "tkey2": "tval2"},
                    1468430065292 
                ]
            ]
        }]
    );
    scope.done();
    done();
});

test('writePoints method behaves like in node-influx', function(done) {
   var influx_udp = new InfluxUdp({
     host: 'example.com',
     port: '8086',
     protocol: 'line',
   });

    var scope = mock_udp('example.com:8086');

    // example from https://github.com/node-influx/node-influx#writepoints
    var points = [
      [{value: 232}, { tag: 'foobar'}],
      [{value: 212}, { someothertag: 'baz'}],
      [123, { foobar: 'baz'}],
      [{value: 122, time: 1234567}]
    ]

    influx_udp.writePoints('seriesname', points);

    assert.ok(
        scope.buffer.toString().match(new RegExp(
            "seriesname,tag=foobar value=232 [0-9]+\n" +
            "seriesname,someothertag=baz value=212 [0-9]+\n" +
            "seriesname,foobar=baz value=123 [0-9]+\n" +
            "seriesname value=122 1234567"
        )),
        scope.buffer.toString()
    );
    scope.done();
    done();
});
