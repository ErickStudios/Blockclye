const express = require("express");
const app = express();

app.use(express.static(__dirname));

app.listen(5500, () => {
    console.log("🌐 Web running at http://localhost:5500");
});