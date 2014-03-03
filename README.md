# CryptoGraph

CryptoGraph is an experimental social network that is able to deliver messages using an end-to-end encryption. It uses a Neo4j database as its backend. The complete application is written in javascript using express on the backend.

The following libraries are used (for a complete list see package.json):

- [primus.io](http://primus.io) - used to deliver messages over websockets (depending on the transformer)
- [forge](https://github.com/digitalbazaar/forge) - the main library responsible for the encryption
- [passportjs](http://passportjs.org/) - used to authenticate the normal HTTP requests NOT used for websocket authentication
- [node-jsonwebtoken](https://github.com/auth0/node-jsonwebtoken) - used to authenticate the websocket connection
- [Twitter Bootstrap](http://getbootstrap.com) - for frontend styling and functionality 
- [Neo4j](http://www.neo4j.org/) - popular Graph database

## Security

CryptoGraph is still a very early alpha (mainly for test purposes). It works by performing the following steps:

- Generate a RSA keypair on the client, send the public key and the (AES encrypted) private key to the server to be able to synchronize between clients.
- The key is also stored using local storage
- The client chooses a password. This password is currently used to authenticate the user **AS WELL** as to encrypt the private RSA key. This would have to change in a production setting. Either by using two passwords or by using a OpenID/OAuth service for authentication. This is also the reason why the password is hashed **on the client**.
- The client can now send encrypted+signed messages to every user in the network
- An additional step would be to verify the public key of other users (building up a trust chain). This could happen over a secure user2user connection(scanning a QR-Code for instance) or by asking an already trusted third party. (TODO -> not anytime soon)

**WARNING:** CryptoGraph is *not* ready for production use yet.

##License

MIT
