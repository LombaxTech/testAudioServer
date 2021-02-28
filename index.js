const express = require("express");
const bodyParser = require("body-parser");
const config = require("./config");
const { videoToken } = require("./tokens");
const cors = require("cors");

const client = require("twilio")(
    process.env.TWILIO_ACCOUNT_SID,
    // "SK92e0d9f208ae6944e898281196dcaf71"
    process.env.TWILIO_AUTH_TOKEN
    // "QmCygr3L7YYzX0NmvQ3vwx6yeAoLt6Ud"
);

console.log(process.env.TWILIO_ACCOUNT_SID);

const app = express();
app.use(bodyParser.urlencoded({ extended: false }));
app.use(bodyParser.json());
app.use(cors());

const sendTokenResponse = (token, res) => {
    res.set("Content-Type", "application/json");
    res.send(JSON.stringify({ token: token.toJwt() }));
};

app.get("/", (req, res) => res.send("Hello!"));

app.get("/video/token", (req, res) => {
    const { identity, room } = req.query;
    const token = videoToken(identity, room, config);
    sendTokenResponse(token, res);
});

app.post("/video/token", async (req, res) => {
    const { identity, roomName } = req.body;
    try {
        let room = await client.video.rooms(roomName).fetch();
        if (room) {
            const token = videoToken(identity, roomName, config);
            sendTokenResponse(token, res);
        }
    } catch (error) {
        //! Error 20404 - RESOURCE NOT FOUND
        res.json(error.code);
    }
});

app.post("/room", async (req, res) => {
    const { identity, roomName } = req.body;

    try {
        let room = await client.video.rooms.create({
            statusCallback: "https://audio-test-network.herokuapp.com/hook",
            statusCallbackMethod: "POST",
            type: "group",
            uniqueName: roomName,
        });
        const token = videoToken(identity, roomName, config);
        sendTokenResponse(token, res);
        // res.json(room);
    } catch (error) {
        res.json(error.code);
    }
});

app.get("/rooms", async (req, res) => {
    try {
        // return res.send("hello");
        let rooms = await client.video.rooms.list();
        res.json(rooms);
    } catch (error) {
        res.json({ error });
    }
});

app.post("/hook", async (req, res) => {
    console.log(req.body);
    const { StatusCallbackEvent, RoomName, RoomSid } = req.body;

    res.json({
        StatusCallbackEvent,
        RoomName,
        RoomSid,
    });
});

// app.get("/config", (req, res) => res.json(config));

const PORT = process.env.PORT || 8000;
app.listen(PORT, () => console.log(`Started listening on port ${PORT}`));
