var Primus = require('primus');

var startPrimus = function (server) {
    var primus = new Primus(server, {transformer: 'engine.io'});

    //TODO: far from ideal (is there no getById in primus?)
    var userIdToSparkId = {};
    var sparkIdToUserId = {};
    var sparks = {};

    primus.on('connection', function connection(spark) {
      console.log('new connection');

      spark.on('data', function (data) {
          if (data.id !== undefined && userIdToSparkId[data.id] === undefined) {
              userIdToSparkId[data.id] = [this.id];
              sparkIdToUserId[this.id] = data.id;
              sparks[this.id] = this;
          } else if (data.id !== undefined) {
              userIdToSparkId[data.id].push(this.id);
              sparkIdToUserId[this.id] = data.id;
              sparks[this.id] = this;
          } else if (data.message !== undefined) {
              // for now only send to the user
              var allsparks = userIdToSparkId[sparkIdToUserId[this.id]];
              for (var i = 0; i < allsparks.length; i++) {
                var spark = sparks[allsparks[i]];
                spark.write(data.message);
              }
          }
      });

      spark.on('end', function () {
          var userid = sparkIdToUserId[this.id];

          var index = userIdToSparkId[userid].indexOf(this.id);

          if (index > -1) {
              userIdToSparkId[userid].splice(index, 1);
          }

          delete sparkIdToUserId[this.id];
          delete sparks[this.id];
      });
    });
};

exports.startPrimus = startPrimus;

