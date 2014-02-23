$(document).ready(function() {
    var primus = new Primus('http://localhost:8000', {transformer: 'engine.io'});

    primus.on('data', function (data) {
        //TODO: data NOT escaped yet
        $('#stream').append('<p>' + data + '</p>');
    });

    $.get('/user/getid', function (id) {
        if (localStorage[id] === undefined) {
            $.post('/user/getdata', {'id': id}, function (data) {
                $('#decrypt').on('click', function (e) {
                    var password = $('#pass').val();
                    var encrypted = data.d;

                    var derivedKey = forge.pkcs5.pbkdf2(password, data.salt, 10, 16);
                    var cipher = forge.aes.createDecryptionCipher(derivedKey, 'CBC');
                    cipher.start(data.iv);
                    cipher.update(forge.util.createBuffer(forge.util.hexToBytes(encrypted)));
                    cipher.finish();
                    var d = cipher.output.toString();
                    data.d = d;

                    localStorage[id] = data;
                    $('#passdialog').modal('hide');
                });

                $('#passdialog').modal();
            });
        }

        primus.write({'id': id});
    });

    $('form').submit(function(event) {
        var message = $('#message').val();
        primus.write({'message': message});
        event.preventDefault();
    });
});
