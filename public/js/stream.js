var serialize = function(obj) {
  var str = [];
  for(var p in obj)
    if (obj.hasOwnProperty(p)) {
      str.push(encodeURIComponent(p) + "=" + encodeURIComponent(obj[p]));
    }
  return str.join("&");
}

function uniqueArray(arr) {
	return arr.filter(function(item, pos, self) {
		return self.indexOf(item) == pos;
	});
}

function initUi() {
	$("#sidebar-button").click(function(e) {
		$('.row-offcanvas').toggleClass('active');
	});

	var mainCanvas = document.getElementById("stream");
	var sidebar = document.getElementById("sidebar");
    
    Hammer(mainCanvas).on("swiperight", function() {
		$('.row-offcanvas').addClass('active');
    });

    Hammer(sidebar).on("swipeleft", function() {
		$('.row-offcanvas').removeClass('active');
    });
}


$(document).ready(function() {
	initUi();

    var Post = function(from, time, content, recipients, name) {
        this.from = from;
        this.time = time;
        this.dateString = (new Date(time)).toLocaleString();
        this.content = content;
        this.recipients = recipients;
        this.name = name;
    }

    Post.prototype.replyHandler = function() {
        var replyRecipients = uniqueArray(this.recipients.slice());

        if (this.name !== this.from) {
            replyRecipients.splice(replyRecipients.indexOf(this.name), 1);
            replyRecipients.push(this.from);
        }

        $('#recipients').tokenfield('setTokens', replyRecipients);
        $('#message').focus();
    }

    var PostViewModel = function() {
		this.ids = {};
        this.posts = ko.observableArray([]);
        this.filter = ko.observableArray([]);
        this.slideElement = function(elem) { if (elem.nodeType === 1) $(elem).hide().slideDown() }
        this.filteredPosts = ko.pureComputed(function() {
            var filter = this.filter();

			var posts = this.posts().sort(function(l,r) {
				return l.time <= r.time ? 1 : -1;
			});

            if (filter.length < 1) {
                return posts;
            }

            return ko.utils.arrayFilter(posts, function(post) {
                for (var i = 0; i < filter.length; i++) {
                    if (post.from === filter[i].value) return true;
                    if (post.from === post.name &&
						post.recipients.indexOf(filter[i].value) !== -1) return true;
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

                if (publicKey.verify(md.digest().bytes(), data.signature)
					&& viewModel.ids[data.id] === undefined) {
					viewModel.ids[data.id] = data.id;
					viewModel.posts.unshift(new Post(data.from, data.time, message, data.recipients, name));
                }
            });
        };

        var createSubmit = function(primus) {
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
                var ownEncrypted = ownPublicKey.encrypt(message);

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

        var primus;

		var port = location.protocol === 'https:' ? '8443' : '8000';

        var startPrimus = function() {
            var primus = new Primus(location.protocol + '//' + document.domain + ':' + port + '?' + serialize(params), {transformer: 'engine.io'});
            var messageStream = primus.substream('messageStream');
            messageStream.on('data', receiveMessage);
            $('#sendform').submit(createSubmit(primus));

            return primus;
        };

        if (localStorage[name] !== undefined) sessionStorage[name] = localStorage[name];

        if (sessionStorage[name] === undefined) {
            $.get('/user/getdata', function (data) {
                $('#decrypt').on('click', function (e) {
                    var password = $('#pass').val();
                    var trust = $('#trust').prop('checked');
                    var pem = data.pem;

                    var privateKey = forge.pki.decryptRsaPrivateKey(pem, password);
                    data.pem = forge.pki.privateKeyToPem(privateKey);
                    sessionStorage[name] = JSON.stringify(data);

                    if (trust) localStorage[name] = sessionStorage[name];

                    $('#passdialog').modal('hide');

                    primus = startPrimus();
                });
                $('#passdialog').on('shown.bs.modal', function () {
                    $('#pass').focus();
                })
                $('#passdialog').modal();
            });
        } else {
            primus = startPrimus();
        }

    });
});

