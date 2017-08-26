var dgram = require('dgram');

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
    this.reportTime = opts.reportTime == undefined ? true : opts.reportTime;
    this.socketType = opts.socketType || 'udp4';
    this.timeScale = timeScales[opts.timeScale] || 1;

    this.encode = this.protocol == 'udp' ? this.lineProtocol :
                  this.protocol == 'line' ? this.lineProtocol :
                  this.protocol == 'json' ? this.jsonProtocol :
                  undefined;

    if (!this.encode) {
        throw new Error('Invalid protocol: ' + this.protocol);
    }
};

InfluxUdp.prototype.lineProtocol = function(points) {
    var self = this;

    function convertObjectToKV(obj, quoteStrings) {
        return Object.keys(obj).map(function(key) {
            var value = obj[key];

            if (typeof value === 'string') {
                if (quoteStrings) {
                    value = `"${value}"`;
                } else {
                    value = value.replace(/ /g, '\\ ').replace(/,/g, '\\,').replace(/=/g, '\\=');
                }
            }

            return key + '=' + value;
        }).join(',');
    }

    function convertPointToLine(seriesName, point) {
        var time = (point.time || new Date()).valueOf();
        delete point.time;
        return [
            seriesName,
            point.tags ? ',' : '',
            convertObjectToKV(point.tags || {}),
            ' ',
            convertObjectToKV(point.values, true),
            self.reportTime ? ' ' + (time * self.timeScale) : ''
        ].join('');
    }

    return new Buffer(
        _.reduce(points, function(arr, value, key) {
            var convert = _.bind(_.partial(convertPointToLine, key), self);
            return arr.concat(
                Array.isArray(value) ? value.map(convert) :
                                       convertPointToLine(key, value)
            );
        }, []).join('\n')
    );
};

InfluxUdp.prototype.jsonProtocol = function(points) {
    function keysToValues(columns) {
        return function(values) {
            return columns.map(function(column) {
                return values[column];
            });
        };
    }

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
};

InfluxUdp.prototype.send = function influxSend(points) {
    var message = this.encode(points);
    var socket = dgram.createSocket(this.socketType);

    socket.send(message, 0, message.length, this.port, this.host, function () {
        socket.close();
    });
};

InfluxUdp.prototype.writePoints = function(seriesName, points, options, cb) {
    var callback = (typeof options == 'function') ? options :
                   (typeof cb == 'function') ? cb :
                   undefined;

    var data = {};

    data[seriesName] = points.map(function(point) {
        var v = point[0],
            value = _.isObject(v) && !_.isUndefined(v.value) ? v : { value: v },
            time = value.time;

        delete value.time;

        return {
            values: value,
            tags: point[1],
            time: time
        };
    });

    this.send(data);

    if (callback) {
        callback();
    }
};

module.exports = InfluxUdp;
