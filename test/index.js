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
        "metric1,tkey1=tval1,tkey2=tval2 fkey=\"fval\",fkey2=\"fval2\" 1468430065292"
    );
    scope.done();
    done();
});

test('should properly format typed values', function(done) {
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
                values: { fkey: "string_val", fkey2: true, fkey3: 12345 },
                tags: { tkey1: "tval1", tkey2: "tval2" },
                time: 1468430065292
            }
        ]
    });

    assert.equal(
        scope.buffer.toString(),
        "metric1,tkey1=tval1,tkey2=tval2 fkey=\"string_val\",fkey2=true,fkey3=12345 1468430065292"
    );
    scope.done();
    done();
})

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
