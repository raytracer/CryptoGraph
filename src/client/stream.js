$(document).ready(function() {
    $.get('/user/getname', function (response) {
        var name = response.name;
        var token = response.token;

        if (sessionStorage[name] === undefined) {
            $.get('/user/getdata', function (data) {
                $('#decrypt').on('click', function (e) {
                    var password = $('#pass').val();
                    var pem = data.pem;

                    var privateKey = forge.pki.decryptRsaPrivateKey(pem, password);
                    data.pem = forge.pki.privateKeyToPem(privateKey);
                    sessionStorage[name] = JSON.stringify(data);
                    $('#passdialog').modal('hide');
                });

                $('#passdialog').modal();
            });
        }

        var params = {
            'name': name,
            'token': token
        };

        var primus = new Primus('http://localhost:8000?' + serialize(params), {transformer: 'engine.io'});
        primus.write({'name': name});

        $('form').submit(function(event) {
            var message = $('#message').val();
            var BigInteger = forge.jsbn.BigInteger;

            var data = JSON.parse(sessionStorage[name]);
            var pem = data.pem;

            var privateKey = forge.pki.privateKeyFromPem(pem);

            var messages = [];

            var ownPublicKey = forge.pki.setRsaPublicKey(new BigInteger(data.n), new BigInteger(data.e));
            var ownEncrypted = ownPublicKey.encrypt(message);

            messages.push({
                'name': data.user,
                'message': ownEncrypted
            });

            var md = forge.md.sha1.create();
            md.update(message, 'utf8');
            var signature = privateKey.sign(md);

            var recipients = $('#recipients').val().split(/;+/);
            recipients = recipients.filter(function(elem) {
                return elem.match(/\s+/) === null && elem.length > 0;
            });

            for (var i = 0; i < recipients.length; i++) {
                $.post('/user/getpublickey', {'name' : recipients[i]} , function(pk) {
                    if (pk === false) {
                        return;
                    }

                    var publicKey = forge.pki.setRsaPublicKey(new BigInteger(pk.n), new BigInteger(pk.e));
                    var encrypted = publicKey.encrypt(message);

                    messages.push({
                        'name': recipients[i],
                        'message': encrypted
                    });
                });
            }


            primus.write({'messages': messages,
                          'signature': signature});
            event.preventDefault();
        });

        primus.on('data', function (data) {
            var localdata = JSON.parse(sessionStorage[name]);
            var BigInteger = forge.jsbn.BigInteger;
            var pem = localdata.pem;

            var privateKey = forge.pki.privateKeyFromPem(pem);
            var message = privateKey.decrypt(data.message);

            var md = forge.md.sha1.create();
            md.update(message, 'utf8');


            $.post('/user/getpublickey', {'name' : data.name}, function(pk) {
                if (pk === false) {
                    return;
                }

                var publicKey = forge.pki.setRsaPublicKey(new BigInteger(pk.n), new BigInteger(pk.e));

                if (publicKey.verify(md.digest().bytes(), data.signature)) {
                    $('#stream').append($('<p>').addClass('post').text(message));
                }
            });
        });
    });

});

serialize = function(obj) {
  var str = [];
  for(var p in obj)
    if (obj.hasOwnProperty(p)) {
      str.push(encodeURIComponent(p) + "=" + encodeURIComponent(obj[p]));
    }
  return str.join("&");
}
