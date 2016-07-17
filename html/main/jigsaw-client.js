var stage = 0;
var pixelsWidth = 300;
var uploadedBlob = undefined;
var already = undefined;
var spinner = undefined;


var stageText =
  [
    '1. Choose your favorite picture',
    '2. Adjust the look of the engraving using the slider',
    '3. Choose the size and number of pieces',
    'Waiting for a response from the Autodesk cloud...',
    '4. Check the results and download your DWG or DXF'
  ];

var elements =
  [
    'explanation',   // 0
    'droppedimage',  // 1
    'engravedimage', // 2
    'engimage',      // 3
    'loading',       // 4
    'jigsaw',        // 5
    'jigimage',      // 6
    'dropbox',       // 7
    'threshold',     // 8
    'size',          // 9
    'nav',           // 10
    'back',          // 11
    'next',          // 12
    'dwg',           // 13
    'dxf' ,          //14
    'sendtodropbox'        //15
  ];

// Elements that are visible at each stage

var stages =
  [
    [0, 7],                 // Stage 0 - ready to drop
    [1, 8, 10, 11, 12],     // Stage 1 - image loaded, adjust slider
    [2, 9, 10, 11, 12],     // Stage 2 - choose size and pieces
    [4, 6, 10, 11],         // Stage 3 - waiting...
    [5, 6, 10, 11, 13, 14,15]  // Stage 4 - show results
  ];

// Initialize all the elements to be considered on

var on = [];
for (var i = 0; i < elements.length; i++) {
  on.push(true); // All elements initially on
}

function turnOn(id) {
  var idx = elements.indexOf(id);
  if (idx >= 0) {
    $('#' + id).show();
    on[idx] = true;
  }  
}


function buildCanvas(img, id, after) {

    var canvas = undefined;
    if (id) {
      canvas = $('#' + id)[0];
      if (!canvas) {

        if (!after) {
          after = img;
        }

        $('<canvas class=\'can\' id=\'' + id + '\' width=\'' + img.width +
          '\' height=\'' + img.height +
          '\'></canvas>').insertAfter(after);

        canvas = $('#' + id)[0];
      } else {
        canvas.width = img.width;
        canvas.height = img.height;
      }
    } else {
      // Create a canvas using other means 

      canvas = document.createElement('canvas');
      canvas.width = img.width;
      canvas.height = img.height;
    }
    return canvas;
}

