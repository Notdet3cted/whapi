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
	socket.on('ready', () => {
		if (fs.existsSync('./wabot-session.json') && conn.state == 'open') {
			io.emit('authenticated', conn.user.name + " </br>(" + conn.user.jid + ")")
			socket.emit('message', 'Sudah konek!')
		} else {
			io.emit('loader', '')
			socket.emit('message', 'Please wait..')
			connect()
		}
	})

	conn.on("qr", (qr) => {
		socket.emit('message', 'Getting QR Code')
		qrcode.toDataURL(qr, (err, url) => {
			socket.emit('message', 'QR Code received, scan please!')
			socket.emit("qr", url);
		});
	});

	socket.on('logout', () => {
		if (fs.existsSync("./wabot-session.json")) {
			conn.close()
			conn.clearAuthInfo();
			fs.unlinkSync("./wabot-session.json");
			socket.emit('isdelete', '<h2 class="text-center text-info mt-4">Logout Success, Lets Scan Again<h2>')
		} else {
			socket.emit('isdelete', '<h2 class="text-center text-danger mt-4">You are have not Login yet!<h2>')
		}
	})

	socket.on('scanqr', () => {
		if (fs.existsSync('./wabot-session.json') && conn.state == 'open') {
			io.emit('authenticated', conn.user.name + " </br>(" + conn.user.jid + ")")
			socket.emit('message', 'Sudah Konek!')
		} else {
			io.emit('loader', '')
			conn.on("qr", (qr) => {
				qrcode.toDataURL(qr, (err, url) => {
					socket.emit('message', 'QR Code received, scan please!')
					socket.emit("qr", url);
				});
			});
			socket.emit('message', 'Please wait..')
			connect()
		}
	})
	socket.on('cekstatus', () => {
		if (fs.existsSync('./wabot-session.json') && conn.state == 'open') {
			io.emit('isdelete', '<h2 class="text-center text-primary mt-4">Your whatsapp is Running!</h2>')
			io.emit('message', 'connected!')
		} else {
			io.emit('isdelete', '<h2 class="text-center text-danger mt-4">Your whatsapp is not Running!,Scan Now!<h2>')
			io.emit('message', 'Whatsapp tidak terhubng!')
		}
	})
});

server.listen(8000, function(){
    console.log('App Running on *:' + 8000);
});