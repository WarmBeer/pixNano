const express = require("express"),
      app = express(),
      server = require("http").createServer(app),
      io = require("socket.io")(server)

const CANVAS_ROWS = 250
const CANVAS_COLS = 250

const fs = require("fs")

var canvas = [ ]
var messages = {}
var pixels = {}

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
    messages[socket.id] = new Date();
    pixels[socket.id] = new Date();
    socket.emit("canvas", canvas)
    
    socket.on("color", data => {
        var now = new Date();
        var seconds = (now.getTime() - pixels[socket.id].getTime()) / 1000;
        if(seconds > 0.1 && data != "") {
            if(data.row <= CANVAS_ROWS && data.row > 0 && data.col <= CANVAS_COLS && data.col > 0){
                canvas[data.row - 1][data.col - 1] = data.color
                io.emit("canvas", canvas)
                pixels[socket.id] = new Date();
            }
        } else {
            return
        }
    })
    
    socket.on("message", data => {
        var now = new Date();
        var seconds = (now.getTime() - messages[socket.id].getTime()) / 1000;
        if(seconds > 1 && data != "") {
            var message = data.message.replace(/(<([^>]+)>)/ig,"");
            io.emit("newMessage", message)
            messages[socket.id] = new Date();
        } else {
            return
        }
    })
})

setInterval(saveBackup, 1000 * 60 * 10);
setInterval(saveCanvas, 1000 * 60 * 1);

server.listen(3000)