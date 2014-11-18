$(document).ready(function() {
    $('form').submit(function(event) {
        $('#error').hide();
        $('#info').hide();
        $('#success').hide();

        var user = $('#user').val(),
            passAuth = $('#passAuth').val(),
            passEncrypt = $('#passEncrypt').val();

        if (passAuth === passEncrypt) {
            $('#error').html("<strong>Error!</strong> Passwords should not be equal!");
            $('#error').show();
            event.preventDefault();
            return;
        }

        $.post("/user/exists", {'user' : user}, function (data) {
            if (data === true) {
                $('#error').html("<strong>Error!</strong> Name already in use!");
                $('#error').show();
                return;
            }

            $('#info').show();
            var rsa = forge.pki.rsa;
            var cores = navigator.hardwareConcurrency || 4;

            rsa.generateKeyPair({bits: 2048, workers: cores}, function (error, keypair) {
                var n = keypair.privateKey.n.toString();
                var e = keypair.privateKey.e.toString();

                var pem = forge.pki.encryptRsaPrivateKey(keypair.privateKey, passEncrypt);

                var data = {
                    'user': user,
                    'pass': passAuth,
                    'n': n,
                    'e': e,
                    'pem': pem,
                };

                $.post("/user/create", data, function(result) {
                    if (result === false) {
                        $('#error').html('<strong>Error!</strong> Database error. Please try again later.');
                        $('#error').show();
                    } else {
                        $('#info').hide();
                        $('#success').show();

                        data.pem = forge.pki.privateKeyToPem(keypair.privateKey);
                        sessionStorage[user] = JSON.stringify(data);
                    }
                });

                event.preventDefault();
            });

        });

    event.preventDefault();
    });
});
