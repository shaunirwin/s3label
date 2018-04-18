
var el = document.getElementById('canvas-fg');
var el2 = document.getElementById('canvas-bg');
var ctx = el.getContext('2d');
var ctx_bg = el2.getContext('2d');
var stroke_thickness_slider = document.getElementById("stroke_thickness_slider");
var opacity_slider = document.getElementById("opacity_slider");

var isDrawing;
var polygons = [];
var currentPath = [];
var polygons_redo = [];
var polygons_undo = [];
var colours = {
    'individual_rock': [255, 0, 0],
    'belt': [0, 255, 0],
    'other': [0, 0, 255]
};
var padX = padY = 80;
var use_stroke = true;
var opacity = opacity_slider.value / 100.;
var active_label = 'individual_rock';
var active_tool = document.querySelector('input[name="tool"]:checked').value;
var active_mode = document.querySelector('input[name="mode"]:checked').value;
var active_overlap_mode = document.querySelector('input[name="overlap_mode"]:checked').value;
var previous_tool = undefined;
var previous_mode = undefined;

ctx.lineWidth = stroke_thickness_slider.value;
ctx.fillStyle = setColour(colours[active_label], opacity);

window.addEventListener('keydown', this.keyHandler, false);
window.addEventListener('keyup', this.keyHandlerUp, false);


function keyHandler(e) {
    if (e.ctrlKey && e.code === "KeyZ") {
        console.log("Undo");
        undo();
        drawAllPolygons(ctx, polygons);
    }
    else if (e.ctrlKey && e.code === "KeyY") {
        console.log("Redo");
        redo();
        drawAllPolygons(ctx, polygons);
    }
    else if (e.code === "KeyA") {
        fetchAndDisplayImage('http://127.0.0.1:5000/image_labeler/api/v1.0/input_images/1');
        clearCanvas();
    }
    else if (e.code === "KeyB") {
        fetchAndDisplayImage('http://127.0.0.1:5000/image_labeler/api/v1.0/input_images/2');
        clearCanvas();
    }
    else if (e.code === "KeyC") {
        fetchAndDisplayImage('http://127.0.0.1:5000/image_labeler/api/v1.0/input_images/3');
        clearCanvas();
    }
    else if (e.code === 'Delete') {
        console.log('num orig polys:', polygons.length, 'num redo polys:', polygons_redo.length)
        polygons_undo.push(...polygons.filter(poly => poly.selected));
        polygons = polygons.filter(poly => !poly.selected);
        console.log('num final polys:', polygons.length, 'num redo polys:', polygons_redo.length)
        drawAllPolygons(ctx, polygons);
    }
    else if (e.code === 'Escape') {
        for (let i = 0; i < polygons.length; i++) {
            polygons[i].selected = false;
        }
        drawAllPolygons(ctx, polygons);
    }
    else if (e.code === 'Space') {
        if (previous_tool === undefined && !isDrawing) {
            previous_tool = active_tool;
            active_tool = 'select';
            document.getElementById("tools_form").tool.value = active_tool;
            console.log('temp selecting (down)')
        }
    }
    else if (e.code.startsWith('Shift')) {
        if (previous_mode === undefined && !isDrawing) {
            previous_mode = active_mode;
            active_mode = 'append';
            document.getElementById("mode_form").mode.value = active_mode;
            console.log('temp mode append (down)')
        }
    }
    else if (e.code.startsWith('Alt')) {
        if (previous_mode === undefined && !isDrawing) {
            previous_mode = active_mode;
            active_mode = 'erase';
            document.getElementById("mode_form").mode.value = active_mode;
            console.log('temp mode erase (down)')
        }
    }
    else {
        console.log(e.code);
    }

    e.stopPropagation();
    e.preventDefault();
}

function keyHandlerUp(e) {
    if (e.code === 'Space') {
        if (previous_tool) {
            active_tool = previous_tool;
            previous_tool = undefined;
            document.getElementById("tools_form").tool.value = active_tool;
            console.log('temp selecting (up)')
        }
    }
    else if (e.code.startsWith('Shift')) {
        if (previous_mode) {
            active_mode = previous_mode;
            previous_mode = undefined;
            document.getElementById("mode_form").mode.value = active_mode;
            console.log('temp mode append (up)')
        }
    }
    else if (e.code.startsWith('Alt')) {
        if (previous_mode) {
            active_mode = previous_mode;
            previous_mode = undefined;
            document.getElementById("mode_form").mode.value = active_mode;
            console.log('temp mode erase (up)')
        }
    }
    else {
        console.log(e.code);
    }

    e.stopPropagation();
    e.preventDefault();
}

function getMousePos(canvas, event) {
    // https://stackoverflow.com/questions/17130395/real-mouse-position-in-canvas
    var rect = canvas.getBoundingClientRect();
    return {
        x: event.clientX - rect.left,
        y: event.clientY - rect.top
    };
}

