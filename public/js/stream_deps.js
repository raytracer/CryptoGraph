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

var Friend = function(name) {
    this.name = name;
}

Friend.prototype.changeConversation = function() {
	$('#recipients').tokenfield('setTokens', [this.name]);
	$('#filter').tokenfield('setTokens', [this.name]);

	$('.row-offcanvas').removeClass('active');
    $('#message').focus();
}

Friend.prototype.addConversation = function() {
}

var FriendViewModel = function() {
    this.friends = ko.observableArray([]);

    this.uniqueFriends = ko.pureComputed(function() {
        return this.friends().sort(function(l,r) {
            return l.name.localeCompare(r.name);
        });
    }, this);

    this.addFriend = function(friend) {
        var friendNames = this.uniqueFriends().map(function (o) {return o.name});

        if (friendNames.indexOf(friend.name) === -1) {
            this.friends.push(friend);
        }
    };
}

var localStorageManagement = function (name, startPrimus) {
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

                    startPrimus();
                });
                $('#passdialog').on('shown.bs.modal', function () {
                    $('#pass').focus();
                })
                $('#passdialog').modal();
            });
        } else {
            startPrimus();
        }
};

var Post = function(from, time, content, recipients, name, friendViewModel) {
    this.from = from;
    this.time = time;
    this.dateString = (new Date(time)).toLocaleString();
    this.content = content;
    this.recipients = recipients;
    this.name = name;
    this.recipientsString = "To: " + recipients.join(', ');
    this.friendViewModel = friendViewModel;
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

Post.prototype.recipientsHandler = function(data, event) {
    console.log("i was here");
    $(event.target).toggleClass('nowrap ellipsis');
}

Post.prototype.addFriend = function() {
    var self = this;

    $.post('/user/friend/add', {friend: self.from}, function(response) {
        if (response === true) {
            self.friendViewModel.addFriend(new Friend(self.from));
        }
    });
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

var receiveMessageCreator = function(name, postViewModel, friendViewModel) {
    return function(data) {
		var showMessage = function(message) {
			if ("Notification" in window && Notification.permission === "granted" &&
					document.hidden) {
				var n = new Notification(message);
				n.onshow = function () { 
					setTimeout(n.close.bind(n), 5000); 
				};
			}
		};

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
                && postViewModel.ids[data._id] === undefined) {
                    postViewModel.ids[data._id] = data._id;
                    var safemessage = $('<div>').text(message).html();
					showMessage(safemessage);
                    safemessage = safemessage.replace(/(?:\r\n|\r|\n)/g, '<br />');
                    postViewModel.posts.unshift(new Post(data.from, data.time, safemessage, data.recipients, name, friendViewModel));
                }
        });
    }
};

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
