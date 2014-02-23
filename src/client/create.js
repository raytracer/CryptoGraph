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
                var d = keypair.privateKey.d.toString();

                var salt = forge.random.getBytesSync(128);
                var derivedKey = forge.pkcs5.pbkdf2(pass1, salt, 10, 16);

                var iv = forge.random.getBytesSync(16);

                // encrypt some bytes using CBC mode
                // (other modes include: CFB, OFB, and CTR)
                var cipher = forge.aes.createEncryptionCipher(derivedKey, 'CBC');
                cipher.start(iv);
                cipher.update(forge.util.createBuffer(d));
                cipher.finish();
                var encrypted = cipher.output;

                var data = {
                    'user': user,
                    'pass': hashed,
                    'n': n,
                    'e': e,
                    'd': encrypted.toHex().toString(),
                    'iv': iv,
                    'salt': salt
                };

                $.post("/user/create", data, function(result) {
                    if (result === false) {
                        $('#error').html('<strong>Error!</strong> Database error. Please try again later.');
                        $('#error').show();
                    } else {
                        $('#info').hide();
                        $('#success').show();

                        data.d = keypair.privateKey.d.toString();
                        localStorage[result] = JSON.stringify(data);
                    }
                });

                event.preventDefault();
            });

        });

    event.preventDefault();
    });
});
