const currentVersion = "1.0.0";

var editMode = false;
var zX = 1.5;
var scale = 1
var maxZoom = 32
var minZoom = 1
var pos3 = 0;
var pos4 =0;
var lastPlaced = new Date();
var fullCanvas = [];
var xPos;
var yPos;
var funds;

function renderGrid() {
    var grid = document.getElementById("grid");
    var gridctx = grid.getContext("2d");
    for(var row = 0;row<500;row++){
        for(var i = 0;i<500;i++) {
            if(i%2==0) {
                if(row%2==0) {
                    gridctx.fillStyle = "#D3D3D3";
                } else {
                    gridctx.fillStyle = "#FFF";
                }
            } else {
                if(row%2==1) {
                    gridctx.fillStyle = "#D3D3D3";
                } else {
                    gridctx.fillStyle = "#FFF";
                }
            }
            gridctx.fillRect(i,row,1,1);
        }
    }
}

function toggle(button) {
  if(document.getElementById("1").value=="EDIT MODE"){
      editMode = true;  
      document.getElementById("zoom-controller").style.cursor = "default";
      document.getElementById("1").value="VIEW MODE";
      $('#zoom-controller').draggable( "disable" )
  }

  else if(document.getElementById("1").value=="VIEW MODE"){
      editMode = false;  
      document.getElementById("zoom-controller").style.cursor = "move";
      document.getElementById("1").value="EDIT MODE";
      $('#zoom-controller').draggable( "enable" )
  }
} 

