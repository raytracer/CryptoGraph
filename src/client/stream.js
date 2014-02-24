$(document).ready(function() {
    var primus = new Primus('http://localhost:8000', {transformer: 'engine.io'});


    $.get('/user/getid', function (id) {
        if (localStorage[id] === undefined) {
            $.post('/user/getdata', {'id': id}, function (data) {
                $('#decrypt').on('click', function (e) {
                    var password = $('#pass').val();
                    var pem = data.pem;

                    var privateKey = forge.pki.decryptRsaPrivateKey(pem, password);
                    data.pem = forge.pki.privateKeyToPem(privateKey);
                    localStorage[id] = JSON.stringify(data);
                    $('#passdialog').modal('hide');
                });

                $('#passdialog').modal();
            });
        }

        primus.write({'id': id});

        $('form').submit(function(event) {
            var message = $('#message').val();
            var BigInteger = forge.jsbn.BigInteger;

            var data = JSON.parse(localStorage[id]);
            var pem = data.pem;

            var privateKey = forge.pki.privateKeyFromPem(pem);

            var publicKey = forge.pki.setRsaPublicKey(new BigInteger(data.n), new BigInteger(data.e));
            var encrypted = publicKey.encrypt(message);

            var md = forge.md.sha1.create();
            md.update(message, 'utf8');
            var signature = privateKey.sign(md);

            primus.write({'message': encrypted,
                          'signature': signature});
            event.preventDefault();
        });

        primus.on('data', function (data) {
            var localdata = JSON.parse(localStorage[id]);
            var BigInteger = forge.jsbn.BigInteger;
            var pem = localdata.pem;

            //TODO: works only for users _OWN_ messages, otherwise request public key
            var publicKey = forge.pki.setRsaPublicKey(new BigInteger(localdata.n), new BigInteger(localdata.e));
            var privateKey = forge.pki.privateKeyFromPem(pem);
            var message = privateKey.decrypt(data.message);

            var md = forge.md.sha1.create();
            md.update(message, 'utf8');

            if (publicKey.verify(md.digest().bytes(), data.signature)) {
                $('#stream').append($('<p>').addClass('post').text(message));
            }
        });
    });

});
