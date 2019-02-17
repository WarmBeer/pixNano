const express = require("express"),
      app = express(),
      server = require("http").createServer(app),
      io = require("socket.io")(server),
      AdmZip = require('adm-zip'),
      fs = require("fs")


const CANVAS_ROWS = 500
const CANVAS_COLS = 500
const project_name = "Cartographer2"
const names = [
    "Spartan", "Coconut", "Cortana", "Nerd", "Johan", "Cowmilk", "Bitterbal", "Knight", "Heineken", "Cold Ketchup", "Heinz", "Mars", "Johnson", "Bill", "Recon", "Beer", "Chicken", "Rooster", "Wheezy", "Grunt", "Elite", "Arbiter", "Liberal", "Sir", "Marine", "Jul Ma'am", "Chief", "Tomato", "Captain", "Monitor"
]

var canvas = [ ]
var updates = []
var users = {}
var clients = 0

var dir = './' + project_name;

if (!fs.existsSync(dir)){
    fs.mkdirSync(dir);
    fs.mkdirSync(dir + '/backups');
}

function saveCanvas() {
    if(canvas != []) {
        fs.writeFile(project_name + '/canvas.txt', JSON.stringify(canvas), (err) => {
            if(err) throw err

            //console.log("Canvas saved!")
        })
    }
}

function loadCanvas() {
    fs.readFile(project_name + '/canvas.txt', 'utf-8', (err, canvasData) => {
        if(err) throw err

        canvas = JSON.parse(canvasData)
    })
}

function saveBackup() {
    var zip = new AdmZip();
    var now = new Date();
    var filename = "canvas - "+ now.getDate()+'-'+ now.getMonth()+'-'+ now.getFullYear()+'-'+ now.getTime();
    var file = JSON.stringify(canvas)
    zip.addFile(filename + ".txt", Buffer.alloc(file.length, file), "Backup canvas");
    zip.writeZip(dir + '/backups/' + filename + ".zip");
}

function getRandomInt(min, max) {
    return min + Math.floor(Math.random() * (max - min + 1));
}

function generateName(){
	var name = names[getRandomInt(0, names.length)] + Math.floor(1000 + Math.random() * 9000);
	return name;
}

if (fs.existsSync(project_name + '/canvas.txt')) {
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
    var clientIp = socket.request.connection.remoteAddress;
    
    if(!(clientIp in users)) {
        users[clientIp] = {
            "messageTime": new Date(),
            "pixelTime": new Date(),
            "name": generateName()
        }
        if(users[clientIp].name == null) {
            users[clientIp].name = generateName()
        }
    }
    
    socket.emit("confirmed", users[clientIp].name)
    socket.emit("canvas", canvas)
    io.emit("alert", "Welcome " + users[clientIp].name + "!")
    io.emit("users", clients)
    
    socket.on('disconnect', function() {
        --clients
        io.emit("users", clients);
    })
    
    socket.on('canvas', function() {
        socket.emit("canvas", canvas)
    })
    
    socket.on("color", data => {
        var clientIp = socket.request.connection.remoteAddress;
        var now = new Date();
        var seconds = (now.getTime() - users[clientIp].pixelTime.getTime()) / 1000;
        if(seconds > 0.1 && data != "") {
            if(data.row <= CANVAS_ROWS && data.row > 0 && data.col <= CANVAS_COLS && data.col > 0){
                canvas[data.row][data.col] = data.color
                users[clientIp].pixelTime = new Date();
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
        var clientIp = socket.request.connection.remoteAddress;
        var now = new Date();
        var seconds = (now.getTime() - users[clientIp].messageTime.getTime()) / 1000;
        if(seconds > 1 && data.message != "") {
            var message = data.message.replace(/(<([^>]+)>)/ig,"");
            io.emit("newMessage", {
                message: message,
                username: users[clientIp].name
            })
            users[clientIp].messageTime = new Date();
        } else {
            return
        }
    })
})

setInterval(saveBackup, 1000 * 60 * 1);
setInterval(saveCanvas, 1000 * 60 * 1)

setInterval(function(){io.emit('update', updates);updates = [];},1200)
setInterval(function(){io.emit('canvas', canvas);},24000)

server.listen(3000)
console.log('Server successfully started on: ' + project_name)