$(document).ready(() => {
    var socket = io()
    var canvas = $("#place")[0]
    var ctx = canvas.getContext("2d")
    var message = $("#text")[0]
    var eyedropperIsActive=false; 
    
    canvas.addEventListener("click", getClickPosition, false)
    renderGrid()
    
    $('#zoom-controller').draggable({
        
        start: function(event, ui){
            
        },
        
        drag: function(event, ui){
            xPos = parseFloat($(this).css("left").replace('px', ""));
            yPos = parseFloat($(this).css("top").replace('px', ""));
            
            xpPos = (500 - xPos)/10;
            ypPos = (500 - yPos)/10;
            
            $(this).css({
                'transform-origin':         xpPos + '% ' + ypPos + '%',
                '-webkit-transform-origin': xpPos + '% ' + ypPos + '%'
            });
            
            var $dragme = $(event.target);
            var dx = ui.position.left - ui.originalPosition.left;
            var dy = ui.position.top - ui.originalPosition.top;
            ui.position.left = ui.originalPosition.left + (dx / zX);
            ui.position.top = ui.originalPosition.top + (dy / zX);
        }
    });

    // Activate reading pixel colors when a #startDropper button is clicked
    $("#startDropper").click(function(e){
        eyedropperIsActive=!eyedropperIsActive;
        $("#place").toggleClass("eyeDropper");
        $("#startDropper").toggleClass("active");
    });

    // if the tool is active, report the color under the mouse
    $("#place").mousemove(function (e) {
        handleMouseMove(e);
    });

    // when the user clicks on the canvas, turn off the tool 
    // (the last color will remain selected)
    $("#place").click(function(e){
        if(eyedropperIsActive) {
            eyedropperIsActive=false;
            $("#place").removeClass("eyeDropper");
            $("#startDropper").removeClass("active");
        }
    });
    
    $("#undo").click(function(e){
        socket.emit("undo", null, function(err, message, data) {
            if(!err) {
                $("#funds").text(data);
            }
        })
    });
    
    $('#hexcolor').on('input', function() { 
        $('#color').val($(this).val());
    });
    
    $('#color').on('input', function() { 
        $('#hexcolor').val($(this).val());
    });
    
    message.addEventListener("keyup", function(event) {
        event.preventDefault();
        if (event.keyCode === 13) {
            socket.emit("message", {
                message: $("#text").val()
            })
            $("#text").val("")
        }
    });
    
    function getPixelColor(x, y) {
        var pxData = ctx.getImageData(x,y,1,1);
        return("rgb("+pxData.data[0]+","+pxData.data[1]+","+pxData.data[2]+")");
    }
    
    function handleMouseMove(e){

        if(!eyedropperIsActive){return;}

        var offset = $("#place").offset()

        mouseX = Math.floor(((e.clientX - offset.left)/zX)/scale)
        mouseY = Math.floor(((e.clientY - offset.top)/zX)/scale)

          // Put your mousemove stuff here
        var eyedropColor=getPixelColor(mouseX,mouseY);
        $("#color").val(rgb2hex(eyedropColor));
        $("#hexcolor").val(rgb2hex(eyedropColor));

    }
    
    function getClickPosition(e) {
        if(editMode && !eyedropperIsActive) {
            var offset = $(this).offset()
            var xPosition = Math.floor(((e.clientX - offset.left)/zX)/scale)
            var yPosition = Math.floor(((e.clientY - offset.top)/zX)/scale)
            var now = new Date()
            var seconds = (now.getTime() - lastPlaced.getTime()) / 1000;
            if(funds > 0) {
                if(seconds > 0.1) {
                    lastPlaced = now;
                    ctx.fillStyle = $("#color").val()
                    ctx.fillRect(xPosition * scale, yPosition * scale, scale, scale)
                    socket.emit("color", {
                        version: currentVersion,
                        col: xPosition,
                        row: yPosition,
                        color: $("#color").val()
                    }, function(err, message, data){
                        if (err) {
                            alert(message)
                            ctx.fillStyle = data.color
                            ctx.fillRect(data.col * scale, data.row * scale, scale, scale)
                            fullCanvas[data.row][data.col] = color
                        } else {
                            $("#funds").text(data);
                        }
                    })
                }
            }
            //console.log("Clicked!", xPosition, yPosition, zX)
            //console.log("e!",((e.clientX - offset.left)/zX), ((e.clientY - offset.top)/zX), zX)
        }
    }
    
    function getTimeString() {
        var time = new Date();
        var hours = (time.getHours() < 10) ? ('0'+time.getHours()) : time.getHours();
        var minutes = (time.getMinutes() < 10) ? ('0'+time.getMinutes()) : time.getMinutes();
        var timeString = hours + ':' + minutes;
        return timeString;
    }
    
    socket.on("canvas", canvasData => {
        if(fullCanvas == canvasData) {
            return
        } else {
            canvasData.forEach((row, rowIndex) => {
                row.forEach((col, colIndex) => {
                    ctx.fillStyle = col
                    ctx.fillRect(colIndex * scale, rowIndex * scale, scale, scale)
                })
            })
            fullCanvas = canvasData;
        }
    })
    
    socket.on("update", data => {
        if(fullCanvas != []) {
            ctx.fillStyle = data.color
            ctx.fillRect(data.col * scale, data.row * scale, scale, scale)
            fullCanvas[data.row][data.col] = color
        } else {
            socket.emit('canvas')
        }
    })
    
    socket.on("newMessage", messageData => {
        $('<div class="container"><span class="username">'+messageData.username+'<span class="time-right">'+getTimeString()+'</span></span><p>'+messageData.message+'</p></div>').prependTo("#chat-window");
    })
    
    socket.on("alert", messageData => {
        var time = new Date();
        $('<div class="container alert"><span class="username">SERVER ALERT<span class="time-right alttime">'+getTimeString()+'</span></span><p>'+messageData+'</p></div>').prependTo("#chat-window");
    })
    
    socket.on("users", users => {
        $("#online").text(users);
    })
    
    socket.on("confirmed", account => {
        funds = account.funds;
        $("#username").text(account.username);
        $("#funds").text(account.funds);
    })
    
    $("#canvas-container")[0].addEventListener('wheel', function (e) {
        var dir;
        

        dir = (e.deltaY > 0) ? -0.1 : 0.1;
        dir = (zX>4) ? dir*4 : dir;
        if(dir > 0 && zX <= maxZoom || dir < 0 && zX > minZoom) {
            zX += dir;
            if(zX > maxZoom) zX = maxZoom;
            if(zX < minZoom) zX = minZoom;
            $("#zoom-controller")[0].style.transform = 'scale(' + zX + ')';
        }
        e.preventDefault();
        return;
    });
    
$("#toggleGrid").click(function(){
    $("#grid").toggleClass("show");
});

})
