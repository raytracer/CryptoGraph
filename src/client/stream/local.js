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
