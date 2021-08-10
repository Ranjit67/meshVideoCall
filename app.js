const express = require("express");
const socket = require("socket.io");
const createError = require("http-errors");

const app = express();
app.use(express.json());
const http = require("http");
const server = http.createServer(app);
const path = require("path");

const io = socket(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"],
    allowedHeaders: ["my-custom-header"],
    credentials: true,
  },
});
let usersList = [];
io.on("connection", (socket) => {
  socket.on("offer", (payload) => {
    const { offerSdp } = payload;
    if (usersList.length < 1) {
      usersList.push(socket.id);
      //   console.log(socket.id);
    } else {
      usersList.forEach((id) => {
        sendMessage("offerSendByOneUser", { offerSdp, soId: id }, id);
      });
      usersList.push(socket.id);
      console.log(usersList);
    }
  });
  socket.on("answer", (payload) => {
    const { answerSdp, id } = payload;
    console.log(id);
    io.to(id).emit("answerSendByOneUser", { answerSdp });
    // sendMessage("answerSendByOneUser", { answer }, id);
  });
  socket.on("ice_send", (payload) => {
    const { ice } = payload;
    const filterHimself = usersList?.filter((id) => id !== socket.id);
    filterHimself?.forEach((id) => {
      io.to(id).emit("ice_candidate", { ice });
      //   sendMessage("ice_candidate", { ice }, id);
    });
  });
  socket.on("one_user_leave", (payload) => {
    const filterUser = usersList?.filter((id) => id !== socket.id);
    usersList = filterUser;
  });

  socket.on("disconnect", () => {
    const filterUser = usersList?.filter((id) => id !== socket.id);
    usersList = filterUser;
  });

  //   message function
  const sendMessage = (messageTrig, value, id) => {
    if (id) {
      socket.to(id).emit(messageTrig, value);
    } else {
      socket.emit(messageTrig, value);
    }
  };
});

app.use(function (req, res, next) {
  res.header("Access-Control-Allow-Origin", "*");

  res.header(
    "Access-Control-Allow-Headers",
    "Access-Control-Allow-Headers, Origin,Accept, X-Requested-With, Content-Type, Access-Control-Request-Method, Access-Control-Request-Headers,X-Access-Token,XKey,Authorization"
  );

  if (req.method === "OPTIONS") {
    res.header("Access-Control-Allow-Methods", "GET, POST, PUT, PATCH, DELETE");
    return res.status(200).json({});
  }
  next();
});

app.use(async (req, res, next) => {
  next(createError.NotFound());
});

app.use((err, req, res, next) => {
  res.status(err.status || 400);
  res.send({
    error: {
      status: err.status || 400,
      message: err.message,
    },
  });
});

server.listen(process.env.PORT || 9000, () => {
  console.log("The port 9000 is ready to start....");
});