el.onmousedown = function (e) {
    coords = getMousePos(ctx.canvas, e);

    if (coords.x == undefined || coords.y == undefined) {
        console.log("coords undef:" + coords);
    }

    if (active_tool == 'freehand') {
        polygons_redo = [];
        isDrawing = true;
        ctx.lineJoin = ctx.lineCap = 'round';
        ctx.beginPath();
        ctx.moveTo(coords.x, coords.y);
        currentPath.push([coords.x, coords.y]);
    }
    if (active_tool == 'polygon') {
        if (!isDrawing) {
            polygons_redo = [];
            isDrawing = true;
            ctx.lineJoin = ctx.lineCap = 'round';
            ctx.beginPath();
            ctx.moveTo(coords.x, coords.y);
            currentPath.push([coords.x, coords.y]);
        }
        else {
            var lastPoint = currentPath[currentPath.length - 1];
            if (Math.abs(coords.x - lastPoint[0]) < 2 && Math.abs(coords.y - lastPoint[1]) < 2) {
                // close and finish drawing path if same point clicked twice
                currentPath.push(currentPath[0]);
                processPolygon();
            }
            else {
                // add point to current path
                ctx.lineTo(coords.x, coords.y);
                ctx.stroke();
                currentPath.push([coords.x, coords.y]);
            }
        }
    }
    else if (active_tool == 'select') {
        // check which polygons the point lies within

        for (var jjj = 0; jjj < polygons.length; jjj++) {
            currentPolygon = polygons[jjj];
            var selected = false;

            for (var iii = 0; iii < currentPolygon.polygon.regions.length; iii++) {
                xs = currentPolygon.polygon.regions[iii].map(p => p[0]);
                ys = currentPolygon.polygon.regions[iii].map(p => p[1]);

                if (isPointInPolygon(coords.x, coords.y, xs, ys)) {
                    selected = true;
                }
            }

            currentPolygon.selected = selected;
        }

        drawAllPolygons(ctx, polygons);
    }
};
el.onmousemove = function (e) {
    if (active_tool == 'freehand') {
        if (isDrawing) {
            coords = getMousePos(ctx.canvas, e);
            if (coords.x == undefined || coords.y == undefined) {
                console.log("coords undef:" + coords);
            }
            ctx.lineTo(coords.x, coords.y);
            ctx.stroke();
            currentPath.push([coords.x, coords.y]);
        }
    }
};
el.onmouseup = function () {
    if (active_tool == 'freehand' && isDrawing) {
        processPolygon();
    }
};

function processPolygon() {
    isDrawing = false;

    ctx.closePath();
    if (use_stroke) {
        ctx.stroke();
    }
    ctx.fill();

    // do not add polygon if it has zero area
    if (!isPolygonLargeEnough(currentPath)) {
        console.log('polygon too small! discarding it')

        currentPath = [];
        drawAllPolygons(ctx, polygons);
        return;
    }

    if (active_mode == 'new') {
        // deselect all previous polygons

        for (let i = 0; i < polygons.length; i++) {
            polygons[i].selected = false;
        }
    }

    let currentPolygon = convertPathToPolygon(currentPath);

    if (active_mode == 'new' && active_overlap_mode == 'overlap') {
        // new polygon

        if (currentPolygon.regions.length > 0) {
            polygons.push({ 'polygon': currentPolygon, 'label': active_label, 'type': active_tool, 'selected': true });
        }
        console.log('new overlap poly');
    }
    else if (active_mode == 'new' && active_overlap_mode == 'no-overlap') {
        // subtract all previous polygons from this new path
        for (var i = 0; i < polygons.length; i++) {
            let poly = polygons[i].polygon;
            currentPolygon = PolyBool.difference(currentPolygon, poly);
        }

        if (currentPolygon.regions.length > 0) {
            polygons.push({ 'polygon': currentPolygon, 'label': active_label, 'type': active_tool, 'selected': true });
        }
        console.log('new no overlap poly');
    }
    else if (active_mode == 'append' && active_overlap_mode == 'overlap') {
        // if multiple polygons selected, deselect the least recently created one
        var polyIndex = getSelectedPolygonIndex(polygons);

        if (polyIndex >= 0) {
            // append to last polygon
            let poly = polygons[polyIndex].polygon;
            currentPolygon = PolyBool.union(currentPolygon, poly);

            polygons[polyIndex].polygon = currentPolygon;
        }
        console.log('append overlap poly');
    }
    else if (active_mode == 'append' && active_overlap_mode == 'no-overlap') {
        // subtract all previous polygons from this new path
        for (var i = 0; i < polygons.length; i++) {
            if (!polygons[i].selected) {
                currentPolygon = PolyBool.difference(currentPolygon, polygons[i].polygon);
            }
        }

        // if multiple polygons selected, deselect the least recently created one
        var polyIndex = getSelectedPolygonIndex(polygons);

        if (polyIndex >= 0) {
            // append to last polygon (TODO: should append to selected polygons)
            if (polygons.length > 0) {
                let poly = polygons[polyIndex].polygon;
                currentPolygon = PolyBool.union(currentPolygon, poly);
            }

            if (currentPolygon.regions.length > 0) {
                polygons[polyIndex].polygon = currentPolygon;
            }
        }
        console.log('append no overlap poly');
    }
    else if (active_mode == 'erase') {
        // subtract from selected polygon(s)

        for (var i = 0; i < polygons.length; i++) {
            if (polygons[i].selected) {
                newPolygon = PolyBool.difference(polygons[i].polygon, currentPolygon);

                if (newPolygon.regions.length > 0) {
                    polygons[i].polygon = newPolygon;
                }
                console.log('erase poly');
            }
        }
    }
    else {
        console.error('Undefined tool mode:', active_mode, active_overlap_mode);
    }

    currentPath = [];

    drawAllPolygons(ctx, polygons);
}

