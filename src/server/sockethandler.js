var Primus = require('primus'),
jwt = require('jsonwebtoken');

var startPrimus = function (server) {
    var primus = new Primus(server, {transformer: 'engine.io'});

    //TODO: far from ideal (is there no getById in primus?)
    var nameToSparkId = {};
    var sparkIdToUserId = {};
    var sparks = {};

    primus.on('connection', function connection(spark) {
        var username = spark.query.name;
        var token = spark.query.token;

        if (username !== undefined && token !== undefined) {
            jwt.verify(token, 'debug_secret', function(err, decoded) {
                if (err || decoded.name !== username) {
                    spark.end();
                    return;
                }

                if (nameToSparkId[username] === undefined) {
                    nameToSparkId[username] = [spark.id];
                    sparkIdToUserId[spark.id] = username;
                    sparks[spark.id] = spark;
                } else {
                    nameToSparkId[username].push(spark.id);
                    sparkIdToUserId[spark.id] = username;
                    sparks[spark.id] = spark;
                }

                spark.on('data', function (data) {
                    if (data.messages !== undefined) {
                        for (var i = 0; i < data.messages.length; i++) {
                            var name = data.messages[i].name;

                            //TODO: check if user exits
                            var allsparks = nameToSparkId[name];
                            for (var j = 0; j < allsparks.length; j++) {
                                var spark = sparks[allsparks[j]];
                                var message = data.messages[i];
                                message.signature = data.signature;

                                spark.write(message);
                            }
                        }
                    }
                });

                spark.on('end', function () {
                    try {
                        var name = sparkIdToUserId[this.id];

                        var index = nameToSparkId[name].indexOf(this.id);

                        if (index > -1) {
                            nameToSparkId[name].splice(index, 1);
                        }

                        delete sparkIdToUserId[this.id];
                        delete sparks[this.id];
                    } catch (e) {
                        console.log(this.id);
                    }
                });
            });
        } else {
            spark.end();
            return;
        }

    });
};

exports.startPrimus = startPrimus;