function setStage(newStage) {

  // Some custom logic to be run for the stages that need it

  switch (newStage) {
    case 0:
      //$('#content')[0].style.width = '640px';
  
      // Clear the engraved image, reset the slider
  
      var canvas = $('#rawData2')[0];
      if (canvas) {
        canvas.height = 0;
      }
      $('#threshold')[0].value = 70;
      break;
  
    case 1:
      //$('#content')[0].style.width = '100%';
      setTimeout(function(){
        var img = $('#image')[0];
        var canvas = buildCanvas(img, 'rawData');
        var outcanvas = buildCanvas(img);
        var thresh = $('#threshold')[0].value;
        edgeDetector.threshold = thresh;
        edgeDetector.init(img, canvas, outcanvas);
        edgeDetector.update(thresh);
      }, 0);
      break;
  
    case 2:
      //$('#content')[0].style.width = '640px';
      setTimeout(function(){
        if (spinner)
          spinner.stop();
        
        var img = $('#image')[0];
        var canvas = buildCanvas(img, 'rawData2', $('#engimage')[0]);
        var outcanvas = buildCanvas(img);
        edgeDetector.init(img, canvas, outcanvas);
        edgeDetector.update(edgeDetector.threshold);     


        if (already) {
          // This will keep the proportions of the new image
          setWidth($('#width').val()); 


        } else {
          setWidth(12);
          setPieces(100);
          already = true;
        }

      }, 0);

      break;
  
    case 3:
  
      // Only enter the waiting stage if going forward
  
      if (stage == 2) {


          var isdwg = false;
          if(selectedNode.node != null)
            if(selectedNode.node.type == 'items' || 
               selectedNode.node.type == 'versions' )          
                  if(selectedNode.node.text.indexOf('.dwg') >-1)
                      isdwg = true;

          //if no DWG is selected in the files tree
          //use a template
          if(!isdwg){
                BootstrapDialog.show({
                title: 'Forge',
                message: 'The selected file is not DWG! Use a template DWG or cancel?',
                buttons: [{
                    label: 'OK',
                    action: function(dialog) {
                        //do nothing. continue the job
                         dialog.close();
                        //start to do the job
                         doworkitem(isdwg);
                    }
                }, {
                    //wait for user to input again
                    label: 'Cancel',
                    action: function(dialog) {
                         dialog.close();
                         setStage(2);
                        return;
                    }
                }]
              });
          }
          else
          {
              //start to do the job
             doworkitem(isdwg);
          }
        
      } else {
  
        // Otherwise we skip it
  
        setStage(2);
        return;
      }
      break;
   
    case 4:
      if (spinner)
        spinner.spin();
      break;
    default:
  }

  // Then we just loop through the elements, switching the ones
  // on that we need (and turning the rest that are on to be off)

  var list = stages[newStage];
  for (var i=0; i < elements.length; i++) {
    var idx = list.indexOf(i);
    if (idx < 0) { // Element should be off
      if (on[i]) { // But it is on
        $('#' + elements[i]).hide();
        on[i] = false;
      }
    }
    else { // Element should be on
      if (!on[i]) { // But it is off
        $('#' + elements[i]).show();
        on[i] = true;
      }
    }
  }

  stage = newStage;
  $('#instruction')[0].innerHTML = stageText[stage];
}

function back() {
  setStage(stage-1);
}

function forward() {
  setStage(stage+1);
}

function slide(num) {
  edgeDetector.update(num);  
}



function makeSyncRequest(url) {
    var xmlHttp = null;
    xmlHttp = new XMLHttpRequest();
    xmlHttp.open("GET", url, false);
    xmlHttp.send(null);
    return xmlHttp.responseText;
}

function setLinkAndSizeTooltip(id, url) {
  findSize(url, function(size) {
    var elem = $(id);
    elem.attr('onclick', 'window.location.href="' + url + '"');
    elem.tooltip( { placement: "top", title: humanFileSize(size, false) } );
  });
}

// From: http://stackoverflow.com/questions/10420352/converting-file-size-in-bytes-to-human-readable

function humanFileSize(bytes, si) {
  var thresh = si ? 1000 : 1024;
  if(Math.abs(bytes) < thresh) {
    return bytes + ' B';
  }
  var units = ['KB','MB','GB','TB','PB','EB','ZB','YB'];  
    //si ? ['kB','MB','GB','TB','PB','EB','ZB','YB']
    //: ['KiB','MiB','GiB','TiB','PiB','EiB','ZiB','YiB'];
  var u = -1;
  do {
    bytes /= thresh;
    ++u;
  } while(Math.abs(bytes) >= thresh && u < units.length - 1);
  return bytes.toFixed(1)+' '+units[u];
}

function findSize(url, success) {
  var request;
  request = $.ajax({
    type: "HEAD",
    url: url,
    success: function () {
      success(request.getResponseHeader("Content-Length"));
    }
  });
}

function check(id, fun) {
  setTimeout(
    function() {
      $.get(
        window.location.origin + '/designauto/checkworkitem?item=' + id,
        function(req, res) {
          console.log('check workitem status:' + req + res);
          if (req !== '') {
            if (req === 'failed') {
              window.alert('Request failed, please try again.');
              back();
            } else {
              fun({ result: req });
            }
          }
          else if (stage === 3) {
            check(id, fun);
          }
      });
    },
    2000
  );
}

var edgeDetector = new EdgeDetector();

function round2(n) {
  return Math.round(n * 100) / 100;
}

