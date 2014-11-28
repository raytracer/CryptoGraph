var receiveMessageCreator = function(name, postViewModel, friendViewModel) {
    return function(data) {
		var showMessage = function(message) {
			if ("Notification" in window && Notification.permission === "granted" &&
					(document.hidden || !document.hasFocus())) {
				var n = new Notification(message);
				n.onshow = function () { 
					setTimeout(n.close.bind(n), 5000); 
				};
			}
		};

        var localdata = JSON.parse(sessionStorage[name]);
        var BigInteger = forge.jsbn.BigInteger;
        var pem = localdata.pem;

        var privateKey = forge.pki.privateKeyFromPem(pem);
        var message = forge.util.decodeUtf8(privateKey.decrypt(data.message));

        var md = forge.md.sha1.create();
        md.update(message, 'utf8');

        $.post('/user/getpublickey', {'name' : data.from}, function(pk) {
            if (pk === false) {
                return;
            }

            var publicKey = forge.pki.setRsaPublicKey(new BigInteger(pk.n), new BigInteger(pk.e));

            if (publicKey.verify(md.digest().bytes(), data.signature)
                && postViewModel.ids[data._id] === undefined) {
                    postViewModel.ids[data._id] = data._id;
                    var safemessage = $('<div>').text(message).html();
					showMessage(safemessage);
                    safemessage = safemessage.replace(/(?:\r\n|\r|\n)/g, '<br />');
                    postViewModel.posts.unshift(new Post(data.from, data.time, safemessage, data.recipients, name, friendViewModel));
                }
        });
    }
};
