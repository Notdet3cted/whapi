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
const http = require("http");
const https = require("https");
var qrcode = require('qrcode');
const fs = require("fs");
const { body, validationResult } = require('express-validator');
const express = require('express');
// const axios = require("axios");
const app = express();
const server = http.createServer(app);
const socketIO = require('socket.io');
const { phoneNumberFormatter } = require('./formatter');
const io = socketIO(server);
// const request = require("request");
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
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
	io.emit('authenticated', {
		name: conn.user.name,
		  id: conn.user.jid
		});
}

connect().catch((err) => {
	console.log(err);
});

io.on("connection", (socket) => {
	socket.on('ready', () => {
		if (fs.existsSync('./wabot-session.json') && conn.state == 'open') {
			io.emit('authenticated', {
				name: conn.user.name,
				  id: conn.user.jid
				});
			socket.emit('message', 'Perangkat sudah terhubung')
		} else {
			io.emit('loader', '')
			socket.emit('message', 'Please wait..')
			connect()
		}
	})

	conn.on("qr", (qr) => {
		socket.emit('message', 'Getting QR Code')
		qrcode.toDataURL(qr, (err, url) => {
			socket.emit("qr", url);
		});
	});

	socket.on('logout', () => {
		if (fs.existsSync("./wabot-session.json")) {
			conn.close()
			conn.clearAuthInfo();
			fs.unlinkSync("./wabot-session.json");
			socket.emit('isdelete',{
				icon: 'fas fa-check-double',
				bg: 'success',
				pesan: '<h2 class="text-center text-success mt-4">Logout berhasil...</h2>'
			})
		} else {
			socket.emit('isdelete',{
				icon: 'fas fa-times',
				bg: 'danger',
				pesan: '<h2 class="text-center text-danger mt-4">Whatsapp belum terhubung...</h2>'
			})
		}
	})

	socket.on('scanqr', () => {
		if (fs.existsSync('./wabot-session.json') && conn.state == 'open') {
			io.emit('authenticated', {
				name: conn.user.name,
				  id: conn.user.jid
				});
				socket.emit('message', 'Perangkat sudah terhubung')
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
			io.emit('isdelete',{
				icon: 'fas fa-check-double',
				bg: 'success',
				pesan: '<h2 class="text-center text-success mt-4">Whatsapp sudah terhubung...</h2>'
			})
		} else {
			io.emit('isdelete',{
				icon: 'fas fa-times',
				bg: 'danger',
				pesan: '<h2 class="text-center text-danger mt-4">Whatsapp belum terhubung...</h2>'
			})
		}
	})
});

app.post('/send', [
	body('number').notEmpty(),
	body('message').notEmpty(),
], async (req, res) => {
	const errors = validationResult(req).formatWith(({
		msg
	}) => {
		return msg;
	});

	if (!errors.isEmpty()) {
		return res.status(422).json({
			status: false,
			message: errors.mapped(),
			body: req.body.number
		});
	}
	const message = req.body.message;
	if (req.body.number.length > 15) {
		var number = req.body.number;
		conn.sendMessage(number, message, MessageType.text).then(response => {
			res.status(200).json({
				status: true,
				response: response
			});
		}).catch(err => {
			res.status(500).json({
				status: false,
				response: err
			});
		});
		return
	} else {
		var number = phoneNumberFormatter(req.body.number);
	}
	if (fs.existsSync('./wabot-session.json')) {
		var numberExists = await conn.isOnWhatsApp(number);
		if (!numberExists) {
			return res.status(422).json({
				status: false,
				message: 'The number is not registered'
			});
		}
		conn.sendMessage(number, message, MessageType.text).then(response => {
			res.status(200).json({
				status: true,
				response: response
			});
		}).catch(err => {
			res.status(500).json({
				status: false,
				response: err
			});
		});

	} else {
		res.writeHead(401, {
			'Content-Type': 'application/json'
		});
		res.end(JSON.stringify({
			status: false,
			message: 'Please scan the QR before use the API'
		}));
	}
});

server.listen(8000, function(){
    console.log('App Running on *:' + 8000);
});