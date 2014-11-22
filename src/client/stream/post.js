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
