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
