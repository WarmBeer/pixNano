var   express = require("express"),
      http = require("http"),
      app = express(),
      fs = require("fs"),
      options = {
        key: fs.readFileSync("./ssl/private.key"),
        cert: fs.readFileSync("./ssl/certificate.crt"),
        ca: fs.readFileSync("./ssl/ca_bundle.crt"),
      },
      server = require("https").createServer(options, app),
      io = require("socket.io")(server),
      AdmZip = require('adm-zip');

const CANVAS_ROWS = 500
const CANVAS_COLS = 500
const pixelCooldown = 0.1
const baseFunds = 10000
const saveCanvasInterval = 10
const saveBackupInterval = 60
const spamDistance = 50;
const project_name = "Reclaimer"
const currentVersion = "1.2.0"
const names = [
    "Spartan", "Coconut", "Cortana", "Nerd", "Johan", "Cowmilk", "Bitterbal", "Knight", "Heineken", "Cold Ketchup", "Heinz", "Mars", "Johnson", "Bill", "Recon", "Beer", "Chicken", "Rooster", "Wheezy", "Grunt", "Elite", "Arbiter", "Liberal", "Sir", "Marine", "Jul Ma'am", "Chief", "Tomato", "Captain", "Monitor", "Butter", "Unknown", "King", "Wizard", "Space Monk"
]

var canvas = [ ]
var updates = []
var users = {}
var clients = 0
var dir = './' + project_name;

if (!fs.existsSync(dir)){
    fs.mkdirSync(dir);
    fs.mkdirSync(dir + '/backups');
    fs.mkdirSync('./users');
}

function saveCanvas() {
    if(canvas != []) {
        fs.writeFile(project_name + '/canvas.txt', JSON.stringify(canvas), (err) => {
            if(err) throw err

            //console.log("Canvas saved!")
        })
    }
}

function saveUsers() {
    if(users != {}) {
        fs.writeFile('./users/clients.txt', JSON.stringify(users), (err) => {
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

function loadUsers() {
    fs.readFile('users/clients.txt', 'utf-8', (err, userData) => {
        if(err) throw err

        users = JSON.parse(userData)
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

if (fs.existsSync('users/clients.txt')) {
    loadUsers()
} else {
    users = {}
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
            "lastAction": null,
            "name": generateName(),
            "funds": baseFunds
        }
        if(users[clientIp].name == null) {
            users[clientIp].name = generateName()
        }
    }
    
    socket.emit("confirmed", {
        "username": users[clientIp].name,
        "funds": users[clientIp].funds
    })
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
    
    socket.on("undo", function(data, callback){
        if(users[clientIp].lastAction != null) {
            let row = users[clientIp].lastAction.row
            let col = users[clientIp].lastAction.col
            let color = users[clientIp].lastAction.color
            canvas[row][col] = color
            ++users[clientIp].funds
            io.emit("update", {
                "col": col,
                "row": row,
                "color": color
            })
            users[clientIp].lastAction = null
            callback(false, "Undone last action.", users[clientIp].funds)
        }
    })
    
    socket.on("color", function(data, callback){
        if(data.version != currentVersion) {
            callback(true, "Refresh your browser!")
            return
        }
        if(data.row <= CANVAS_ROWS && data.row >= 0 && data.col <= CANVAS_COLS && data.col >= 0){
            let clientIp = socket.request.connection.remoteAddress;
            let lastUpdate = new Date(Date.parse(users[clientIp].pixelTime));
            let seconds = (Date.now() - lastUpdate.getTime()) / 1000;
            let currentPixel = {
                col: data.col,
                row: data.row,
                color: canvas[data.row][data.col]
            };
            let price = 1;
            if (canvas[data.row][data.col] == "#fff" ||
                canvas[data.row][data.col] == "#FFF" || 
                canvas[data.row][data.col] == "#ffffff" ||
                canvas[data.row][data.col] == "#FFFFFF") {
                            price = 1;
            } else {
                price = 100;
            }
            if(users[clientIp].funds >= price) {
                if(seconds > pixelCooldown && data != "") {
                    let diff = (users[clientIp].lastAction != null) ? Math.sqrt(Math.abs(users[clientIp].lastAction.col - data.col)**2 + Math.abs(users[clientIp].lastAction.row - data.row)**2) : 0;
                    if(seconds < 1.2 && diff > spamDistance) {
                        callback(true, "Spamming detected.", currentPixel)
                        return
                    }
                    if (canvas[data.row][data.col] != data.color) {
                        users[clientIp].funds -= price;
                        callback(false, "Pixel accepted.", users[clientIp].funds)
                        users[clientIp].lastAction = {
                            "col": data.col,
                            "row": data.row,
                            "color": canvas[data.row][data.col]
                        }
                        canvas[data.row][data.col] = data.color
                        users[clientIp].pixelTime = new Date();
                        socket.broadcast.emit("update", data)
                    } else {
                        callback(true, "Pixel is the same color.")
                        return
                    }
                } else {
                    callback(true, "You are going to fast!", currentPixel)
                    return
                }
            } else {
                callback(true, "Insufficient funds.", currentPixel)
                return
            }
        } else {
                    callback(true, "Pixel out of bounds.")
                    return
        }
    })
    
    socket.on("message", data => {
        var clientIp = socket.request.connection.remoteAddress;
        var seconds = (Date.now() - users[clientIp].messageTime.getTime()) / 1000;
        if(seconds > pixelCooldown && data.message != "") {
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

setInterval(saveBackup, 1000 * saveBackupInterval);
setInterval(saveCanvas, 1000 * saveCanvasInterval);
setInterval(function() {
    for (var client in users) {
        users[client].funds = baseFunds;
    }
}, 1000*3600*24);
//setInterval(saveUsers, 1000 * 10)

//setInterval(function(){io.emit('update', updates);updates = [];},2000)
setInterval(function(){io.emit('canvas', canvas);}, 30000)

server.listen(443)
http.createServer(function (req, res) {
    res.writeHead(301, { "Location": "https://" + req.headers['host'] + req.url });
    res.end();
}).listen(80);
console.log('Server successfully started on: ' + project_name)