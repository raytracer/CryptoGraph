$(document).ready(function() {
    $('form').submit(function(event) {
        $('#error').hide();

        var user = $('#user').val();
        var pass = $('#pass').val();

        $.post('/login', {'user': user, 'pass': pass}, function(data) {
            if (data === true) {
                window.location.replace('/');
            } else {
                $('#error').show();
            }
        });

        event.preventDefault();
    });
});
