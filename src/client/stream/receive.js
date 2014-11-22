var receiveMessageCreator = function(name, viewModel) {
    return function(data) {
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
                && viewModel.ids[data._id] === undefined) {
                    viewModel.ids[data._id] = data._id;
                    var safemessage = $('<div>').text(message).html();
                    safemessage = safemessage.replace(/(?:\r\n|\r|\n)/g, '<br />');
                    viewModel.posts.unshift(new Post(data.from, data.time, safemessage, data.recipients, name));
                }
        });
    }
};
