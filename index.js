const express = require("express");
const http = require("http");
const app = express();
const server = http.createServer(app);
const socket = require("socket.io");
const io = socket(server);

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
        console.log("MADE A ROOM!");
        if (room) {
            const token = videoToken(identity, roomName, config);
            // console.log("MADE IT HERE");
            sendTokenResponse(token, res);
        }
    } catch (error) {
        //! Error 20404 - RESOURCE NOT FOUND
        // res.json(error);
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
    const { StatusCallbackEvent, RoomName, RoomSid } = req.body;
    // if (
    //     StatusCallbackEvent === "room-created" ||
    //     StatusCallbackEvent === "room-ended"
    // ) {
    console.log({
        StatusCallbackEvent,
        RoomName,
        RoomSid,
    });
    // }

    res.json({
        StatusCallbackEvent,
        RoomName,
        RoomSid,
    });
});

// app.get("/config", (req, res) => res.json(config));

const users = {};

app.get("/user/:id", (req, res) => {
    const { id } = req.params;
    if (users[id]) {
        return res.json(users[id]);
    }
    return res.json({ error: "no user found" });
});

io.on("connection", (socket) => {
    socket.emit("setId", socket.id);

    if (!users[socket.id]) {
        users[socket.id] = {};
    }

    socket.on("checkId", () => socket.emit(socket.id));
    socket.on("setName", (name) => {
        users[socket.id] = { name };
        console.log(users);
    });

    socket.on("setImage", (url) => {
        users[socket.id].imageUrl = url;
        console.log(users);
        io.emit(users);
    });

    socket.on("disconnect", () => {
        delete users[socket.id];
        console.log(users);
    });

    socket.on("canSend", () => console.log("CAN SEND!!"));
    socket.on("getUser", (id) => socket.emit("user", users[id]));
});

const PORT = process.env.PORT || 8000;
server.listen(PORT, () => console.log(`Started listening on port ${PORT}`));
