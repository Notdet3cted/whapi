const express = require("express")
const { initWAClient } = require("./wa")
const app = express()



app.listen(3000, () => {
    console.log("http://localhost:3000");
    initWAClient();
})