function calcDim(val, getWidth) {
  var aspect =
    edgeDetector.imgElement.width /
    edgeDetector.imgElement.height;
  return getWidth ? val * aspect : val / aspect;
}

function setWidth(val) {
  $('#width').val(round2(val));
  $('#height').val(round2(calcDim(val, false)));
}

function setHeight(val) {
  $('#width').val(round2(calcDim(val, true)));
  $('#height').val(round2(val));
}

function setPieces(val) {
  $('#pieces').val(val);
}



$(document).ready(function () {

  // Disable caching of AJAX responses (needed for IE)
  $.ajaxSetup({ cache: false });

  $('#title').tooltip({ placement: window.innerWidth < 681 ? "bottom" : "right"}); 

  $('#width').change(function () { setWidth($(this).val()); } );
  $('#height').change(function () { setHeight($(this).val()); } );

  setStage(0);

  var settings = $('.media-drop').html5Uploader({

    postUrl: '/api/upload',
    imageUrl: 'image',
    maxLength: pixelsWidth,

    // File dropped / selected
    onDropped: function (success) {
      if (!success) {
        $('.errormessages').text(
          'Only jpg, png or gif images are allowed.'
        );
      }
    },

    // Image cropped and scaled
    onProcessed: function (canvas) {
      if (canvas) {

        // Remove possible previously loaded image

        var url = canvas.toDataURL();
        var newImg = document.createElement('img');
        newImg.id = 'image';
        newImg.onload = function () {

          var oldHeight = newImg.height;
          var oldWidth = newImg.width;
          newImg.width = pixelsWidth;
          newImg.height = pixelsWidth * (oldHeight / oldWidth);

          edgeDetector.resetSize();
          edgeDetector.pixelData = edgeDetector.generatePixelData();
          edgeDetector.findEdges(); 
 
        }
        newImg.src = url;

        $('#droppedimage').empty().append(newImg);

        setStage(1);

        // Reset dropbox for reuse

        $('.errormessages').empty();
        $('.media-drop-placeholder > *').show();
        $('.media-drop-placeholder').toggleClass(
          'busyloading', false).css('cursor', 'auto');

      } else {

        window.alert(
          'File not recognized as an image, ' +
          'try again with a different file.'
        );
      }
    },

    // Image uploaded

    onUploaded: function (success, responseText) {
      if (success) {
        uploadedBlob = responseText;
      } else {
        window.alert('Image upload failed: ' + responseText);
      }
    },

    // Progress during upload
    onUploadProgress: function (progress) {
      //window.console && console.log('Upload progress: ' + progress);
    }
  });

});


//to work with data management API

