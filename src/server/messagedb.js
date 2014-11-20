var saveMessage = function (db, message) {
	db.collection("messages", function(err, messagesCol) {
		messagesCol.insert(message, function() {
		});
	});
};

var getMessagesByName = function(db, name, callback) {
	db.collection("messages", function(err, messagesCol) {
		messagesCol.find({to: name}).sort({date: -1}).toArray(function(err, results) {
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
