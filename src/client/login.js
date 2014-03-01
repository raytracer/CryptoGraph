$(document).ready(function() {
    $('form').submit(function(event) {
        $('#error').hide();

        var user = $('#user').val();
        var pass = $('#pass').val();

        var md = forge.md.sha256.create();
        md.update(pass);
        var hashed = md.digest().toHex().toString();

        $.post('/login', {'user': user, 'pass': hashed}, function(data) {
            if (data === true) {
                window.location.replace('/');
            } else {
                $('#error').show();
            }
        });

        event.preventDefault();
    });
});