function undo() {
    if (polygons_undo.length > 0) {
        polygons.push(polygons_undo.pop());
    }
    else if (polygons.length > 0) {
        polygons_redo.push(polygons.pop());
    }
}

function redo() {
    if (polygons_redo.length > 0) {
        polygons.push(polygons_redo.pop());
    }
}

function drawAllPolygons(context, polygon_list) {
    context.clearRect(0, 0, context.canvas.width, context.canvas.height);

    for (let i = 0; i < polygon_list.length; i++) {
        drawPolygon(context, polygon_list[i]);
    }
}

function drawPolygon(context, polygon) {
    setColour(colours[polygon.label], opacity);
    let paths_to_draw = convertPolygonToPaths(polygon.polygon);

    if (polygon.selected) {
        // draw selected polygon

        var currentStrokeStyle = context.strokeStyle;
        context.strokeStyle = "#FF0000";
        context.setLineDash([4, 4]);

        for (let j = 0; j < paths_to_draw.length; j++) {
            drawPath(context, paths_to_draw[j]);
        }

        context.strokeStyle = currentStrokeStyle;
        context.setLineDash([]);
    }
    else {
        // draw unselected polygon

        for (let j = 0; j < paths_to_draw.length; j++) {
            drawPath(context, paths_to_draw[j]);
        }
    }
}

function drawPath(context, path) {

    let w = context.canvas.width;
    let h = context.canvas.height;

    context.beginPath();
    context.moveTo(Math.max(padX, Math.min(path[0][0], w - padX)),
        Math.max(padY, Math.min(path[0][1], h - padY)));

    for (let i = 1; i < path.length; i++) {
        context.lineTo(Math.max(padX, Math.min(path[i][0], w - padX)),
            Math.max(padY, Math.min(path[i][1], h - padY)));
    }

    context.closePath();
    if (use_stroke) {
        context.stroke();
    }
    context.fill();
}

// detect tool and colour changes

var toolRadioButtons = document.getElementsByName("tool");
var toolModeRadioButtons = document.getElementsByName("mode");
var overlapModeRadioButtons = document.getElementsByName("overlap_mode");
var semanticLabelRadioButtons = document.getElementsByName("semantic_label");

for (var i = 0; toolRadioButtons[i]; i++)
    toolRadioButtons[i].onclick = setActiveTool;

for (var i = 0; toolModeRadioButtons[i]; i++)
    toolModeRadioButtons[i].onclick = setActiveToolMode;

for (var i = 0; overlapModeRadioButtons[i]; i++)
    overlapModeRadioButtons[i].onclick = setActiveOverlapMode;

for (var i = 0; semanticLabelRadioButtons[i]; i++)
    semanticLabelRadioButtons[i].onclick = setActiveLabel;

function setActiveTool() {
    active_tool = document.querySelector('input[name="tool"]:checked').value;
    console.log("active_tool: " + active_tool);
}

function setActiveToolMode() {
    active_mode = document.querySelector('input[name="mode"]:checked').value;
    console.log("active_mode: " + active_mode);
}

function setActiveOverlapMode() {
    active_overlap_mode = document.querySelector('input[name="overlap_mode"]:checked').value;
    console.log("active_overlap_mode: " + active_overlap_mode);
}

function formatColour(rgb, alpha) {
    return 'rgba(' + rgb[0] + ',' + rgb[1] + ',' + rgb[2] + ',' + alpha + ')';
}

function setColour(rgb, alpha) {
    ctx.fillStyle = formatColour(rgb, alpha);
}

function setActiveLabel() {
    active_label = label_class = document.querySelector('input[name="semantic_label"]:checked').value;
    setColour(colours[active_label], opacity);
    console.log("active_label: " + active_label);
}

// detect stroke thickness and opacity slider changes

stroke_thickness_slider.oninput = function () {

    if (this.value > 0) {
        ctx.lineWidth = this.value;
        use_stroke = true;
    }
    else {
        ctx.lineWidth = 1;
        use_stroke = false;
    }

    drawAllPolygons(ctx, polygons);
}

opacity_slider.oninput = function () {
    opacity = this.value / 100.;

    drawAllPolygons(ctx, polygons);
}

// clear canvas

function clearCanvas() {
    ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height);
    polygons = [];
    polygons_redo = [];
}