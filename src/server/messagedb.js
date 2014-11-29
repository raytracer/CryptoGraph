var saveMessage = function (db, message) {
	db.collection("messages", function(err, messagesCol) {
		messagesCol.insert(message, function() {
		});
	});
};

var getMessagesByName = function(db, name, time, limit, callback) {
	db.collection("messages", function(err, messagesCol) {
		messagesCol.find({'keys.name': name, time: {'$gte': time}}).limit(limit).sort({time: -1}).toArray(function(err, results) {
			if (err || results.length < 1) {
				callback([]);
			} else {
                for (var i = 0; i < results.length; i++) {
                    for (var j = 0; j < results[i].keys.length; j++) {
                        if (results[i].keys[j].name === name) {
                            results[i].encryptedKey = results[i].keys[j].key;
                        }
                    }
                    results[i].recipients = results[i].keys.map(function (k) {return k.name})
                                                           .filter(function (n) {return n !== results[i].from});
                    delete results[i].keys;
                }
				callback(results);
			}
		});
	});
}

exports.saveMessage = saveMessage;
exports.getMessagesByName = getMessagesByName;
