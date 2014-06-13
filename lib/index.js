var dgram = require('dgram');

var _ = require('lodash');

var InfluxUdp = function influxUdp(opts) {
    opts = opts || {};
    this.host = opts.host || '127.0.0.1';
    this.port = opts.port || 4444;
    this.socket = dgram.createSocket('udp4');
};

function keysToValues(columns) {
    return function(values) {
        return columns.map(function(column) {
            return values[column];
        });
    };
}

InfluxUdp.prototype.send = function influxSend(points) {
    var results = [];

    for (var name in points) {
        var values = points[name];
        var result = { name: name };

        if (Array.isArray(values)) {
            result.columns = _.chain(values).map(Object.keys).flatten().uniq().value();
        } else {
            result.columns = Object.keys(values);
            values = [values];
        }

        result.points = values.map(keysToValues(result.columns));
        results.push(result);
    }

    var message = new Buffer(JSON.stringify(results));
    this.socket.send(message, 0, message.length, this.port, this.host);

    return results;
};

module.exports = InfluxUdp;
