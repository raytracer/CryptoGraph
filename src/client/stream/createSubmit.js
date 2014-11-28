var createSubmit = function(name, primus) {
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

        var messages = [];

        var ownPublicKey = forge.pki.setRsaPublicKey(new BigInteger(data.n), new BigInteger(data.e));
        var ownEncrypted = ownPublicKey.encrypt(forge.util.encodeUtf8(message));

        messages.push({
            'name': name,
            'message': ownEncrypted
        });

        var md = forge.md.sha1.create();
        md.update(message, 'utf8');
        var signature = privateKey.sign(md);

        var recipients = $.map($("#recipients").tokenfield("getTokens"), function(o) {return o.value;});
        recipients = recipients.filter(function(elem) {
            return elem.match(/\s+/) === null && elem.length > 0;
        });

        var deferredRequests = [];

        for (var i = 0; i < recipients.length; i++) {
            (function (index) {
                deferredRequests.push($.post('/user/getpublickey', {'name' : recipients[i]} , function(pk) {
                    if (pk === false) {
                        return;
                    }

                    var publicKey = forge.pki.setRsaPublicKey(new BigInteger(pk.n), new BigInteger(pk.e));
                    var encrypted = publicKey.encrypt(message);

                    messages.push({
                        'name': recipients[index],
                        'message': encrypted
                    });
                }));
            })(i);
        }


        $.when.apply(null, deferredRequests).done(function() {
            primus.substream('messageStream').write({'messages': messages,
                                                    'signature': signature, 'recipients': recipients});
        });

        event.preventDefault();
    };
};
