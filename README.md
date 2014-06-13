influx-udp
==========

What
----
Write to InfluxDB using its UDP interface.

When to use this
----------------
* When you need to write frequently and quickly
* When the speed of writes is more important than their reliability
* When you would use statsd, but you need to store more than simple numeric data

When not to use this
--------------------
* If you need to read from InfluxDB
* When you need to be absolutely certain every write has succeeded
* If you want any confirmation from InfluxDB whatsoever

Where to get this
-----------------
`npm install --save influx-udp`

How to use this
---------------
Configure InfluxDB for UDP: http://influxdb.com/docs/v0.7/api/reading_and_writing_data.html#writing-data-through-json-+-udp

```javascript

var InfluxUdp = require('../influx-udp/index');

var influxClient = new InfluxUdp({
    port: 4444,
    host: '127.0.0.1'
});

var data = {
    visitors: [
        {
            ip: '127.0.0.1',
            username: 'harrison'
        },
        {
            ip: '192.168.0.1',
            username: 'shawn'
        }
    ]
}

influxClient.send(data);

/* Sends this, which will put two points into the "visitors" time series:
[
    {
        "name": "visitors",
        "columns": ["ip", "username"],
        "points": [
            ["127.0.0.1", "harrison"],
            ["192.168.0.1", "shawn"]
        ]
    }
]
*/

```
