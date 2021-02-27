const express = require("express");
const bodyParser = require("body-parser");
const config = require("./config");
const { videoToken } = require("./tokens");
const cors = require("cors");
// const pino = require("express-pino-logger");

const app = express();
app.use(bodyParser.urlencoded({ extended: false }));
app.use(bodyParser.json());
app.use(cors());
// app.use(pino);

const sendTokenResponse = (token, res) => {
    res.set("Content-Type", "application/json");
    res.send(JSON.stringify({ token: token.toJwt() }));
};

app.get("/", (req, res) => res.send("hello"));

app.get("/api/greeting", (req, res) => {
    const name = req.query.name || "No name";
    res.setHeader("Content-Type", "application/json");
    res.send(JSON.stringify({ greeting: `Hello ${name}!` }));
});

app.get("/video/token", (req, res) => {
    const { identity, room } = req.query;
    const token = videoToken(identity, room, config);
    sendTokenResponse(token, res);
});

app.post("/video/token", (req, res) => {
    const { identity, room } = req.body;
    // return res.json({ identity, room });
    const token = videoToken(identity, room, config);
    sendTokenResponse(token, res);
});

// app.get("/config", (req, res) => res.json(config));

const PORT = process.env.PORT || 8000;
app.listen(PORT, () => console.log(`Started listening on port ${PORT}`));
