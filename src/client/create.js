$(document).ready(function() {
    $('form').submit(function(event) {
        $('#error').hide();
        $('#info').hide();
        $('#success').hide();

        var user = $('#user').val(),
            pass1 = $('#pass1').val(),
            pass2 = $('#pass2').val();

        if (pass1 !== pass2) {
            $('#error').html("<strong>Error!</strong> Passwords don't match!");
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

            var md = forge.md.sha1.create();
            md.update(pass1);
            var hashed = md.digest().toHex().toString();

            var rsa = forge.pki.rsa;

            rsa.generateKeyPair({bits: 2048, workers: 4}, function (error, keypair) {
                var n = keypair.privateKey.n.toString();
                var e = keypair.privateKey.e.toString();

                var pem = forge.pki.encryptRsaPrivateKey(keypair.privateKey, pass1);

                var data = {
                    'user': user,
                    'pass': hashed,
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

                        data.privateKey = keypair.privateKey;
                        localStorage[result] = JSON.stringify(data);
                    }
                });

                event.preventDefault();
            });

        });

    event.preventDefault();
    });
});
