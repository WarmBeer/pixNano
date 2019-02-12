var editMode = false;
var zX = 2.5;
var scale = 1
var maxZoom = 16

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
    pos1 = pos3 - (e.clientX);
    pos2 = pos4 - (e.clientY);
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
    
    canvas.addEventListener("click", getClickPosition, false)
    
    function getClickPosition(e) {
        if(editMode) {
            var offset = $(this).offset()
            var xPosition = Math.floor(((e.clientX - offset.left)/zX)/scale)+1
            var yPosition = Math.floor(((e.clientY - offset.top)/zX)/scale)+1

            socket.emit("color", {
                col: xPosition,
                row: yPosition,
                color: $("#color").val()
            })

            console.log("Clicked!", xPosition, yPosition, zX)
            console.log("e!",((e.clientX - offset.left)/zX), ((e.clientY - offset.top)/zX), zX)
        }
    }
    
    socket.on("canvas", canvasData => {
        canvasData.forEach((row, rowIndex) => {
            row.forEach((col, colIndex) => {
                ctx.fillStyle = col
                ctx.fillRect(colIndex * scale, rowIndex * scale, scale, scale)
            })
        })
    })
    
    $("#submit").click(() => {
        socket.emit("color", {
            col: parseInt($("#x-coord").val()),
            row: parseInt($("#y-coord").val()),
            color: $("#color").val()
        })
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

})
