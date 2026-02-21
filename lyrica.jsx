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
