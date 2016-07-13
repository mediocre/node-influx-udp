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
    this.socketType = opts.socketType || 'udp4';
    this.timeScale = timeScales[opts.timeScale] || 1;

    this.encode = this.protocol == 'line' ? this.lineProtocol :
                  this.protocol == 'json' ? this.jsonProtocol :
                  undefined;

    if (!this.encode) {
        throw new Error('Invalid protocol: ' + this.encode);
    }
};

InfluxUdp.prototype.convertObjectToKV = function(obj) {
    return Object.keys(obj).map(function(key) {
        return key + '=' + obj[key]
    }).join(',');
}

InfluxUdp.prototype.convertPointToLine = function(seriesName, point) {
    var time = (point.time || new Date()).valueOf();
    delete point.time;
    return [
        seriesName,
        point.tags ? ',' : '',
        this.convertObjectToKV(point.tags || {}),
        ' ',
        this.convertObjectToKV(point.values),
        this.reportTime ? ' ' + (time * this.timeScale) : ''
    ].join('');
}

InfluxUdp.prototype.lineProtocol = function(points) {
    var self = this;
    return new Buffer(
        _.reduce(points, function(arr, value, key) {
            var convert = _.bind(_.partial(self.convertPointToLine, key), self);
            if (Array.isArray(value)) {
                return arr.concat(value.map(convert));
            }
            return arr.concat(self.convertPointToLine(key, value));
        }, []).join('\n')
    );
}

InfluxUdp.prototype.jsonProtocol = function(points) {
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

        result.points = values.map(this.keysToValues(result.columns));
        results.push(result);
    }

    return new Buffer(JSON.stringify(results));
}

InfluxUdp.prototype.keysToValues = function(columns) {
    return function(values) {
        return columns.map(function(column) {
            return values[column];
        });
    };
}

InfluxUdp.prototype.send = function influxSend(points) {
    var message = this.encode(points);
    var socket = dgram.createSocket(this.socketType);

    socket.send(message, 0, message.length, this.port, this.host, function () {
        socket.close();
    });
};

module.exports = InfluxUdp;
