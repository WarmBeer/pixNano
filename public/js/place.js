var editMode = false;
var zX = 2.5;
var scale = 1
var maxZoom = 32
var pos3 = 0;
var pos4 =0;
var lastPlaced = new Date();
var fullCanvas = [];

function dragElement(elmnt) {
  var pos1 = 0, pos2 = 0, pos3 = 0, pos4 = 0;
  if (document.getElementById(elmnt.id + "header")) {
    // if present, the header is where you move the DIV from:
    document.getElementById(elmnt.id + "header").onmousedown = dragMouseDown;
  } else {
    // otherwise, move the DIV from anywhere inside the DIV: 
    elmnt.onmousedown = dragMouseDown;
  }

function dragMouseDown(e) {
    if(!editMode) {
        e = e || window.event;
        e.preventDefault();
        // get the mouse cursor position at startup:
        pos3 = e.clientX;
        pos4 = e.clientY;
        document.onmouseup = closeDragElement;
        // call a function whenever the cursor moves:
        document.onmousemove = elementDrag;
    }
}

  function elementDrag(e) {
    e = e || window.event;
    e.preventDefault();
    // calculate the new cursor position:
    pos1 = pos3 - e.clientX;
    pos2 = pos4 - e.clientY;
    pos3 = e.clientX;
    pos4 = e.clientY;
    // set the element's new position:
    //pos1 = (zX > 3) ? (pos1*3/20) : (pos1*zX/20);
    //pos2 = (zX > 3) ? (pos2*3/20) : (pos2*zX/20);
    elmnt.style.top = (elmnt.offsetTop - (pos2/zX)) + "px";
    elmnt.style.left = (elmnt.offsetLeft - (pos1/zX)) + "px";
  }

  function closeDragElement() {
    // stop moving when mouse button is released:
    document.onmouseup = null;
    document.onmousemove = null;
  }
}

function renderGrid() {
    var grid = document.getElementById("grid");
var gridctx = grid.getContext("2d");
for(var row = 0;row<250;row++){
for(var i = 0;i<250;i++) {
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
    console.log(editMode);
  if(document.getElementById("1").value=="EDIT MODE"){
      editMode = true;  
      document.getElementById("zoom-controller").style.cursor = "default";
      document.getElementById("1").value="VIEW MODE";
  }

  else if(document.getElementById("1").value=="VIEW MODE"){
      editMode = false;  
      document.getElementById("zoom-controller").style.cursor = "move";
      document.getElementById("1").value="EDIT MODE";
  }
} 

$(document).ready(() => {
    var socket = io()
    var canvas = $("#place")[0]
    var ctx = canvas.getContext("2d")
    var message = $("#text")[0]
    
    canvas.addEventListener("click", getClickPosition, false)
    
    renderGrid()
    
    var eyedropperIsActive=false; 

    // Activate reading pixel colors when a #startDropper button is clicked
    $("#startDropper").click(function(e){eyedropperIsActive=!eyedropperIsActive;$("#place").toggleClass("eyeDropper");$("#startDropper").toggleClass("active");
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

    }
    
    function getClickPosition(e) {
        if(editMode && !eyedropperIsActive) {
            var offset = $(this).offset()
            var xPosition = Math.floor(((e.clientX - offset.left)/zX)/scale)
            var yPosition = Math.floor(((e.clientY - offset.top)/zX)/scale)
            var now = new Date()
            var seconds = (now.getTime() - lastPlaced.getTime()) / 1000;
            if(seconds > 0.1) {
                lastPlaced = now;
                ctx.fillStyle = $("#color").val()
                ctx.fillRect(xPosition * scale, yPosition * scale, scale, scale)
                socket.emit("color", {
                    col: xPosition,
                    row: yPosition,
                    color: $("#color").val()
                })
            }
            

            console.log("Clicked!", xPosition, yPosition, zX)
            console.log("e!",((e.clientX - offset.left)/zX), ((e.clientY - offset.top)/zX), zX)
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
    
    socket.on("update", updateDate => {
        if(fullCanvas != []) {
        updateDate.forEach((change) => {
            ctx.fillStyle = change.color
            ctx.fillRect(change.col * scale, change.row * scale, scale, scale)
            fullCanvas[change.row][change.col] = color
        })
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
    
    $("#canvas-container")[0].addEventListener('wheel', function (e) {
        var dir;

        dir = (e.deltaY > 0) ? -0.1 : 0.1;
        dir = (zX>4) ? dir*4 : dir;
        if(dir > 0 && zX <= maxZoom || dir < 0 && zX > 1.5) {
            zX += dir;
            if(zX > maxZoom) zX = maxZoom;
            if(zX < 1.5) zX = 1.5;
            $("#zoom-controller")[0].style.transform = 'scale(' + zX + ')';
        }
        e.preventDefault();
        return;
    });

if(!editMode) {
    dragElement(document.getElementById("camera-controller"));
}
    
$("#toggleGrid").click(function(){
    $("#grid").toggleClass("show");
});

})
