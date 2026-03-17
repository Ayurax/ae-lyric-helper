/*
Lyric Helper Panel (Dockable)
AE 2021 Compatible
*/

(function (thisObj) {

    function buildUI(thisObj) {

        var win = (thisObj instanceof Panel)
            ? thisObj
            : new Window("palette", "Lyric Helper", undefined, { resizeable: true });

        win.orientation = "column";
        win.alignChildren = ["fill", "top"];
        win.spacing = 6;
        win.margins = 10;

        // ----------------------------
        // UI
        // ----------------------------

        var lyricsBox = win.add("edittext", undefined, "", {
            multiline: true,
            scrolling: true
        });
        lyricsBox.preferredSize.height = 180;

        // Start Line Control
        var startGroup = win.add("group");
        startGroup.orientation = "row";
        startGroup.alignChildren = ["left", "center"];

        startGroup.add("statictext", undefined, "Start Line:");
        var startLineInput = startGroup.add("edittext", undefined, "1");
        startLineInput.characters = 4;

        // Duration Control
        var durationGroup = win.add("group");
        durationGroup.orientation = "row";
        durationGroup.alignChildren = ["left", "center"];

        durationGroup.add("statictext", undefined, "Duration (sec):");
        var durationInput = durationGroup.add("edittext", undefined, "1.5");
        durationInput.characters = 6;

        // Buttons
        var btnGroup = win.add("group");
        btnGroup.orientation = "row";
        btnGroup.alignChildren = ["fill", "center"];
        btnGroup.spacing = 6;

        var prevBtn  = btnGroup.add("button", undefined, "Previous");
        var nextBtn  = btnGroup.add("button", undefined, "Next Line");
        var nextNewBtn = btnGroup.add("button", undefined, "Next + New Text");
        var resetBtn = btnGroup.add("button", undefined, "Reset");

        // ----------------------------
        // Image Viewer
        // ----------------------------

        var imageViewer = createImageViewerUI(win);

        // ----------------------------
        // State
        // ----------------------------

        var lyricLines = [];
        var currentIndex = 0;
        var lyricsUpdateInProgress = false;

        // ----------------------------
        // Helpers
        // ----------------------------

        function stripLineNumbers(text) {
            var lines = text.split(/\r\n|\r|\n/);
            var stripped = [];
            for (var i = 0; i < lines.length; i++) {
                var line = lines[i];
                var match = line.match(/^(\d+)\.\s+(.*)/);
                if (match) {
                    stripped.push(match[2]);
                } else {
                    stripped.push(line);
                }
            }
            return stripped.join("\n");
        }

        function formatWithLineNumbers(text) {
            var lines = text.split(/\r\n|\r|\n/);
            var formatted = [];
            var lineNum = 1;
            
            for (var i = 0; i < lines.length; i++) {
                var line = lines[i].replace(/^\s+|\s+$/g, "");
                if (line !== "") {
                    formatted.push(lineNum + ". " + line);
                    lineNum++;
                } else {
                    formatted.push("");
                }
            }
            return formatted.join("\n");
        }

        function onLyricsBoxChange() {
            if (lyricsUpdateInProgress) return;
            
            lyricsUpdateInProgress = true;
            
            var currentText = lyricsBox.text;
            var stripped = stripLineNumbers(currentText);
            var formatted = formatWithLineNumbers(stripped);
            
            lyricsBox.onChange = null;
            lyricsBox.text = formatted;
            lyricsBox.onChange = onLyricsBoxChange;
            
            lyricsUpdateInProgress = false;
        }

        function parseLyrics() {
            var raw = lyricsBox.text;
            if (!raw) return false;

            raw = stripLineNumbers(raw);

            var lines = raw.split(/\r\n|\r|\n/);
            lyricLines = [];

            for (var i = 0; i < lines.length; i++) {
                var line = lines[i].replace(/^\s+|\s+$/g, "");
                if (line !== "") lyricLines.push(line);
            }

            return lyricLines.length > 0;
        }

        function clampIndex() {
            if (currentIndex < 0) currentIndex = 0;
            if (currentIndex >= lyricLines.length)
                currentIndex = lyricLines.length - 1;
        }

        function getDuration() {
            var v = parseFloat(durationInput.text);
            if (isNaN(v) || v <= 0) v = 1.5;
            return v;
        }

        function updateDisplayFromIndex() {
            startLineInput.text = currentIndex + 1;
        }

        function getSelectedTextLayers(comp) {
            var textLayers = [];
            for (var i = 0; i < comp.selectedLayers.length; i++) {
                var layer = comp.selectedLayers[i];
                if (layer.property("Source Text")) {
                    textLayers.push(layer);
                }
            }
            return textLayers;
        }

        function getComp() {
            var c = app.project.activeItem;
            if (!(c && c instanceof CompItem)) {
                alert("No active composition.");
                return null;
            }
            return c;
        }

        function getSelectedTextLayer(comp) {
            if (comp.selectedLayers.length !== 1) return null;
            var layer = comp.selectedLayers[0];
            if (!layer.property("Source Text")) return null;
            return layer;
        }

        function applyLineToLayer(layer, index) {
            var textProp = layer.property("Source Text");
            var textDoc = textProp.value;
            textDoc.text = lyricLines[index];
            textProp.setValue(textDoc);
        }

        // ----------------------------
        // Input Handlers
        // ----------------------------

        lyricsBox.onChange = onLyricsBoxChange;

        startLineInput.onChange = function () {
            var v = parseInt(this.text, 10);
            if (isNaN(v)) v = 1;
            currentIndex = v - 1;
            clampIndex();
            updateDisplayFromIndex();
        };

        // ----------------------------
        // Button Logic
        // ----------------------------

        nextBtn.onClick = function () {

            if (!parseLyrics()) {
                alert("Lyrics box is empty.");
                return;
            }

            var comp = getComp();
            if (!comp) return;

            var layer = getSelectedTextLayer(comp);
            if (!layer) {
                alert("Select a single Text Layer.");
                return;
            }

            if (currentIndex >= lyricLines.length) return;

            app.beginUndoGroup("Lyric Helper - Next Line");

            applyLineToLayer(layer, currentIndex);

            currentIndex++;
            clampIndex();
            updateDisplayFromIndex();

            app.endUndoGroup();
        };

        prevBtn.onClick = function () {

            if (!parseLyrics()) return;

            var comp = getComp();
            if (!comp) return;

            var layer = getSelectedTextLayer(comp);
            if (!layer) {
                alert("Select a single Text Layer.");
                return;
            }

            currentIndex--;
            clampIndex();

            app.beginUndoGroup("Lyric Helper - Previous Line");

            applyLineToLayer(layer, currentIndex);
            updateDisplayFromIndex();

            app.endUndoGroup();
        };

        resetBtn.onClick = function () {
            currentIndex = 0;
            updateDisplayFromIndex();
        };

        nextNewBtn.onClick = function () {

            if (!parseLyrics()) {
                alert("Lyrics box is empty.");
                return;
            }

            var comp = getComp();
            if (!comp) return;

            var duration = getDuration();
            var selectedTextLayers = getSelectedTextLayers(comp);

            if (selectedTextLayers.length === 0) {
                // Single layer mode: create one new text layer
                if (currentIndex >= lyricLines.length) return;

                app.beginUndoGroup("Lyric Helper - Next + New Text");

                var newLayer = comp.layers.addText(lyricLines[currentIndex]);
                newLayer.startTime = comp.time;
                newLayer.outPoint = comp.time + duration;

                if (comp.selectedLayers.length > 0) {
                    newLayer.moveBefore(comp.selectedLayers[0]);
                }

                currentIndex++;
                clampIndex();
                updateDisplayFromIndex();

                comp.time += duration;

                app.endUndoGroup();
            } else {
                // Multi-layer mode: apply lyrics to selected text layers in order
                if (currentIndex + selectedTextLayers.length > lyricLines.length) {
                    alert("Not enough lyrics remaining for all selected layers.");
                    return;
                }

                app.beginUndoGroup("Lyric Helper - Fill Multiple Layers");

                for (var i = 0; i < selectedTextLayers.length; i++) {
                    if (currentIndex < lyricLines.length) {
                        applyLineToLayer(selectedTextLayers[i], currentIndex);
                        currentIndex++;
                    }
                }

                clampIndex();
                updateDisplayFromIndex();

                app.endUndoGroup();
            }
        };

        // Resize handling
        win.onResizing = win.onResize = function () {
            this.layout.resize();
        };
        win.layout.layout(true);
        win.layout.resize();

        return win;
    }

    var myPal = buildUI(thisObj);

    if (myPal instanceof Window) {
        myPal.center();
        myPal.show();
    }

})(this);

