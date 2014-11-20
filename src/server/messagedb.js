var saveMessage = function (db, message) {
	db.messages.insert(message);
};

var getMessagesByName = function(db, name, callback) {
	db.messages.find({to: name}).find({date: -1}).toArray(function(err, results) {
		if (err || results.length < 1) {
			callback([]);
		} else {
			callback(results);
		}
	});
}

exports.saveMessage = saveMessage;
exports.getMessagesByName = getMessagesByName;
