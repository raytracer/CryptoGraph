var Primus = require('primus');

var startPrimus = function (server) {
    var primus = new Primus(server, {transformer: 'engine.io'});

    //TODO: far from ideal (is there no getById in primus?)
    var nameToSparkId = {};
    var sparkIdToUserId = {};
    var sparks = {};

    primus.on('connection', function connection(spark) {
      console.log('new connection');

      spark.on('data', function (data) {
          if (data.name !== undefined &&  nameToSparkId[data.name] === undefined) {
              nameToSparkId[data.name] = [this.id];
              sparkIdToUserId[this.id] = data.name;
              sparks[this.id] = this;
          } else if (data.name !== undefined) {
              nameToSparkId[data.name].push(this.id);
              sparkIdToUserId[this.id] = data.name;
              sparks[this.id] = this;
          } else if (data.messages !== undefined) {
              for (var i = 0; i < data.messages.length; i++) {
                  var name = data.messages[i].name;

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
};

exports.startPrimus = startPrimus;

