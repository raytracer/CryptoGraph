var receiveMessageCreator = function(name, postViewModel, friendViewModel, keyDict) {
    var localdata = JSON.parse(sessionStorage[name]);
    var pem = localdata.pem;
    var privateKey = forge.pki.privateKeyFromPem(pem);

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

        var BigInteger = forge.jsbn.BigInteger;

        var key = privateKey.decrypt(data.encryptedKey, 'RSA-OAEP');
        var decipher = forge.cipher.createDecipher('AES-CBC', key);
        decipher.start({iv: data.iv});
        decipher.update(forge.util.createBuffer(data.message));
        decipher.finish();
        var message = decipher.output.toString('utf8');
        var md = forge.md.sha1.create();
        md.update(message, 'utf8');

        var verifyKey = function(pk) {
            if (pk === false) {
                return;
            }
            if (keyDict[data.from] === undefined) {
                keyDict[data.from] = pk;
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
        }

        if (keyDict[data.from] === undefined) {
            $.post('/user/getpublickey', {'name' : data.from}, verifyKey);
        } else {
            verifyKey(keyDict[data.from]);
        }
    }
};
