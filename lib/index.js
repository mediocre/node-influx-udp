var dgram = require('dgram');
var util = require('util');

var _ = require('lodash');

var timeScales = {
    microsecond: 1e3,
    millisecond: 1e6,
    nanosecond: 1,
    second: 1e9
};

var InfluxUdp = function influxUdp(opts) {
    opts = opts || {};
    this.host = opts.host || '127.0.0.1';
    this.port = opts.port || 4444;
    this.protocol = opts.protocol || 'line';
    this.reportTime = opts.reportTime || true;
    this.socket = dgram.createSocket(opts.socketType || 'udp4');
    this.timeScale = timeScales[opts.timeScale] || 1;

    if (!messageBuilders[this.protocol]) {
        throw new Error('Invalid protocol');
    }
};

function convertPointToLine(name, point) {
    time = (point.time || new Date()).valueOf();
    delete point.time;

    return name +
        _.reduce(point, function(line, value, key) {
            return line + util.format(' %s=%s ', key, value);
        }, '') +
        this.reportTime ? ' ' + (time * this.timeScale) : '';
}

function lineProtocol(points) {
    return new Buffer(
        _.reduce(points, function(arr, value, key) {
            if (Array.isArray(value)) {
                return arr.concat(value.map(_.partial(convertPointToLine, key)));
            }
            return arr.concat(convertPointToLine(key, value));
        }, []).join('\n')
    );
}

function jsonProtocol(points) {
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

        if (this.reportTime) {
            values.forEach(function(value) {
                if (!value.time) {
                    value.time = (value.time || new Date()).valueOf();
                }
            });
        } else {
            values.forEach(function(value) {
                delete value.time;
            });
        }

        result.points = values.map(keysToValues(result.columns));
        results.push(result);
    }

    return new Buffer(JSON.stringify(results));
}

function keysToValues(columns) {
    return function(values) {
        return columns.map(function(column) {
            return values[column];
        });
    };
}

var messageBuilders = {
    json: jsonProtocol,
    line: lineProtocol
};

InfluxUdp.prototype.send = function influxSend(points) {
    if (!messageBuilders[this.protocol]) {
        throw new Error('Invalid protocol');
    }
    var message = messageBuilders[this.protocol](points);

    this.socket.send(message, 0, message.length, this.port, this.host);

    return results;
};


module.exports = InfluxUdp;
