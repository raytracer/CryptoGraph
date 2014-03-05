var saveMessage = function (db, message) {
    var messageNode = {
        'props': {
            'name': message.name,
            'message': message.message,
            'from': message.from,
            'time': message.time,
            'read': message.read,
            'signature': message.signature
        }
    };

    db.query('CREATE (m:message {props}) RETURN id(m) as id', messageNode, function (err, results) {
        if (err || results.length < 1) {
            return;
        }

        var relationshipTo = {
            'props': {
                'name': message.name,
                'id': results[0].id
            }
        };

        db.query("MATCH (m:message),(u:user) \
                  WHERE id(m) = {props}.id AND u.name = {props}.name \
                  CREATE (m)-[r:TO]->(u) \
                  RETURN r", relationshipTo, function (err, results) {
        });
    });
};

var getMessagesByName = function(db, name, read, callback) {
    var data = {
        'props': {
            'name': name,
            'read': read
        }
    };

    db.query("MATCH (u:user { name: {props}.name})<-[:TO]-(m:message { read: {props}.read}) \
             RETURN m ORDER BY m.time DESC", data, function (err, results) {
                 if (err) {
                     return;
                 }

                 var messages = [];

                 for (var i = 0; i < results.length; i++) {
                    messages.push(results[i].m._data.data);
                 }

                 callback(messages);
    });
}

exports.saveMessage = saveMessage;
exports.getMessagesByName = getMessagesByName;
