var serialize = function(obj) {
  var str = [];
  for(var p in obj)
    if (obj.hasOwnProperty(p)) {
      str.push(encodeURIComponent(p) + "=" + encodeURIComponent(obj[p]));
    }
  return str.join("&");
}


$(document).ready(function() {
    var Post = function(from, date, content, recipients, name) {
        this.from = from;
        this.date = date;
        this.content = content;
        this.recipients = recipients;
        this.name = name;
    }

    Post.prototype.replyHandler = function() {
        var replyRecipients = this.recipients.slice();

        if (this.name !== this.from) {
            replyRecipients.splice(replyRecipients.indexOf(name), 1);
            replyRecipients.push(this.from);
        }

        $('#recipients').tokenfield('setTokens', replyRecipients);
        $('#message').focus();
    }

    var PostViewModel = function() {
        this.posts = ko.observableArray([]);
        this.filter = ko.observableArray([]);
        this.slideElement = function(elem) { if (elem.nodeType === 1) $(elem).hide().slideDown() }
        this.filteredPosts = ko.pureComputed(function() {
            var filter = this.filter();

            if (filter.length < 1) {
                return this.posts();
            }

            return ko.utils.arrayFilter(this.posts(), function(post) {
                for (var i = 0; i < filter.length; i++) {
                    if (post.from === filter[i].value) return true;
                    if (post.recipients.indexOf(filter[i].value) !== -1) return true;
                }
                return false;
            });
        }, this);
    }

	viewModel = new PostViewModel();
	ko.applyBindings(viewModel);

	$('#recipients').tokenfield();
	$('#filter').tokenfield();

    $('#filter').on('tokenfield:createdtoken', function (e) {
        viewModel.filter($('#filter').tokenfield('getTokens'));
    }).on('tokenfield:removedtoken', function (e) {
        viewModel.filter($('#filter').tokenfield('getTokens'));
    });

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

					viewModel.posts.unshift(new Post(data.from, ' - ' + date, message, data.recipients, name));
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

                var recipients = $('#recipients').val().split(/,+/);
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
                $('#passdialog').on('shown.bs.modal', function () {
                    $('#pass').focus();
                })
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

