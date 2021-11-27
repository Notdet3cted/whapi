const { WAConnection } = require("@adiwajshing/baileys")

const initWAClient = () => {
    const client = new WAConnection();

    client.on("qr", () => {
        console.log("Scan QR please");
    })

    client.connect();
}

module.exports = {
    initWAClient
}