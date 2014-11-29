var createSubmit = function(name, primus, keyDict) {
    return function(event) {
        var message = $('#message').val();

        if (message.length === 0) {
            event.preventDefault();
            return;
        }

        $('#message').val('');
        $('#message').focus();

        var BigInteger = forge.jsbn.BigInteger;

        var data = JSON.parse(sessionStorage[name]);
        var pem = data.pem;

        var privateKey = forge.pki.privateKeyFromPem(pem);
        var ownPublicKey = forge.pki.setRsaPublicKey(new BigInteger(data.n), new BigInteger(data.e));

        var keys = [];

        var iv = forge.random.getBytesSync(16);
        var key = forge.random.getBytesSync(16);
        var cipher = forge.cipher.createCipher('AES-CBC', key);
        cipher.start({iv: iv});
        cipher.update(forge.util.createBuffer(message, 'utf8'));
        cipher.finish();
        var encryptedMessage = cipher.output.getBytes();
        var encryptedKey = ownPublicKey.encrypt(key, 'RSA-OAEP');

        keys.push({
            'name': name,
            'key': encryptedKey
        });

        var md = forge.md.sha1.create();
        md.update(message, 'utf8');
        var signature = privateKey.sign(md);

        var recipients = $.map($("#recipients").tokenfield("getTokens"), function(o) {return o.value;});

        var deferredRequests = [];

        for (var i = 0; i < recipients.length; i++) {
            (function (index) {
                var retrieveKey = function(pk) {
                    if (pk === false) {
                        return;
                    }

                    if (keyDict[recipients[i]] === undefined) {
                        keyDict[recipients[i]] = pk;
                    }

                    var publicKey = forge.pki.setRsaPublicKey(new BigInteger(pk.n), new BigInteger(pk.e));
                    var encryptedKey = publicKey.encrypt(key, 'RSA-OAEP');

                    keys.push({
                        'name': recipients[index],
                        'key': encryptedKey
                    });
                }
                if (keyDict[recipients[i]] === undefined) {
                    deferredRequests.push($.post('/user/getpublickey', {'name' : recipients[i]}, retrieveKey));
                } else {
                    retrieveKey(keyDict[recipients[i]]);
                }
            })(i);
        }


        $.when.apply(null, deferredRequests).done(function() {
            primus.substream('messageStream').write({'message': encryptedMessage, 'keys': keys, 'iv': iv,
                                                    'signature': signature, 'recipients': recipients});
        });

        event.preventDefault();
    };
};
