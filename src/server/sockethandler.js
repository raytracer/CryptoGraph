var Primus = require('primus'),
    jwt = require('jsonwebtoken'),
    mdb = require('./messagedb');

var startPrimus = function (server, db) {
    var primus = new Primus(server, {transformer: 'engine.io'});
    primus.use('substream', require('substream'));

    //TODO: far from ideal (is there no getById in primus?)
    var nameToSparkId = {};
    var sparkIdToName = {};
    var sparks = {};

    primus.on('connection', function connection(spark) {
        var username = spark.query.name;
        var token = spark.query.token;

        var messageStream = spark.substream('messageStream');
		var requestStream = spark.substream('requestStream');

        if (username !== undefined && token !== undefined) {
            jwt.verify(token, 'debug_secret', function(err, decoded) {
                if (err || decoded.name !== username) {
                    spark.end();
                    return;
                }

                if (nameToSparkId[username] === undefined) {
                    nameToSparkId[username] = [spark.id];
                    sparkIdToName[spark.id] = username;
                    sparks[spark.id] = spark;
                } else {
                    nameToSparkId[username].push(spark.id);
                    sparkIdToName[spark.id] = username;
                    sparks[spark.id] = spark;
                }

				var time = (new Date()).getTime() - 24 * 3600 * 1000;

                mdb.getMessagesByName(db, username, time, 10, function (messages) {
                    for (var i = 0; i < messages.length; i++) {
                        spark.substream('messageStream').write(messages[i]);
                    }
                });

                var sendMessage = function (data) {
                    if (data.messages !== undefined) {
                        for (var i = 0; i < data.messages.length; i++) {
                            var name = data.messages[i].name;
                            var allsparks = nameToSparkId[name];

                            var message = data.messages[i];
                            message.signature = data.signature;
                            message.read = false;
                            message.from = username;
							message.to = name;
                            message.time = (new Date()).getTime();
                            message.recipients = data.recipients;

                            if (allsparks !== undefined) {
                                for (var j = 0; j < allsparks.length; j++) {
                                    var spark = sparks[allsparks[j]];
                                    spark.substream('messageStream').write(message);

                                    message.read = true;
                                }
                            }

                            mdb.saveMessage(db, message);
                        }
                    }
                };

				var serviceRequest = function (data) {
					if (data.sendMore !== undefined) {
						var delay = data.sendMore;
						mdb.getMessagesByName(db, username, time - delay, 0, function (messages) {
							for (var i = 0; i < messages.length; i++) {
								spark.substream('messageStream').write(messages[i]);
							}
						});
					}
				};

				requestStream.on('data', serviceRequest);
                messageStream.on('data', sendMessage);

                spark.on('end', function () {
                    try {
                        var name = sparkIdToName[this.id];

                        var index = nameToSparkId[name].indexOf(this.id);

                        if (index > -1) {
                            nameToSparkId[name].splice(index, 1);
                        }

                        delete sparkIdToName[this.id];
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