function doworkitem(isdwg){

    // Not ready to move forward if image isn't uploaded
    if (!uploadedBlob)
        return;

    // Create our HTML spinner
    // (from http://fgnass.github.io/spin.js)

    if (spinner) {
        spinner.spin($('#loading')[0]);
    } else {
        var opts = {
            lines: 13, length: 28, width: 14, radius: 42, scale: 1.5,
            corners: 1, color: '#fff', opacity: 0.25, rotate: 0,
            direction: 1, speed: 1, trail: 60, fps: 20, zIndex: 2e9,
            className: 'spinner', top: '50%', left: '50%', shadow: false,
            hwaccel: false, position: 'absolute'
        }
        spinner = new Spinner(opts);
        spinner.spin($('#loading')[0]);
    }

    //prepare local edge json to server.
    var inputWidth = parseFloat($('#width').val());
    var inputHeight = parseFloat($('#height').val());
    var img = $('#image')[0];
    var canvas = buildCanvas(img);
    var outcanvas = buildCanvas(img);

     var Width = parseInt(pixelsWidth),
        Height = Math.round(inputHeight) * Width /inputWidth;

    canvas.width = Width;
    canvas.height = Height;
    outcanvas.width = Width;
    outcanvas.height = Height;

    edgeDetector.init(img, canvas, outcanvas);
    edgeDetector.update(edgeDetector.threshold);
    var newArgs = edgeDetector.generatePoints(Width, Height, {}, true); // Compress by default
    var jsondata = JSON.stringify(newArgs.XPixels);

    var blob = new Blob([jsondata], {type: "application/json"});

    var fd = new FormData();
    fd.append('fname', 'test.json');
    fd.append('data', blob,'test.json');
    $.ajax({
        type: 'POST',
        url: 'api/upload',
        data: fd,
        processData: false,
        contentType: false
    }).done(function(data) {
        console.log(data);

        //if uploading succeeded
        //get hub and project of a selected node
        var hubId = '';
        var projid= '';
        var st = '';
        var parent = '';

        //check if a DWG is selected. and get out its parent and hub (maybe there is not elegant way...)
        if(isdwg){
            if(selectedNode.node.parents.length > 2){
                parent = selectedNode.node.parents[selectedNode.node.parents.length - 3];
                var params = parent.split('/');
                hubId = params[params.length - 3];
                projid = params[params.length - 1];
                st =   selectedNode.storage;
            }
            else{
                alert('The selected node is not an item or version!');
                return;
            }
        }

        //keep most arguments of jigsawify. only add two arguments
        var args = {
            Pieces: $('#pieces').val(),
            Width: Width,
            Height:Height,
            XRes:newArgs.XRes,
            YRes:newArgs.YRes,
            units: $('#units').val(),
            res: pixelsWidth,
            threshold: $('#threshold').val(),
            upload: uploadedBlob,
            selectedNodeSt:st,
            selectedNodeParent:parent
        };

        console.log(args);

        process(args);
    });
}

function process(args) {
    $.get(
        window.location.origin + '/designauto/submitworkitem?' + $.param(args),
        function(req, res) {
            if (res === 'success') {
                if (req !== '') {
                    check(req, function(res2) {
                        if (res2.result) {

                            $('#jigimage').attr('src', res2.result + '/jigsaw.png');

                            setLinkAndSizeTooltip('#dwg', res2.result + '/jigsaw.dwg');
                            setLinkAndSizeTooltip('#dxf', res2.result + '/jigsaw.dxf');

                            //prepare the button to send result drawing to Dropbox
                            var dropboxbutton = $('#sendtodropbox');
                            dropboxbutton.attr('onclick', 'prepareDWGToDropbox();');

                            //refresh the tree as the result drawing is also uploaded to A360
                            //probably the uploading has not been completed
                            //$('#myfiles').jstree('refresh');

                            forward();
                        }
                    });
                }
            }
        }
    );
}

// upload result drawing to dropbox
function sendDWGToDropbox(st,filename){
    var token = makeSyncRequest('/dropbox/getDropboxToken');
    if(token == '') {
        $.ajax({
            url: '/dropbox/dropbox',
            type: 'POST',
            contentType: 'application/json',
            dataType: 'json',
            data: JSON.stringify({}),
            success: function (url) {
                // iframes are not allowed
                PopupCenter(url, "Dropbox Login", 800, 500);
            },
            error: function () {

            }
        });
    }
    else {
        $.ajax({
            url: '/dropbox/sentToDropbox',
            type: 'GET',
            data: {st: st, filename: filename},
            success: function (res) {
                console.log(res);
                BootstrapDialog.alert('Upload to Dropbox Succeeded! Check your box!');

            }
        });
    }
}

function prepareDWGToDropbox(){

    $.ajax({
        url: '/dmapi/checkUploadToA360Status',
        type: 'GET',
        data: JSON.stringify({}),
        success: function (res) {
            var jsonObj = JSON.parse(res);
            if(jsonObj.A360isReady){
                //refresh A360 tree
                $('#myfiles').jstree('refresh');

                //result drawing of jigsaw has been uploaded to A360. Then proceed to the next step to upload it to Dropbox
                sendDWGToDropbox(jsonObj.A360FileSt,jsonObj.A360Filename);
            }
            else {
                BootstrapDialog.alert('The result jigsaw.dwg has not been uploaded to A360. Please try a moment later!');
            }
        }
    });
}