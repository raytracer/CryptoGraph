var Friend = function(name) {
    this.name = name;
}

Friend.prototype.changeConversation = function() {
}

Friend.prototype.addConversation = function() {
}

var FriendViewModel = function() {
    this.friends = ko.observableArray([]);
}
