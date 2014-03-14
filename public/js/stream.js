var serialize = function(obj) {
  var str = [];
  for(var p in obj)
    if (obj.hasOwnProperty(p)) {
      str.push(encodeURIComponent(p) + "=" + encodeURIComponent(obj[p]));
    }
  return str.join("&");
}

$(document).ready(function() {
    $.get('/user/getname', function (response) {
        var name = response.name;
        var token = response.token;

        var params = {
            'name': name,
            'token': token
        };

        var receiveMessage = function(data) {
            var localdata = JSON.parse(sessionStorage[name]);
            var BigInteger = forge.jsbn.BigInteger;
            var pem = localdata.pem;

            var privateKey = forge.pki.privateKeyFromPem(pem);
            var message = privateKey.decrypt(data.message);

            var md = forge.md.sha1.create();
            md.update(message, 'utf8');

            $.post('/user/getpublickey', {'name' : data.from}, function(pk) {
                if (pk === false) {
                    return;
                }

                var publicKey = forge.pki.setRsaPublicKey(new BigInteger(pk.n), new BigInteger(pk.e));

                if (publicKey.verify(md.digest().bytes(), data.signature)) {
                    var date = (new Date(data.time)).toLocaleString();
                    var post = $('<li>').addClass('post');
                    post.append($('<p>').append($('<strong>').text(data.from))
                                        .append($('<span>').addClass('date').text(' - ' + date)));
                    post.append($('<p>').text(message));

                    $(post).hide().prependTo('#posts').slideDown();
                }
            });
        };

        var createSubmit = function(primus) {
            return function(event) {
                var message = $('#message').val();
                var BigInteger = forge.jsbn.BigInteger;

                var data = JSON.parse(sessionStorage[name]);
                var pem = data.pem;

                var privateKey = forge.pki.privateKeyFromPem(pem);

                var messages = [];

                var ownPublicKey = forge.pki.setRsaPublicKey(new BigInteger(data.n), new BigInteger(data.e));
                var ownEncrypted = ownPublicKey.encrypt(message);

                messages.push({
                    'name': name,
                    'message': ownEncrypted
                });

                var md = forge.md.sha1.create();
                md.update(message, 'utf8');
                var signature = privateKey.sign(md);

                var recipients = $('#recipients').val().split(/;+/);
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
                                  'signature': signature});
                });

                event.preventDefault();
            };
        };

        if (sessionStorage[name] === undefined) {
            $.get('/user/getdata', function (data) {
                $('#decrypt').on('click', function (e) {
                    var password = $('#pass').val();
                    var pem = data.pem;

                    var privateKey = forge.pki.decryptRsaPrivateKey(pem, password);
                    data.pem = forge.pki.privateKeyToPem(privateKey);
                    sessionStorage[name] = JSON.stringify(data);
                    $('#passdialog').modal('hide');
                    var primus = new Primus('http://localhost:8000?' + serialize(params), {transformer: 'engine.io'});
                    var messageStream = primus.substream('messageStream');
                    messageStream.on('data', receiveMessage);
                    $('form').submit(createSubmit(primus));
                });

                $('#passdialog').modal();
            });
        } else {
            var primus = new Primus('http://localhost:8000?' + serialize(params), {transformer: 'engine.io'});
            var messageStream = primus.substream('messageStream');
            messageStream.on('data', receiveMessage);
            $('form').submit(createSubmit(primus));
        }

    });
});

