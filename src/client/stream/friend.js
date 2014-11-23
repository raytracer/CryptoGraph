var Friend = function(name) {
    this.name = name;
}

Friend.prototype.changeConversation = function() {
	$('#recipients').tokenfield('setTokens', [this.name]);
	$('#filter').tokenfield('setTokens', [this.name]);

    $('#message').focus();
}

Friend.prototype.addConversation = function() {
}

var FriendViewModel = function() {
    this.friends = ko.observableArray([]);
}
