const express = require("express"),
      app = express(),
      server = require("http").createServer(app),
      io = require("socket.io")(server)

const CANVAS_ROWS = 250
const CANVAS_COLS = 250

const fs = require("fs")
const names = [
    "Masterchief", "Coconut", "Cortana", "Nerd", "Johan", "Cowmilk", "Bitterbal", "Worstenbroodje", "Heineken", "Cold Ketchup", "Heinz", "Mars", "Johnson", "Bill Gates", "Recon", "Beer", "Chicken", "Rooster", "Wheezy"
]

var canvas = [ ]
var updates = []
var users = {}
var clients = 0

function saveCanvas() {
    fs.writeFile('canvas.txt', JSON.stringify(canvas), (err) => {
        if(err) throw err

        //console.log("Canvas saved!")
    })
}

function loadCanvas() {
    fs.readFile('canvas.txt', 'utf-8', (err, canvasData) => {
        if(err) throw err

        canvas = JSON.parse(canvasData)
    })
}

function saveBackup() {
    var now = new Date();
    fs.writeFile("backups/canvas - "+ now.getDate()+'-'+ now.getMonth()+'-'+ now.getFullYear()+'-'+ now.getTime() +".txt", JSON.stringify(canvas), (err) => {
        if (err) throw err;
        console.log('Backup made');
    });
}

function getRandomInt(min, max) {
    return min + Math.floor(Math.random() * (max - min + 1));
}

function generateName(){
	var name = names[getRandomInt(0, names.length)] + Math.floor(1000 + Math.random() * 9000);
	return name;
}

if (fs.existsSync('canvas.txt')) {
    loadCanvas()

} else {
    for(var rows = 0; rows < CANVAS_ROWS; rows++){
        canvas[rows] = [ ]

        for(var cols = 0; cols < CANVAS_COLS; cols++){
            canvas[rows][cols] = "#FFF"
        }
    }
}

app.use(express.static("public"))

io.on("connection", socket => {
    ++clients
    console.log(clients)
    
    users[socket.id] = {
        "messageTime": new Date(),
        "pixelTime": new Date(),
        "name": generateName()
    }
    
    socket.on('disconnect', function() {
        --clients
        io.emit("users", clients);
    })
    
    socket.on('canvas', function() {
        socket.emit("canvas", canvas)
    })
    
    socket.emit("canvas", canvas)
    io.emit("alert", "Welcome " + users[socket.id].name + "!")
    io.emit("users", clients)
    
    socket.on("color", data => {
        var now = new Date();
        var seconds = (now.getTime() - users[socket.id].pixelTime.getTime()) / 1000;
        if(seconds > 0.1 && data != "") {
            if(data.row <= CANVAS_ROWS && data.row > 0 && data.col <= CANVAS_COLS && data.col > 0){
                canvas[data.row][data.col] = data.color
                users[socket.id].pixelTime = new Date();
                updates.push({
                    col: data.col,
                    row: data.row,
                    color: data.color
                })
            }
        } else {
            return
        }
    })
    
    socket.on("message", data => {
        var now = new Date();
        var seconds = (now.getTime() - users[socket.id].messageTime.getTime()) / 1000;
        if(seconds > 1 && data.message != "") {
            var message = data.message.replace(/(<([^>]+)>)/ig,"");
            io.emit("newMessage", {
                message: message,
                username: users[socket.id].name
            })
            users[socket.id].messageTime = new Date();
        } else {
            return
        }
    })
})

setInterval(saveBackup, 1000 * 60 * 10);
setInterval(saveCanvas, 1000 * 60 * 1)

setInterval(function(){io.emit('update', updates);updates = [];},3000)
setInterval(function(){io.emit('canvas', canvas);},30000)

server.listen(3000)