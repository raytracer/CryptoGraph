var saveMessage = function (db, message) {
	db.collection("messages", function(err, messagesCol) {
		messagesCol.insert(message, function() {
		});
	});
};

var getMessagesByName = function(db, name, time, limit, callback) {
	db.collection("messages", function(err, messagesCol) {
		messagesCol.find({to: name, time: {'$gte': time}}).limit(limit).sort({time: -1}).toArray(function(err, results) {
			if (err || results.length < 1) {
				callback([]);
			} else {
				callback(results);
			}
		});
	});
}

exports.saveMessage = saveMessage;
exports.getMessagesByName = getMessagesByName;
