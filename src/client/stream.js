var initUi = function() {
	$("#sidebar-button").click(function(e) {
		$('.row-offcanvas').toggleClass('active');
	});

	var mainCanvas = document.getElementsByClassName("starter-template")[0];

    Hammer(mainCanvas).on("swiperight", function() {
		$('.row-offcanvas').addClass('active');
    });

    Hammer(mainCanvas).on("swipeleft", function() {
		$('.row-offcanvas').removeClass('active');
    });

	$('#recipients').tokenfield();
	$('#filter').tokenfield();

	if (window.Notification) Notification.requestPermission();
}

var loadmore = function(requestStream) {
	var delay = 86400000;
	$('#loadmore').click(function (event) {
		requestStream.write({'sendMore': delay});
		delay += 86400000;
		event.preventDefault();
	});
};


$(document).ready(function() {
	initUi();

	var friendViewModel = new FriendViewModel();
	ko.applyBindings(friendViewModel, document.getElementById('friends'));

	var postViewModel = new PostViewModel();
	ko.applyBindings(postViewModel, document.getElementById('posts'));


    $('#filter').on('tokenfield:createdtoken', function (e) {
        postViewModel.filter($('#filter').tokenfield('getTokens'));
    }).on('tokenfield:removedtoken', function (e) {
        postViewModel.filter($('#filter').tokenfield('getTokens'));
    }).on('tokenfield:createtoken', function (e) {
		var value = e.attrs.value;
		var tokens = $('#filter').tokenfield('getTokens');
		tokens = tokens.map(function (t) {return t.value});
		if (tokens.indexOf(value) !== -1) return false;
    });

    $('#recipients').on('tokenfield:createtoken', function (e) {
		var value = e.attrs.value;
		var tokens = $('#recipients').tokenfield('getTokens');
		tokens = tokens.map(function (t) {return t.value});
		if (tokens.indexOf(value) !== -1) return false;
    });

    $.get('/user/friend', function (response) {
        var friends = response.map(function (name) {return new Friend(name)});
        friendViewModel.friends(friends);
    });

    $.get('/user/getname', function (response) {
        var name = response.name;
        var token = response.token;

        var params = {
            'name': name,
            'token': token
        };

		var port = location.protocol === 'https:' ? '8443' : '8000';

        var startPrimus = function() {
            var primus = new Primus(location.protocol + '//' + document.domain + ':' + port + '?' + serialize(params), {transformer: 'engine.io'});
            var messageStream = primus.substream('messageStream');
			loadmore(primus.substream('requestStream'));
            messageStream.on('data', receiveMessageCreator(name, postViewModel, friendViewModel));
            $('#sendform').submit(createSubmit(name, primus));
        };

        localStorageManagement(name, startPrimus);
    });
});