function createImageViewerUI(parent) {
    var viewer = parent.add("group");
    viewer.orientation = "column";
    viewer.alignChildren = ["fill", "top"];
    viewer.spacing = 8;
    viewer.margins = [5, 5, 5, 5];

    // Separator
    viewer.add("statictext", undefined, "--- IMAGE VIEWER ---");

    // Button row - allow expansion
    var btnRow = viewer.add("group");
    btnRow.orientation = "horizontal";
    btnRow.alignChildren = ["left", "center"];
    btnRow.spacing = 4;
    btnRow.alignment = ["fill", "top"];

    var loadBtn = btnRow.add("button", undefined, "Load Image");
    var resetBtn = btnRow.add("button", undefined, "Reset");
    var fitBtn = btnRow.add("button", undefined, "Fit");

    // Zoom row
    var zoomRow = viewer.add("group");
    zoomRow.orientation = "horizontal";
    zoomRow.alignChildren = ["left", "center"];
    zoomRow.spacing = 6;
    zoomRow.alignment = ["fill", "top"];

    zoomRow.add("statictext", undefined, "Zoom:");
    var zoomSlider = zoomRow.add("slider", undefined, 1.0, 0.1, 3.0);
    zoomSlider.size = [120, 20];

    var zoomDisplay = zoomRow.add("statictext", undefined, "1.0x");
    zoomDisplay.characters = 6;

    // Opacity row
    var opacRow = viewer.add("group");
    opacRow.orientation = "horizontal";
    opacRow.alignChildren = ["left", "center"];
    opacRow.spacing = 6;
    opacRow.alignment = ["fill", "top"];

    opacRow.add("statictext", undefined, "Opacity:");
    var opacitySlider = opacRow.add("slider", undefined, 1.0, 0.1, 1.0);
    opacitySlider.size = [120, 20];

    var opacityDisplay = opacRow.add("statictext", undefined, "100%");
    opacityDisplay.characters = 6;

    // Image display container
    var container = viewer.add("group");
    container.size = [400, 280];
    container.orientation = "column";
    container.alignment = ["fill", "fill"];
    container.alignChildren = ["left", "top"];
    container.margins = 2;

    // State management
    var state = {
        img: null,
        origWidth: 0,
        origHeight: 0,
        zoom: 1.0,
        opacity: 1.0,
        offsetX: 0,
        offsetY: 0,
        isDragging: false,
        lastMouseX: 0,
        lastMouseY: 0
    };
    
    function loadImage() {
        var file = File.openDialog("Select Image", "Image files:*.png,*.jpg,*.jpeg;All files:*.*");
        if (!file) return;

        if (state.img) {
            container.remove(state.img);
            state.img = null;
        }

        state.img = container.add("image", undefined, file);

        if (!state.img) {
            alert("Failed to load image");
            return;
        }

        // Store original dimensions
        state.origWidth = state.img.size[0];
        state.origHeight = state.img.size[1];

        // Fallback if dimensions are invalid
        if (state.origWidth <= 0 || state.origHeight <= 0) {
            state.origWidth = 200;
            state.origHeight = 200;
        }

        // Set initial size
        state.img.size = [state.origWidth, state.origHeight];

        // Reset state
        state.zoom = 1.0;
        state.opacity = 1.0;
        state.offsetX = 0;
        state.offsetY = 0;

        // Update UI
        zoomSlider.value = 1.0;
        zoomDisplay.text = "1.0x";
        opacitySlider.value = 1.0;
        opacityDisplay.text = "100%";

        // Layout refresh
        parent.layout.layout(true);

        // Enable dragging
        setupDragging();
    }

    function updateImageDisplay() {
        if (state.img) {
            var newWidth = Math.round(state.origWidth * state.zoom);
            var newHeight = Math.round(state.origHeight * state.zoom);

            state.img.size = [newWidth, newHeight];
            state.img.location = [state.offsetX, state.offsetY];

            try {
                state.img.graphics.opacity = state.opacity;
            } catch (e) {
                // Opacity may not be supported in all SC versions
            }
        }
    }
    
    function applyZoom(zoomLevel) {
        state.zoom = Math.max(0.1, Math.min(3.0, zoomLevel));
        zoomSlider.value = state.zoom;
        zoomDisplay.text = state.zoom.toFixed(2) + "x";
        updateImageDisplay();
    }
    
    function applyOpacity(opacityLevel) {
        state.opacity = Math.max(0.1, Math.min(1.0, opacityLevel));
        opacitySlider.value = state.opacity;
        opacityDisplay.text = Math.round(state.opacity * 100) + "%";
        updateImageDisplay();
    }
    
    function fitToPanel() {
        if (!state.img) return;

        var containerWidth = container.size[0];
        var containerHeight = container.size[1];

        var scaleX = containerWidth / state.origWidth;
        var scaleY = containerHeight / state.origHeight;
        var fitZoom = Math.min(scaleX, scaleY) * 0.85;

        state.zoom = Math.max(0.1, Math.min(3.0, fitZoom));
        zoomSlider.value = state.zoom;
        zoomDisplay.text = state.zoom.toFixed(2) + "x";

        var newImgWidth = state.origWidth * state.zoom;
        var newImgHeight = state.origHeight * state.zoom;
        state.offsetX = (containerWidth - newImgWidth) / 2;
        state.offsetY = (containerHeight - newImgHeight) / 2;
        updateImageDisplay();
    }
    
    function resetView() {
        state.zoom = 1.0;
        state.opacity = 1.0;
        state.offsetX = 0;
        state.offsetY = 0;
        zoomSlider.value = 1.0;
        zoomDisplay.text = "1.0x";
        opacitySlider.value = 1.0;
        opacityDisplay.text = "100%";
        updateImageDisplay();
    }
    
    function setupDragging() {
        if (!state.img) return;

        state.img.addEventListener("mousedown", function(e) {
            state.isDragging = true;
            state.lastMouseX = e.screenX;
            state.lastMouseY = e.screenY;
        });

        state.img.addEventListener("mousemove", function(e) {
            if (state.isDragging) {
                var dx = e.screenX - state.lastMouseX;
                var dy = e.screenY - state.lastMouseY;

                state.offsetX += dx;
                state.offsetY += dy;

                // Clamp to boundaries
                var containerWidth = container.size[0];
                var containerHeight = container.size[1];
                var imgWidth = state.origWidth * state.zoom;
                var imgHeight = state.origHeight * state.zoom;

                state.offsetX = Math.max(-imgWidth + 20, Math.min(containerWidth - 20, state.offsetX));
                state.offsetY = Math.max(-imgHeight + 20, Math.min(containerHeight - 20, state.offsetY));

                state.lastMouseX = e.screenX;
                state.lastMouseY = e.screenY;

                state.img.location = [state.offsetX, state.offsetY];
            }
        });

        state.img.addEventListener("mouseup", function(e) {
            state.isDragging = false;
        });
    }
    
    loadBtn.onClick = function() {
        loadImage();
    };
    
    resetBtn.onClick = function() {
        resetView();
    };
    
    fitBtn.onClick = function() {
        fitToPanel();
    };
    
    zoomSlider.onChanging = function() {
        applyZoom(this.value);
    };
    
    opacitySlider.onChanging = function() {
        applyOpacity(this.value);
    };
    
    return viewer;
}
