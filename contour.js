(function() {
    'use strict';
    var init = function (unit, uses) {

        var EPS = 1E-8,
            EPS2 = 1E-6,
            EPS3 = 1E-3,
            PI = Math.PI,
            INF = 2000000000,
            INTERIOR = 0, //side of line
            EXTERIOR = 1,
            SEGMENT = 0, // consts for types, sizes and convexities of arcs
            ARC = 1,
            CIRCLE = 2,
            TRASH = 3,
            CONCAVE = 0,
            CONVEX = 1,
            SMALL = 0,
            BIG = 1,
            lineName,
            K = 20,
            RADIUS,
            SIDE;

        unit.Contour = (function () {
            function Contour() {
                var _this = this,
                    lineSide = 1, /// 1 if new line must be on the RIGHT side of first line. 0 if it must be on the LEFT side
                    lineRadius = 0.4; /// distance between given line and new line

                this.fileFor = 'roomatic';
            }

            Contour.prototype.makeNewContourParameters = function (path, inputScript, lineSide, lineRadius) {
                var last = new Point, firstPoint = new Point, i, j, tmp2, temp, temp2, ok, conv;
                var input = inputScript;
                var tmp = Contour.prototype.parseFirstInputLine(input[0]);

                RADIUS = lineRadius + EPS2;
                SIDE = lineSide;

                firstPoint.x = last.x = tmp[0];
                firstPoint.y = last.y = tmp[1];
                var figureQueue = []; // Given line

                for (i = 1; (i < input.length) && (!this.lastLine(input[i])); i++) { // Forming given line. Making figures from it
                    var cur = this.parseElementLine(input[i], last);
                    if (cur[0] === TRASH)
                        continue;
                    figureQueue.length++;
                    var current = new Point(Number(cur[1]), Number(cur[2]));
                    if (Number(cur[0]) === SEGMENT) {
                        figureQueue[figureQueue.length - 1] = new FigureSegment(last, current);
                    }
                    else if (Number(cur[0]) === ARC) {
                        var centre = new Point(Number(cur[3]), Number(cur[4]));
                        var wise = Number(cur[5]);
                        if (!wise) {
                            if (this.crossProduct(this.minusPoint(last, centre), this.minusPoint(current, centre)) < 0)
                                figureQueue[figureQueue.length - 1] = new FigureArc(last, current,
                                    this.pointDistance(current, centre), CONCAVE, SMALL, centre);
                            else
                                figureQueue[figureQueue.length - 1] = new FigureArc(last, current,
                                    this.pointDistance(current, centre), CONCAVE, BIG, centre);
                        }
                        else {
                            if (this.crossProduct(this.minusPoint(last, centre), this.minusPoint(current, centre)) < 0)
                                figureQueue[figureQueue.length - 1] = new FigureArc(current, last,
                                    this.pointDistance(current, centre), CONVEX, BIG, centre);
                            else
                                figureQueue[figureQueue.length - 1] = new FigureArc(current, last,
                                    this.pointDistance(current, centre), CONVEX, SMALL, centre);
                        }
                    }
                    last = current;
                }

                if (this.lastLine(input[input.length - 1])) { // ClosePolyline(); Close if points are different
                    figureQueue.length++;
                    figureQueue[figureQueue.length - 1] = new FigureSegment(last, firstPoint);
                }

                if (figureQueue.length == 1 && figureQueue[0].typ === SEGMENT) { // One segment case
                    var t = Contour.prototype.movedOrthogonalySegment(figureQueue[0]);
                    answer = [];
                    answer.push(t);
                    return answer;
                }
                if (figureQueue.length == 2 && figureQueue[0].typ === ARC && figureQueue[1].typ === ARC) { // Two arcs case
                    answer = [];
                    answer.push(Contour.prototype.narrowedArc(figureQueue[0]));
                    answer.push(Contour.prototype.narrowedArc(figureQueue[1]));
                    return answer;
                }

                var newFigureQueue = [];  // Making new figures - moved segments and changed arcs
                for (i = 0; i < figureQueue.length; i++) {
                    newFigureQueue.length++;
                    if (figureQueue[i].typ === SEGMENT)
                        newFigureQueue[newFigureQueue.length - 1] = this.movedOrthogonalySegment(
                            figureQueue[i]);
                    else
                        newFigureQueue[newFigureQueue.length - 1] = this.narrowedArc(figureQueue[i]);
                }

                var allFigures = []; // Changed arcs, moved segments, circles


                if (Math.abs(path.curves[0].getPoint(0).x - path.curves[path.curves.length - 1].getPoint(1).x) > EPS || // Adding circle if polyline is not closed
                    Math.abs(path.curves[0].getPoint(0).y - path.curves[path.curves.length - 1].getPoint(1).y) > EPS) {
                    var firstCircleCentre = new Point(figureQueue[0].first.x, figureQueue[0].first.y);
                    if (figureQueue[0].typ === ARC && figureQueue[0].convexity === CONVEX) { // Arcs with .convexity == CONVEX have swapped first and second points. (2nd - is the beggining)
                        firstCircleCentre.x = figureQueue[0].second.x;
                        firstCircleCentre.y = figureQueue[0].second.y;
                    }
                    var firstCircle = new FigureCircle(firstCircleCentre, RADIUS); // Adding circle to the first point
                    allFigures.push(firstCircle);
                }

                for (i = 0; i < newFigureQueue.length; i++) { // Adding circles in places where they are needed
                    allFigures.push(newFigureQueue[i]);
                    var tmpnew, tmpnew2;
                    if (figureQueue[i].typ === SEGMENT)
                        tmp = new FigureSegment(figureQueue[i].first, figureQueue[i].second);
                    else
                        tmp = new FigureArc(figureQueue[i].first, figureQueue[i].second,
                            figureQueue[i].radius, figureQueue[i].convexity, figureQueue[i].arcSize,
                            figureQueue[i].centre);

                    if (figureQueue[(i + 1) % newFigureQueue.length].typ === SEGMENT)
                        tmp2 = new FigureSegment(figureQueue[(i + 1) %
                        newFigureQueue.length].first, figureQueue[(i + 1) % newFigureQueue.length].second);
                    else
                        tmp2 = new FigureArc(figureQueue[(i + 1) % newFigureQueue.length].first,
                            figureQueue[(i + 1) % newFigureQueue.length].second,
                            figureQueue[(i + 1) % newFigureQueue.length].radius,
                            figureQueue[(i + 1) % newFigureQueue.length].convexity,
                            figureQueue[(i + 1) % newFigureQueue.length].arcSize,
                            figureQueue[(i + 1) % newFigureQueue.length].centre);

                    if (newFigureQueue[i].typ === SEGMENT)
                        tmpnew = new FigureSegment(newFigureQueue[i].first, newFigureQueue[i].second);
                    else
                        tmpnew = new FigureArc(newFigureQueue[i].first, newFigureQueue[i].second,
                            newFigureQueue[i].radius, newFigureQueue[i].convexity, newFigureQueue[i].arcSize);

                    if (newFigureQueue[(i + 1) % newFigureQueue.length].typ === SEGMENT)
                        tmpnew2 = new FigureSegment(newFigureQueue[(i + 1) % newFigureQueue.length].first,
                            newFigureQueue[(i + 1) % newFigureQueue.length].second);
                    else
                        tmpnew2 = new FigureArc(newFigureQueue[(i + 1) % newFigureQueue.length].first,
                            newFigureQueue[(i + 1) % newFigureQueue.length].second,
                            newFigureQueue[(i + 1) % newFigureQueue.length].radius,
                            newFigureQueue[(i + 1) % newFigureQueue.length].convexity,
                            newFigureQueue[(i + 1) % newFigureQueue.length].arcSize);

                    if (tmp.typ === ARC && tmp.convexity === CONVEX) {
                        temp = new Point(tmp.first.x, tmp.first.y);
                        temp2 = new Point(tmp.second.x, tmp.second.y);
                        tmp.first = temp2;
                        tmp.second = temp;
                    }
                    if (tmp2.typ === ARC && tmp2.convexity === CONVEX) {
                        temp = new Point(tmp2.first.x, tmp2.first.y);
                        temp2 = new Point(tmp2.second.x, tmp2.second.y);
                        tmp2.first = temp2;
                        tmp2.second = temp;
                    }
                    if (tmpnew.typ === ARC && tmpnew.convexity === CONVEX) {
                        temp = new Point(tmpnew.first.x, tmpnew.first.y);
                        temp2 = new Point(tmpnew.second.x, tmpnew.second.y);
                        tmpnew.first = temp2;
                        tmpnew.second = temp;
                    }
                    if (tmpnew2.typ === ARC && tmpnew2.convexity === CONVEX) {
                        temp = new Point(tmpnew2.first.x, tmpnew2.first.y);
                        temp2 = new Point(tmpnew2.second.x, tmpnew2.second.y);
                        tmpnew2.first = temp2;
                        tmpnew2.second = temp;
                    }
                    var tmpAr = this.figuresIntersection(newFigureQueue[i],
                        newFigureQueue[(i + 1) % (newFigureQueue.length)]);

                    if (this.pointDistance(tmpnew.second, tmpnew2.first) > EPS && tmpAr.length === 0) {
                        allFigures.length++;
                        if (this.pointDistance(tmpnew.second, tmpnew2.first) < 5)
                            allFigures[allFigures.length - 1] = new FigureSegment(tmpnew.second, tmpnew2.first);
                        else
                            allFigures[allFigures.length - 1] = new FigureCircle(tmp.second, RADIUS);
                    } else if (figureQueue.length <= 2) {
                        if (i === figureQueue.length - 1) {
                            allFigures.length++;
                            if (this.pointDistance(tmpnew.second, tmpnew2.first) < 5)
                                allFigures[allFigures.length - 1] = new FigureSegment(tmpnew.second, tmpnew2.first);
                            else
                                allFigures[allFigures.length - 1] = new FigureCircle(tmp.second, RADIUS);
                        }
                    }
                }

                var pointsIntersection = []; // All points of intersection of all Figures - changes arcs, segments, circles
                for (i = 0; i < allFigures.length; i++)
                    for (j = i + 1; j < allFigures.length; j++) {
                        var intersect = this.figuresIntersection(allFigures[i], allFigures[j]);
                        for (var k = 0; k < intersect.length; k++) {
                            pointsIntersection.length++;
                            pointsIntersection[pointsIntersection.length - 1] =
                                new PointOfIntersect(intersect[k], i, j);
                        }
                    }

                var answerPoints = []; // Points which could be in answer
                for (i = 0; i < pointsIntersection.length; i++) {
                    ok = true;
                    for (j = 0; j < figureQueue.length; j++)
                        if (this.pointFigureDistance(pointsIntersection[i].point,
                                figureQueue[j]) < RADIUS - 30 * EPS) {
                            ok = false;
                            break;
                        }
                    if (ok) {
                        answerPoints.push(pointsIntersection[i]);
                    }
                }

                var used = new Array(answerPoints.length);
                for (i = 0; i < answerPoints.length; i++)
                    used[i] = false;
                var answer = [];
                var curNum = answerPoints[0].num2, lastNum = 0;
                for (var i1 = 0; i1 < answerPoints.length; i1++) // Forming the answer - finding path
                    for (i = 0; i < answerPoints.length; i++) {
                        if (lastNum === 0 && i === 0)
                            continue;
                        if (!used[i] && (answerPoints[i].num1 === curNum ||
                            answerPoints[i].num2 === curNum)) {
                            if (answerPoints[i].num2 === curNum) {
                                tmp = answerPoints[i].num1;
                                tmp2 = answerPoints[i].num2;
                                answerPoints[i].num1 = tmp2;
                                answerPoints[i].num2 = tmp;
                            }

                            if (allFigures[answerPoints[i].num1].typ === SEGMENT) {
                                ok = true;
                                var newSeg = new FigureSegment(answerPoints[lastNum].point, answerPoints[i].point);
                                for (j = 0; j < figureQueue.length; j++)
                                    if (this.figuresIntersection(figureQueue[j], newSeg).length)
                                        ok = false;
                                if (ok) {
                                    answer.length++;
                                    answer[answer.length - 1] = new FigureSegment(
                                        answerPoints[lastNum].point, answerPoints[i].point);
                                }
                                else
                                    continue;
                            }

                            if (allFigures[answerPoints[i].num1].typ === ARC) {
                                tmp = new FigureArc(answerPoints[lastNum].point,
                                    answerPoints[i].point, allFigures[answerPoints[i].num1].radius,
                                    allFigures[answerPoints[i].num1].convexity,
                                    allFigures[answerPoints[i].num1].arcSize);
                                conv = false;
                                if (tmp.convexity === CONVEX) { 
                                    conv = true;
                                    temp = new Point(tmp.first.x, tmp.first.y);
                                    temp2 = new Point(tmp.second.x, tmp.second.y);
                                    tmp.first = temp2;
                                    tmp.second = temp;
                                }
                                tmp.centre = allFigures[answerPoints[i].num1].centre;
                                tmp = this.arcSizeCheck(tmp);
                                ok = true;
                                for (j = 0; j < figureQueue.length; j++)
                                    if (this.figuresIntersection(figureQueue[j], tmp).length)
                                        ok = false;
                                if (ok)
                                    answer.push(tmp);
                                else
                                    continue;
                            }

                            if (allFigures[answerPoints[i].num1].typ === CIRCLE) {
                                tmp = new FigureArc(answerPoints[lastNum].point, answerPoints[i].point,
                                    allFigures[answerPoints[i].num1].radius, (SIDE === EXTERIOR ? CONVEX : CONCAVE), SMALL);
                                conv = false;
                                if (tmp.convexity === CONVEX && SIDE === EXTERIOR) {
                                    conv = true;
                                    temp = new Point(tmp.first.x, tmp.first.y);
                                    temp2 = new Point(tmp.second.x, tmp.second.y);
                                    tmp.first = temp2;
                                    tmp.second = temp;
                                }
                                tmp.centre = allFigures[answerPoints[i].num1].centre;
                                tmp = this.arcSizeCheck(tmp);
                                ok = true;
                                for (j = 0; j < figureQueue.length; j++)
                                    if (this.figuresIntersection(figureQueue[j], tmp).length)
                                        ok = false;
                                answer.push(tmp);
                            }

                            used[i] = true;
                            lastNum = i;
                            curNum = answerPoints[i].num2;
                            break;
                        }
                    }

                for (i = 0; i < answer.length; i++) {
                    if (answer[i].typ === ARC && answer[i].convexity === CONVEX) {
                        tmp = new Point(answer[i].first.x, answer[i].first.y);
                        tmp2 = new Point(answer[i].second.x, answer[i].second.y);
                        answer[i].first = tmp2;
                        answer[i].second = tmp;
                    }
                }
                return answer;
            };

            Contour.prototype.calcAngle = function(point, centre) {
                var pt1 = Contour.prototype.minusPoint(point, centre);
                var pt2 = new Point(1, 0);
                var crPr = Contour.prototype.crossProduct(pt1, pt2);
                var dtPr = Contour.prototype.dotProduct(pt1, pt2);
                return 2 * PI - Math.atan2(crPr, dtPr);
            };

            Contour.prototype.isClockwise = function(convexity, arcSize) {
                return ((convexity === CONVEX && arcSize === SMALL) || (convexity === CONCAVE && arcSize === BIG));
            };

            Contour.prototype.updateCurves = function(path, correction, biggerSteps) { // returns array "curves" for process2
                if (!correction)
                    return path.curves;

                var scriptBeg = Contour.prototype.objectToScript(path, correction); // forming script
               // console.log(scriptBeg);
                var params = Contour.prototype.makeNewContourParameters(path, scriptBeg[0], scriptBeg[2], Math.abs(scriptBeg[1])); // formint parametrs from script
                var newCurves = [], temp, pathNew = new THREE.Path();
                for (var i = 0; i < params.length; i++) {
                    var p = params[i];
                    if (params[i].typ === SEGMENT) {
                        var v1 = new THREE.Vector2(params[i].first.x, params[i].first.y);
                        var v2 = new THREE.Vector2(params[i].second.x, params[i].second.y);
                        temp = new THREE.LineCurve(v1, v2);
                        temp.steps = 1;
                        newCurves.push(temp);
                    }
                    else if (params[i].typ === ARC) {
                        temp = new THREE.EllipseCurve(params[i].centre.x, params[i].centre.y, params[i].radius,
                            params[i].radius, Contour.prototype.calcAngle(params[i].first, params[i].centre),
                            Contour.prototype.calcAngle(params[i].second, params[i].centre),
                            Contour.prototype.isClockwise(params[i].convexity, params[i].arcSize));

                        if (Math.abs(PI - Math.abs(Contour.prototype.calcAngle(params[i].first, params[i].centre) -
                                    Contour.prototype.calcAngle(params[i].second, params[i].centre))) < EPS)
                            temp.aClockwise = true;

                        temp.steps = parseInt(params[i].radius / 20 * // Counting "steps" for good future drawing of arcs
                            Math.abs(Contour.prototype.calcAngle(params[i].first, params[i].centre) -
                                Contour.prototype.calcAngle(params[i].second, params[i].centre)));
                        var anglet = (Math.abs(Contour.prototype.calcAngle(params[i].first, params[i].centre) -
                            Contour.prototype.calcAngle(params[i].second, params[i].centre)));
                        if (biggerSteps)
                            temp.steps = 2 * temp.steps;
                        if (temp > anglet * 10 / PI)
                            temp = parseInt(anglet * 10 / PI);

                        if (temp.steps > 15)
                            temp.steps = 15;
                        if (!biggerSteps && temp.steps > 9)
                            temp.steps = 9;
                        if (temp.steps < 4)
                            temp.steps = 4;
                        if (params[i].radius < 4)
                            temp.steps = 2;

                        newCurves.push(temp);
                    }
                    else console.warn("Unknown type of object");
                }
                return newCurves;
            };            

            Contour.prototype.objectToScript = function(path, correction) {
                var lineSide, lineRadius, inputScript = [];
                var processCurves = path.curves;
                var startIndex = 1;
                if (correction < 0)
                    lineSide = 1;
                else
                    lineSide = 0;
                lineRadius = Math.abs(correction);

                inputScript.push('CreatePolyline("line1",' + processCurves[0].getPoint(0).x + ',' + processCurves[0].getPoint(0).y + ');');
                var currentPoint = new Point(processCurves[0].getPoint(0).x, processCurves[0].getPoint(0).y);
                var lastPoint = new Point(processCurves[0].getPoint(0).x, processCurves[0].getPoint(0).y);

                for (var i = 0; i < processCurves.length - 1; i++) {
                    if (processCurves[i] instanceof THREE.LineCurve) {
                        currentPoint.x = processCurves[i].getPoint(1).x;
                        currentPoint.y = processCurves[i].getPoint(1).y;
                        if (Math.abs(currentPoint.x - lastPoint.x) < EPS && Math.abs(currentPoint.y - lastPoint.y) < EPS) {// if lastPoint == currentPoint, do not add Segment
                            console.log("Small useless segment");
                            continue;
                        }
                        inputScript.push("AddSegmentToPolyline(" + currentPoint.x + ',' + currentPoint.y + ')');
                        lastPoint.x = currentPoint.x;
                        lastPoint.y = currentPoint.y;
                    }
                    else if (processCurves[i] instanceof THREE.EllipseCurve) {
                        currentPoint.x = processCurves[i].getPoint(1).x;
                        currentPoint.y = processCurves[i].getPoint(1).y;
                        if (Math.abs(currentPoint.x - lastPoint.x) < EPS && Math.abs(currentPoint.y - lastPoint.y) < EPS) {// if lastPoint == currentPoint, do not add Segment
                            console.log("Small useless arc");
                            continue;
                        }
                        inputScript.push("AddArc2PointCenterToPolyline(" + currentPoint.x + ',' + currentPoint.y + ',' +
                            processCurves[i].aX + ',' + processCurves[i].aY + ',' + processCurves[i].aClockwise + ');');
                        lastPoint.x = currentPoint.x;
                        lastPoint.y = currentPoint.y;
                    }
                    else 
                        console.warn("Unknown type of curve");
                }

                var firstPointCurves = path.curves[0].getPoint(0); // first point of polyline
                var lastPointCurves = path.curves[path.curves.length - 1].getPoint(1); // last point of polyline

                if (processCurves[processCurves.length - 1] instanceof THREE.LineCurve) {
                    if (Math.abs(firstPointCurves.x - lastPointCurves.x) < EPS && Math.abs(firstPointCurves.y - lastPointCurves.y) < EPS)
                        inputScript.push("ClosePolyline(line1)");
                    else
                        console.log("not closed");
                }
                else {
                    console.log("Error");
                }
                //if (Math.abs(firstPointCurves.x - lastPointCurves.x) < EPS && Math.abs(firstPointCurves.y - lastPointCurves.y) < EPS)
                //  inputScript.push("ClosePolyline(line1)");

                var ans = new Array(3);
                ans[0] = inputScript, ans[1] = lineRadius, ans[2] = lineSide;
                return ans;
            };

            Contour.prototype.makeOffsetOneObject = function(path, correction, biggerSteps, type) {// makeOffset for one object from process biggerSteps for isCutEnable === false
                if (type == "ellipse") { // If type is "ellipse", only add correction to xradius and yradius, without building new curves
                    /*for (var i = 0; i < path.actions.length; i++)
                        path.actions[i].args[2] += correction,
                            path.actions[i].args[3] += correction;*/
                    for (var i = 0; i < path.curves.length; i++)
                        path.curves[i].xRadius += correction,
                            path.curves[i].yRadius += correction;
                    return path;
                }
                path.curves = Contour.prototype.updateCurves(path, correction, biggerSteps); // Building new curves
                path.name = path.name;
                path.type = path.type;
                return path;
            };

            Contour.prototype.makeOffset = function(process) { // makeOffset for each object in process
                for (var i = 0; i < process.length; i++) {
                    var currentPathClone = process[i].path.clone();
                    if (!process[i].correction) { // do not touch process[i] if correction == 0
                        continue;
                    }
                    process[i].path = Contour.prototype.makeOffsetOneObject(currentPathClone, process[i].correction, !process[i].isCutEnable, process[i].path.type);
                }
                //DEBUG_STOP
                return process;
            };

            Contour.prototype.minusPoint = function (point1, point2) {
                return new Point(point1.x - point2.x, point1.y - point2.y);
            };

            Contour.prototype.multPoint = function (point1, k) {
                return new Point(point1.x * k, point1.y * k);
            };

            Contour.prototype.plusPoint = function (point1, point2) {
                return new Point(point1.x + point2.x, point1.y + point2.y);
            };

            Contour.prototype.multLine = function (line, k) {
                return new Line(line.a * k, line.b * k, line.c * k);
            };

            Contour.prototype.circlesIntersection = function (point1, r1, point2, r2) {
                var ans = [];
                if (Math.abs(point1.x - point2.x) < EPS && Math.abs(point1.y - point2.y) < EPS) {
                    if (Math.abs(r1 - r2) < EPS) {
                        ans.length++;
                        ans[ans.length - 1] = new Point(-INF, -INF);
                        return ans;
                    }
                }
                var vect = point1;

                point2 = this.minusPoint(point2, vect);
                var newPt = this.multPoint(point2, -2);
                var c = point2.x * point2.x + point2.y * point2.y + r1 * r1 - r2 * r2;
                var p = Math.abs(c) / Math.sqrt(newPt.x * newPt.x + newPt.y * newPt.y);
                if (p > r1 + EPS) {
                    return ans;
                }
                var pt0 = new Point(-(newPt.x * c) / (newPt.x * newPt.x + newPt.y * newPt.y),
                    -(newPt.y * c) / (newPt.x * newPt.x + newPt.y * newPt.y));
                if (Math.abs(p - r1) < EPS) {
                    ans.length++;
                    ans[ans.length - 1] = new Point(pt0.x + vect.x, pt0.y + vect.y);
                    return ans;
                }
                var l = Math.sqrt(r1 * r1 - p * p);
                var sina = l / r1;
                var cosa = p / r1;
                var pt01 = this.multPoint(new Point(pt0.x * cosa - pt0.y * sina, pt0.x * sina + pt0.y * cosa), (r1 / p));
                var pt02 = this.multPoint(new Point(pt0.x * cosa + pt0.y * sina, -pt0.x * sina + pt0.y * cosa), (r1 / p));
                if ((pt01.x < pt02.x - EPS) || (Math.abs(pt01.x - pt02.x) < EPS && pt01.y < pt02.y - EPS)) {
                    ans.length++;
                    ans[ans.length - 1] = new Point(pt01.x + vect.x, pt01.y + vect.y);
                    ans.length++;
                    ans[ans.length - 1] = new Point(pt02.x + vect.x, pt02.y + vect.y);
                }
                else {
                    ans.length++;
                    ans[ans.length - 1] = new Point(pt02.x + vect.x, pt02.y + vect.y);
                    ans.length++;
                    ans[ans.length - 1] = new Point(pt01.x + vect.x, pt01.y + vect.y);
                }
                return ans;
            };

            Contour.prototype.lineViaPoints = function (point1, point2) {
                return new Line(point1.y - point2.y, point2.x - point1.x,
                    point2.x * (point2.y - point1.y) + point2.y * (point1.x - point2.x));
            };

            Contour.prototype.orthogonalLineViaPoint = function (line, point) {
                return new Line(-line.b, line.a, line.b * point.x - line.a * point.y);
            };

            Contour.prototype.pointDistance = function (point1, point2) {
                return Math.sqrt((point1.x - point2.x) * (point1.x - point2.x) +
                    (point1.y - point2.y) * (point1.y - point2.y));
            };

            Contour.prototype.anyOtherPointOnLine = function (line, point) {
                while (Math.abs(line.a) < EPS && Math.abs(line.b) < EPS)
                    line = this.multLine(line, 2);
                if (Math.abs(line.a) <= EPS)
                    return new Point(point.x + 1, -line.c / line.b);
                else if (Math.abs(line.b) <= EPS)
                    return new Point(-line.c / line.a, point.y + 1);
                else
                    return new Point(point.x + 1, -((point.x + 1) * line.a + line.c) / line.b);
            };

            Contour.prototype.movedPointOnLine = function (line, point, len) {
                var point2 = this.anyOtherPointOnLine(line, point);
                var dist = this.pointDistance(point, point2);
                var k = len / dist;
                return this.plusPoint(point, this.multPoint(this.minusPoint(point2, point), k));
            };

            Contour.prototype.linesIntersection = function (line1, line2) {
                return new Point((line2.c * line1.b - line2.b * line1.c) / (line2.b * line1.a - line2.a * line1.b),
                    (line2.c * line1.a - line2.a * line1.c) / (line2.a * line1.b - line2.b * line1.a));
            };

            Contour.prototype.crossProduct = function (point1, point2) {
                return point1.x * point2.y - point1.y * point2.x;
            };

            Contour.prototype.dotProduct = function (point1, point2) {
                return point1.x * point2.x + point1.y * point2.y;
            };

            Contour.prototype.sqr = function (x) {
                return x * x;
            };

            Contour.prototype.arcSizeCheck = function (figure) { // Only for arcs
                var f = new FigureArc(figure.first, figure.second, figure.radius,
                    figure.convexity, SMALL, figure.centre);
                if (Math.atan2(this.crossProduct(this.minusPoint(f.first, f.centre), this.minusPoint(f.second, f.centre)),
                        this.dotProduct(this.minusPoint(f.first, f.centre), this.minusPoint(f.second, f.centre))) > -EPS)
                    f.arcSize = SMALL;
                else
                    f.arcSize = BIG;
                return f;
            };

            Contour.prototype.pointSegmentDistance = function (point, figure) {
                var a = point;
                var f = figure;
                var t1 = this.minusPoint(a, f.first);
                var t2 = this.minusPoint(f.second, f.first);
                if (this.dotProduct(t1, t2) < EPS)
                    return this.pointDistance(a, f.first);
                t1 = this.minusPoint(a, f.second);
                t2 = this.minusPoint(f.first, f.second);
                if (this.dotProduct(t1, t2) < EPS)
                    return this.pointDistance(a, f.second);
                return Math.abs(this.crossProduct(this.minusPoint(f.first, a), this.minusPoint(f.second, a))) /
                    this.pointDistance(f.first, f.second);
            };

            Contour.prototype.pointOnSegment = function (point, figure) { //bool
                var a = point;
                var f = figure;
                return Math.abs(this.pointDistance(f.first, f.second) - this.pointDistance(f.first, a) -
                        this.pointDistance(f.second, a)) < EPS;
            };

            Contour.prototype.pointOnArc = function (point, figure) { //bool
                var a = point, f = figure, tmp = [], tmp1, tmp2, i;
                if (this.pointDistance(f.first, a) < EPS || this.pointDistance(f.second, a) < EPS) return true;

                var angle1 = Math.atan2(f.first.x - f.centre.x, f.first.y - f.centre.y);
                var angle2 = Math.atan2(f.second.x - f.centre.x, f.second.y - f.centre.y);
                var anglea = Math.atan2(a.x - f.centre.x, a.y - f.centre.y);

                for (i = 0; i < 3; i++) {
                    tmp.push(i + 1);
                }
                if (angle1 > angle2) {
                    tmp1 = angle1;
                    angle1 = angle2;
                    angle2 = tmp1;
                    tmp2 = tmp[0];
                    tmp[0] = tmp[1];
                    tmp[1] = tmp2;
                }
                if (angle2 > anglea) {
                    tmp1 = anglea;
                    angle2 = tmp1;
                    tmp2 = tmp[2];
                    tmp[2] = tmp[1];
                    tmp[1] = tmp2;
                }
                if (angle1 > angle2) {
                    tmp2 = tmp[0];
                    tmp[0] = tmp[1];
                    tmp[1] = tmp2;
                }
                for (i = 0; i < 3; i++)
                    if (tmp[i] === 2)
                        return tmp[(i + 1) % 3] === 3;
            };

            Contour.prototype.pointCircleDistance = function (point, figure) {
                var a = point;
                var f = figure;
                return this.pointDistance(a, f.centre) - f.radius;
            };

            Contour.prototype.pointArcDistance = function (point, figure) {
                var a = point;
                var f = figure;
                var a1 = this.minusPoint(a, f.centre);
                var a1Moved = this.multPoint(a1, (f.radius / this.pointDistance(f.centre, a1)));
                if (this.pointOnArc(this.plusPoint(a1Moved, f.centre), f))
                    return Math.abs(f.radius - this.pointDistance(a, f.centre));
                return Math.min(this.pointDistance(a, f.first), this.pointDistance(a, f.second));
            };

            Contour.prototype.pointFigureDistance = function (point, figure) {
                var a = point;
                var f = figure;
                if (f.typ === ARC) return this.pointArcDistance(a, f);
                if (f.typ === SEGMENT) return this.pointSegmentDistance(a, f);
                if (f.typ === CIRCLE) return this.pointCircleDistance(a, f);
            };

            Contour.prototype.movedOrthogonalySegment = function (figure) {
                var f = figure;
                var l = this.lineViaPoints(f.first, f.second);

                var lOrthogonal1 = this.orthogonalLineViaPoint(l, f.first);
                var first = this.movedPointOnLine(lOrthogonal1, f.first, RADIUS);
                if (this.crossProduct(this.minusPoint(f.first, f.second), this.minusPoint(first, f.second)) > 0 &&
                    SIDE === EXTERIOR ||
                    this.crossProduct(this.minusPoint(f.first, f.second), this.minusPoint(first, f.second)) <= 0 &&
                    SIDE === INTERIOR)
                    first = this.movedPointOnLine(lOrthogonal1, f.first, -RADIUS);

                var lOrthogonal2 = this.orthogonalLineViaPoint(l, f.second);
                var second = this.movedPointOnLine(lOrthogonal2, f.second, RADIUS);
                if (this.crossProduct(this.minusPoint(f.second, f.first), this.minusPoint(second, f.first)) < 0 &&
                    SIDE === EXTERIOR ||
                    this.crossProduct(this.minusPoint(f.second, f.first), this.minusPoint(second, f.first)) >= 0 &&
                    SIDE === INTERIOR)
                    second = this.movedPointOnLine(lOrthogonal2, f.second, -RADIUS);
                return new FigureSegment(first, second);
            };

            Contour.prototype.narrowedArc = function (figure) { // Changes radius of arc for making new figures
                var newf = new FigureArc(figure.first, figure.second, figure.radius,
                    figure.convexity, figure.arcSize, figure.centre);
                var f = figure;
                if (f.convexity === CONVEX && SIDE === EXTERIOR || f.convexity === CONCAVE &&
                    SIDE === INTERIOR) {
                    newf.radius += RADIUS;
                    newf.first = this.plusPoint(newf.centre, this.multPoint(this.minusPoint(newf.first, newf.centre),
                        (1 / this.pointDistance(newf.first, newf.centre)) * newf.radius));
                    newf.second = this.plusPoint(newf.centre, this.multPoint(this.minusPoint(newf.second, newf.centre),
                        (1 / this.pointDistance(newf.second, newf.centre)) * newf.radius));
                }
                if (f.convexity === CONCAVE && SIDE === EXTERIOR || f.convexity === CONVEX &&
                    SIDE === INTERIOR) {
                    newf.radius -= RADIUS;
                    newf.radius = Math.max(newf.radius, 0);
                    newf.first = this.plusPoint(newf.centre, this.multPoint(this.minusPoint(newf.first, newf.centre),
                        (1 / this.pointDistance(newf.first, newf.centre)) * Math.max(0, newf.radius)));
                    newf.second = this.plusPoint(newf.centre, this.multPoint(this.minusPoint(newf.second, newf.centre),
                        (1 / this.pointDistance(newf.second, newf.centre)) * Math.max(0, newf.radius)));
                }
                return newf;
            };

            Contour.prototype.segmentsIntersectionBool = function (figure1, figure2) { //bool
                var f1 = figure1;
                var f2 = figure2;
                if (Math.max(f1.first.x, f1.second.x) + 2 * EPS < Math.min(f2.first.x, f2.second.x) ||
                    Math.max(f2.first.x, f2.second.x) + 2 * EPS < Math.min(f1.first.x, f1.second.x))
                    return false;
                if (Math.max(f1.first.y, f1.second.y) + 2 * EPS < Math.min(f2.first.y, f2.second.y) ||
                    Math.max(f2.first.y, f2.second.y) + 2 * EPS < Math.min(f1.first.y, f1.second.y))
                    return false;
                if (this.crossProduct(this.minusPoint(f1.second, f1.first), this.minusPoint(f2.first, f1.first)) *
                    this.crossProduct(this.minusPoint(f1.second, f1.first), this.minusPoint(f2.second, f1.first)) > -EPS) {
                    return false;
                }
                return this.crossProduct(this.minusPoint(f2.second, f2.first), this.minusPoint(f1.first, f2.first)) *
                    this.crossProduct(this.minusPoint(f2.second, f2.first), this.minusPoint(f1.second, f2.first)) <= -EPS;
            };

            Contour.prototype.segmentsIntersection = function (figure1, figure2) {
                var f1 = figure1;
                var f2 = figure2;
                var ans = [];
                if (this.pointDistance(f1.first, f2.first) < EPS || this.pointDistance(f1.first, f2.second) < EPS) {
                    ans.push(f1.first);
                    return ans;
                }
                if (this.pointDistance(f1.second, f2.first) < EPS || this.pointDistance(f1.second, f2.second) < EPS) {
                    ans.push(f1.second);
                    return ans;
                }

                if (Math.abs((f1.first.x - f1.second.x) * (f2.first.y - f2.second.y) -
                        (f2.first.x - f2.second.x) * (f1.first.y - f1.second.y)) < EPS)
                    return ans;

                if (this.segmentsIntersectionBool(f1, f2)) {
                    ans.push(this.linesIntersection(this.lineViaPoints(f1.first,
                        f1.second), this.lineViaPoints(f2.first, f2.second)));
                }
                return ans;
            };

            Contour.prototype.arcsIntersection = function (figure1, figure2) {
                var f1 = figure1;
                var f2 = figure2;
                var circlePoints = this.circlesIntersection(f1.centre, f1.radius, f2.centre,
                    f2.radius);
                var ans = [];
                for (var i = 0; i < circlePoints.length; i++)
                    if (this.pointOnArc(circlePoints[i], f1) && this.pointOnArc(circlePoints[i], f2))
                        ans.push(circlePoints[i]);
                return ans;
            };

            Contour.prototype.lineCircleIntersection = function (line, centre, radius) {
                var ans = [];
                var h = Math.abs((line.a * centre.x + line.b * centre.y + line.c) /
                    (Math.sqrt(this.sqr(line.a) + this.sqr(line.b))));
                if (h - EPS > radius)
                    return ans;
                var ptH = this.linesIntersection(line, this.orthogonalLineViaPoint(line, centre));
                if (Math.abs(h - radius) < EPS) {
                    ans.push(ptH);
                    return ans;
                }
                var len = Math.sqrt(this.sqr(radius) - this.sqr(h));
                ans.push(this.movedPointOnLine(line, ptH, len));
                ans.push(this.movedPointOnLine(line, ptH, -len));
                return ans;
            };

            Contour.prototype.segmentArcIntersection = function (seg, arc) {
                var ans = [];
                var lineCircleIntersect = this.lineCircleIntersection(this.lineViaPoints(seg.first,
                    seg.second), arc.centre, arc.radius);
                for (var i = 0; i < lineCircleIntersect.length; i++)
                    if (this.pointOnSegment(lineCircleIntersect[i], seg) &&
                        this.pointOnArc(lineCircleIntersect[i], arc)) {
                        ans.push(lineCircleIntersect[i]);
                    }
                return ans;
            };

            Contour.prototype.segmentCircleIntersection = function (seg, circle) {
                var ans = [];
                var intersect = this.lineCircleIntersection(this.lineViaPoints(seg.first,
                    seg.second), circle.centre, circle.radius);
                for (var i = 0; i < intersect.length; i++)
                    if (this.pointOnSegment(intersect[i], seg))
                        ans.push(intersect[i]);
                return ans;
            };

            Contour.prototype.circleArcIntersection = function (circle, arc) {
                var ans = [];
                var intersect = this.circlesIntersection(circle.centre, circle.radius,
                    arc.centre, arc.radius);
                for (var i = 0; i < intersect.length; i++)
                    if (this.pointOnArc(intersect[i], arc))
                        ans.push(intersect[i]);
                return ans;
            };

            Contour.prototype.figuresIntersection = function (figure1, figure2) {
                var a = figure1;
                var b = figure2;
                var ans = []
                if (a.first && b.first) {
                    if (this.pointDistance(a.first, b.first) < EPS3) {
                        ans.push(new Point(a.first.x, a.first.y));
                        return ans;
                    }
                    if (this.pointDistance(a.first, b.second) < EPS3) {
                        ans.push(new Point(a.first.x, a.first.y));
                        return ans;
                    }
                    if (this.pointDistance(a.second, b.second) < EPS3) {
                        ans.push(new Point(a.second.x, a.second.y));
                        return ans;
                    }
                    if (this.pointDistance(a.second, b.first) < EPS3) {
                        ans.push(new Point(a.second.x, a.second.y));
                        return ans;
                    }
                }
                if (a.typ === SEGMENT) {
                    if (b.typ === SEGMENT)
                        return this.segmentsIntersection(a, b);
                    if (b.typ === ARC)
                        return this.segmentArcIntersection(a, b);
                    if (b.typ === CIRCLE)
                        return this.segmentCircleIntersection(a, b);
                }
                if (a.typ === ARC) {
                    if (b.typ === SEGMENT)
                        return this.segmentArcIntersection(b, a);
                    if (b.typ === ARC)
                        return this.arcsIntersection(a, b);
                    if (b.typ === CIRCLE)
                        return this.circleArcIntersection(b, a);
                }
                if (a.typ === CIRCLE) {
                    if (b.typ === SEGMENT)
                        return this.segmentCircleIntersection(b, a);
                    if (b.typ === CIRCLE)
                        return this.circlesIntersection(a.centre, a.radius,
                            b.centre, b.radius);
                    if (b.typ === ARC) {
                        return this.circleArcIntersection(a, b);
                    }
                }
            };

            Contour.prototype.circumscribedCircleCentre = function (a, b, c) { /// 3 points -> centre (point)
                var c1 = this.multPoint(this.plusPoint(a, b), 0.5);
                var b1 = this.multPoint(this.plusPoint(a, c), 0.5);
                var lc = this.orthogonalLineViaPoint(this.lineViaPoints(a, b), c1);
                var lb = this.orthogonalLineViaPoint(this.lineViaPoints(a, c), b1);
                return this.linesIntersection(lc, lb);
            }

            Contour.prototype.parseFirstInputLine = function (line) {
                var newLine = "";
                for (var i = 0; i < line.length; i++)
                    if (line[i] != ' ')
                        newLine += line[i];
                line = newLine;
                var beg = 'CreatePolyline("';
                var x = "", y = "";
                var i = 0;
                lineName = "";
                for (i = beg.length; i < line.length; i++)
                    if (line[i] == '"')
                        break;
                    else
                        lineName += line[i];
                i += 2;
                for (; line.length; i++)
                    if (line[i] == ',')
                        break;
                    else
                        x += line[i];
                i++;
                for (; line.length; i++)
                    if (line[i] == ')')
                        break;
                    else
                        y += line[i];
                x = parseFloat(x);
                y = parseFloat(y);
                var arrayOfValues = [];
                arrayOfValues.push(x);
                arrayOfValues.push(y);
                return arrayOfValues;
            };

            Contour.prototype.lastLine = function (line) { //bool
                var prefix = "ClosePolyline";
                return line.substr(0, prefix.length) === prefix;
            };

            Contour.prototype.make4to2 = function (array, last) { // ARC, ox(double), oy(double), angle(double)
                var x = last.x - array[1];
                var y = last.y - array[2];
                var angle = array[3];
                var second = new Point(array[1] + x * Math.cos(angle) - y * Math.sin(angle), array[2] + y * Math.cos(angle) + x * Math.sin(angle));
                var wise;
                wise = angle <= 0;
                return [ARC, second.x, second.y, array[1], array[2], wise];
            };

            Contour.prototype.make3to2 = function (array, last) { // ARC, bx(double), by(double), r(double), isClockwise(bool), isOver180(bool)
                var second = new Point(array[1], array[2]);
                var radius = array[3];
                var isClockwise = array[4];
                var isOver180 = array[5];
                var possiblePoints = this.circlesIntersection(second, radius, last, radius);
                if (possiblePoints.length == 0) {
                    return [ARC, second.x, second.y, (second.x + last.x) / 2, (second.y + last.y) / 2, isClockwise];
                }
                else if (possiblePoints.length == 1) {
                    return [ARC, second.x, second.y, possiblePoints[0].x, possiblePoints[0].y, isClockwise];
                }
                else {
                    if (this.crossProduct(this.minusPoint(possiblePoints[0], last), this.minusPoint(second, last)) > 0) {
                        var tmp = possiblePoints[0];
                        var tmp2 = possiblePoints[1];
                        possiblePoints[0] = tmp2;
                        possiblePoints[1] = tmp;
                    }
                    var centre;
                    if (isClockwise)
                        if (isOver180)
                            centre = possiblePoints[0];
                        else
                            centre = possiblePoints[1];
                    else
                    if (isOver180)
                        centre = possiblePoints[1];
                    else
                        centre = possiblePoints[0];
                    return [ARC, second.x, second.y, centre.x, centre.y, isClockwise];
                }
            };

            Contour.prototype.make1to2 = function (array, last) { // ARC, bx(double), by(double), cx(double), cy(double)
                var b = new Point(array[1], array[2]);
                var c = new Point(array[3], array[4]);
                var centre = this.circumscribedCircleCentre(last, b, c);
                var tempArc = new FigureArc(c, last, this.pointDistance(centre, b), CONVEX, SMALL, centre); // Convexity and arc size are not important
                var wise = this.pointOnArc(b, tempArc);
                return [ARC, c.x, c.y, centre.x, centre.y, wise];
            };

            Contour.prototype.parseElementLine = function (line, last) {
                var templine = "";
                for (var i = 0; i < line.length; i++)
                    if (line[i] != ' ')
                        templine += line[i];
                line = templine;

                var prefixSeg = "AddSegmentToPolyline(";
                var prefixArc1 = "AddArc3PointsToPolyline(";
                var prefixArc2 = "AddArc2PointCenterToPolyline(";
                var prefixArc4 = "AddArcCenterAngleToPolyline(";
                var prefixArc3 = "AddArc2PointRadiusToPolyline(";
                var arcTyp = -1;
                var ans = [];
                var beg;
                if (line.length >= prefixSeg.length && line.substr(0, prefixSeg.length) === prefixSeg) {
                    ans.push(SEGMENT);
                    beg = prefixSeg.length;
                }
                else if (line.length >= prefixArc1.length && line.substr(0, prefixArc1.length) === prefixArc1) {
                    ans.push(ARC);
                    beg = prefixArc1.length;
                    arcTyp = 1;
                }
                else if (line.length >= prefixArc2.length && line.substr(0, prefixArc2.length) === prefixArc2) {
                    ans.push(ARC);
                    beg = prefixArc2.length;
                    arcTyp = 2;
                }
                else if (line.length >= prefixArc4.length && line.substr(0, prefixArc4.length) === prefixArc4) {
                    ans.push(ARC);
                    beg = prefixArc4.length;
                    arcTyp = 4;
                }
                else if (line.length >= prefixArc3.length && line.substr(0, prefixArc3.length) === prefixArc3) {
                    ans.push(ARC);
                    beg = prefixArc3.length;
                    arcTyp = 3;
                }
                else {
                    return [TRASH];
                }
                var cur = "";
                for (var j = beg; j < line.length; j++) {
                    if (line[j] === ',' || line[j] === ')') {
                        ans.length++;
                        if (cur.length >= 4 && cur.substr(cur.length - 4, 4) == 'true') {
                            ans[ans.length - 1] = Number(1);
                        }
                        else if (cur.length >= 5 && cur.substr(cur.length - 5, 5) == 'false') {
                            ans[ans.length - 1] = Number(0);
                        }
                        else {
                            eval('ans[ans.length - 1] = ' + cur + ';');
                        }
                        cur = "";
                    }
                    else {
                        cur += line[j];
                    }
                }
                if (arcTyp === 4) {
                    ans = this.make4to2(ans, last);
                }
                if (arcTyp === 3) {
                    ans = this.make3to2(ans, last);
                }
                if (arcTyp === 1) {
                    ans = this.make1to2(ans, last);
                }
                return ans;
            };

            function Point(x, y) {
                this.x = x;
                this.y = y;
            }

            function PointOfIntersect(point, num1, num2) {
                this.point = point;
                this.num1 = num1;
                this.num2 = num2;
            }

            function Line(a, b, c) {
                this.a = a;
                this.b = b;
                this.c = c;
            }

            function FigureArc(point1, point2, radius, convexity, arcSize, centre) { //Constructor for arc
                this.first = new Point(point1.x, point1.y);
                this.second = new Point(point2.x, point2.y);
                this.radius = radius;
                this.typ = ARC;
                this.convexity = convexity;
                this.arcSize = arcSize;
                if (centre)
                    this.centre = new Point(centre.x, centre.y);
                else
                    this.centre = null;
            }

            function FigureSegment(point1, point2) {
                this.first = new Point(point1.x, point1.y);
                this.second = new Point(point2.x, point2.y);
                this.typ = SEGMENT;
            }

            function FigureCircle(centre, radius) {
                this.centre = new Point(centre.x, centre.y);
                this.radius = radius;
                this.typ = CIRCLE;
            }

            return Contour;
        })();

    };

    unit.define(
        'contour',
        init
    );

}).call();
