var initUi = function() {
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

	$('#recipients').tokenfield();
	$('#filter').tokenfield();
}


$(document).ready(function() {
	initUi();

	var postViewModel = new PostViewModel();
	ko.applyBindings(postViewModel, document.getElementById('posts'));

	friendViewModel = new FriendViewModel();
	ko.applyBindings(friendViewModel, document.getElementById('friends'));

    $('#filter').on('tokenfield:createdtoken', function (e) {
        postViewModel.filter($('#filter').tokenfield('getTokens'));
    }).on('tokenfield:removedtoken', function (e) {
        postViewModel.filter($('#filter').tokenfield('getTokens'));
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
            messageStream.on('data', receiveMessageCreator(name, postViewModel));
            $('#sendform').submit(createSubmit(name, primus));
        };

        localStorageManagement(name, startPrimus);
    });
});
