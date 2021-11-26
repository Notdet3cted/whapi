const {
	WAConnection,
	MessageType,
	MessageOptions,
	Presence,
	Mimetype,
	WALocationMessage,
	WA_MESSAGE_STUB_TYPES,
	ReconnectMode,
	ProxyAgent,
	waChatKey,
} = require("@adiwajshing/baileys");
var qrcode = require('qrcode');
const express = require('express');
const app = express();
const fs = require("fs");
const http = require("http");
const server = http.createServer(app);
const socketIO = require('socket.io');
const io = socketIO(server);
const conn = new WAConnection();

app.get('/', (req, res, next) => {
    res.send('helloworld')
})

async function connect() {
	fs.existsSync('./wabot-session.json') && conn.loadAuthInfo('./wabot-session.json');
	await conn.connect({ timeoutMs: 30 * 1000 });
	const authInfo = conn.base64EncodedAuthInfo(); // get all the auth info we need to restore this session
	fs.writeFileSync('./wabot-session.json', JSON.stringify(authInfo, null, '\t'))
	console.log(conn.user.name + " </br>(" + conn.user.jid + ")");
	io.emit('authenticated', conn.user.name + " </br>(" + conn.user.jid + ")")
}

connect().catch((err) => {
	console.log(err);
});

io.on("connection", (socket) => {
    conn.on("qr", (qr) => {
		socket.emit('message', 'Getting QR Code')
		qrcode.toDataURL(qr, (err, url) => {
			socket.emit('message', 'QR Code received, scan please!')
			socket.emit("qr", url);
		});
        
    });
});

server.listen(8000, function(){
    console.log('App Running on *:' + 8000);
});