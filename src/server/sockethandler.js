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
          } else if (data.message !== undefined) {
              // for now only send to the user
              var allsparks =  nameToSparkId[sparkIdToUserId[this.id]];
              for (var i = 0; i < allsparks.length; i++) {
                var spark = sparks[allsparks[i]];
                spark.write(data);
              }
          }
      });

      spark.on('end', function () {
          var name = sparkIdToUserId[this.id];

          var index =  nameToSparkId[name].indexOf(this.id);

          if (index > -1) {
              nameToSparkId[name].splice(index, 1);
          }

          delete sparkIdToUserId[this.id];
          delete sparks[this.id];
      });
    });
};

exports.startPrimus = startPrimus;

