$(document).ready(function () {
    // $.get("./data/gdp_per_capita_ppp.csv", function (gdpcsv) {
    $.get("https://raw.githubusercontent.com/RandomEtc/mind-gapper-js/master/data/gdp_per_capita_ppp.csv", function (gdpcsv) {
        var gdp = $.csv.toObjects(gdpcsv);
        // $.get("./data/indicator_gapminder_population.csv", function (popcsv) {
        $.get("https://raw.githubusercontent.com/RandomEtc/mind-gapper-js/master/data/indicator_gapminder_population.csv", function (popcsv) {
            var pop = $.csv.toObjects(popcsv);
            // $.get("./data/life_expectancy_at_birth.csv", function (lifecsv) {
            $.get("https://raw.githubusercontent.com/RandomEtc/mind-gapper-js/master~/data/life_expectancy_at_birth.csv", function (lifecsv) {
                var life = $.csv.toObjects(lifecsv);
                // $.get("./data/color_regions.csv", function (colorcsv) {
                $.get("https://raw.githubusercontent.com/RandomEtc/mind-gapper-js/master/data/color_regions.csv", function (colorcsv) {
                    var color = $.csv.toObjects(colorcsv);
                    start(gdp, life, pop, color);
                });
            });
        });
    });
});
function start(gdp, life, pop, group) {
    var $svg = $("svg"), width = +$svg.attr("width"), height = +$svg.attr("height"), left = 40, top = 20;
    var startYear = 1800, endYear = 2008, span = endYear - startYear + 1, threshold = 20;
    var selected = null;
    var mouseDownEvent = null;
    var isSelected = false;
    $svg
        .mouseup(function (evt) {
        selected = null;
        // if (evt.target === $svg[0]) {
        nations.forEach(function (n) {
            n.point.reemphasize();
        });
        $nationLabel.text("");
        // }
    })
        .mousemove(function (evt) {
        if (selected) {
            evt.preventDefault();
            var offset = $gRoot.offset(), p_1 = new Point(evt.pageX - offset.left, evt.pageY - offset.top);
            //the index of the nearest point on the trail of the selected
            var points = map[$("title", selected).text()].point.getPoints();
            var indexDistMin_1 = 0;
            var distMin_1 = Infinity;
            points.forEach(function (point, index) {
                var distTemp = p_1.getDistance(point);
                if (distTemp < distMin_1) {
                    distMin_1 = distTemp;
                    indexDistMin_1 = index;
                }
            });
            update(indexDistMin_1);
        }
    });
    //preprocess data
    //to map
    var map = {};
    addAttr(gdp, "", "gdp", true);
    addAttr(life, "Life expectancy at brith", "life", false);
    addAttr(pop, "Population", "pop", false);
    group.forEach(function (ob) {
        var name = ob["Entity"];
        if (map[name]) {
            map[name]["group"] = ob["Group"];
            map[name]["name"] = name;
        }
    });
    for (var name_1 in map) {
        var nation = map[name_1], gdp_1 = nation["gdp"], life_1 = nation["life"], pop_1 = nation["pop"], group_1 = nation["group"];
        if (!gdp_1 || !life_1 || !pop_1 || !group_1) { //delete nations with incomplete data
            delete map[name_1];
            continue;
        }
        //interpolate
        var InterpolatorGdp = new Interpolator(gdp_1);
        var InterpolatorLife = new Interpolator(life_1);
        var InterpolatorPop = new Interpolator(pop_1);
        for (var i = 0; i < span; i++) {
            if (isNaN(gdp_1[i])) {
                gdp_1[i] = InterpolatorGdp.interpolate(i);
            }
            if (isNaN(life_1[i])) {
                life_1[i] = InterpolatorLife.interpolate(i);
            }
            if (isNaN(pop_1[i])) {
                pop_1[i] = InterpolatorPop.interpolate(i);
            }
        }
    }
    //order: nations of large population painted beneath
    var nations = [];
    for (var name_2 in map) {
        nations.push(map[name_2]);
    }
    nations.sort(function (a, b) {
        return b.pop[span - 1] - a.pop[span - 1];
    });
    //produce image
    var $gRoot = create$SVGElement("g")
        .attr("transform", "translate(" + [left, top] + ")")
        .appendTo($svg);
    //x label
    create$SVGElement("text")
        .attr("class", "x label")
        .attr("text-anchor", "end")
        .attr("x", 940)
        .attr("y", 455)
        .text("income per capita, inflation-adjusted (dollars)")
        .appendTo($gRoot);
    //y label
    create$SVGElement("text")
        .attr("class", "y label")
        .attr("text-anchor", "end")
        .attr("y", 6)
        .attr("dy", ".75em")
        .attr("transform", "rotate(-90)")
        .text("life expectancy (years)")
        .appendTo($gRoot);
    //nation label
    var $nationLabel = create$SVGElement("text")
        .attr("class", "nation label")
        .attr("text-anchor", "start")
        .attr("x", 20)
        .attr("y", 80)
        .appendTo($gRoot);
    //year label
    var $gYearLabel = create$SVGElement("g").attr("transform", "translate(" + [500, 280] + ")").appendTo($gRoot);
    var scaleYear = new Scale([0, 450], [0, span], "linear");
    var $yearLabel = create$SVGElement("text")
        .attr("class", "year label")
        // .attr("x", 940)
        .attr("y", 150)
        .text(1800)
        .appendTo($gYearLabel);
    create$SVGElement("rect")
        .attr("y", 25)
        .attr("width", 450)
        .attr("height", 100)
        .css("fill", "transparent")
        .mousemove(function (evt) {
        if (!selected) {
            var x = evt.pageX - Math.round($(evt.target).offset().left);
            var index = Math.floor(scaleYear.cal(x));
            update(index);
        }
    })
        .appendTo($gYearLabel);
    //trails
    var $gTrail = create$SVGElement("g").appendTo($gRoot);
    var $gTrailSelected = create$SVGElement("g").appendTo($gRoot);
    //dots
    //scales
    var scaleX = new Scale([getMin("gdp"), getMax("gdp")], [0, width - left], "log"), scaleY = new Scale([getMin("life"), getMax("life")], [height - top, 0], "linear"), scaleR = new Scale([getMin("pop"), getMax("pop")], [0, 65], "sqrt");
    //colors
    var colors = [
        ["Sub-Saharan Africa", "blue"],
        ["South Asia", "skyblue"],
        ["Middle East & North Africa", "lightgreen"],
        ["America", "yellow"],
        ["Europe & Central Asia", "orange"],
        ["East Asia & Pacific", "red"]
    ];
    Circle.setColors(new Map(colors));
    var $gDots = create$SVGElement("g")
        .attr("class", "dots")
        .appendTo($gRoot);
    nations.forEach(function (nation) {
        var d = new Data(nation.name, nation.group, nation.gdp, nation.life, nation.pop), c = new Circle(d, scaleX, scaleY, scaleR);
        nation.point = c;
        var trail = c.getTrail();
        nation.$hoverTrail = create$SVGElement("path")
            .attr("d", trail)
            .attr("class", "lineTrajectory");
        nation.$selectTrail = create$SVGElement("path")
            .attr("d", trail)
            .attr("class", "lineTrajectory");
        c.appendTo($gDots);
        c.update(0);
        c.$circle
            .mousedown(function (evt) {
            selected = evt.target;
            mouseDownEvent = evt;
            isSelected = nation.point.$circle[0].classList.contains("selected");
            if (!nation.$selectTrail.parent()[0]) {
                nation.$selectTrail.prependTo($gTrailSelected);
                nation.point.$circle[0].classList.add("selected");
            }
            nations.forEach(function (n) {
                if (n !== nation)
                    n.point.deemphasize();
            });
            $nationLabel.text(nation.name);
        })
            // .click(function () {
            // })
            .mouseup(function (evt) {
            if (mouseDownEvent && mouseDownEvent.pageX === evt.pageX
                && mouseDownEvent.pageY === evt.pageY) {
                if (isSelected && nation.$selectTrail.parent()[0]) {
                    nation.$selectTrail.detach();
                    nation.point.$circle[0].classList.remove("selected");
                }
                else if (!isSelected && !nation.$selectTrail.parent()[0]) {
                    nation.$selectTrail.prependTo($gTrailSelected);
                    nation.point.$circle[0].classList.add("selected");
                }
            }
        })
            .mouseenter(function () {
            if (!selected) {
                //hightlight hovered circle
                nations.forEach(function (n) {
                    if (n !== nation)
                        n.point.deemphasize();
                });
                //show nation name
                $nationLabel.text(nation.name);
                //draw trail
                nation.$hoverTrail.prependTo($gTrail);
                //animate color change of trail
                var points_1 = c.getPoints(), i_1 = 0, len_1 = points_1.length;
                nation.intervalNumber = setInterval(drawSegment, 16);
                function drawSegment() {
                    var $trailSegment = create$SVGElement("path")
                        .attr("class", "trailSegment")
                        .attr("d", "M " + points_1[i_1].toString() + " L " + points_1[i_1 + 1].toString())
                        .appendTo($gTrail);
                    if (++i_1 >= len_1 - 1) {
                        clearInterval(nation.intervalNumber);
                    }
                }
            }
        })
            .mouseleave(function () {
            if (!selected) {
                nations.forEach(function (n) {
                    n.point.reemphasize();
                });
                $nationLabel.text("");
            }
            //stop uncompleted animation if any
            clearInterval(nation.intervalNumber);
            //remove trail
            nation.$hoverTrail.detach();
            $gTrail.html("");
            // }
        });
    });
    //slider
    // let $slider = $("#slider");
    // $slider.change(function () {
    //     update(+$slider.val());
    // });
    function update(index) {
        nations.forEach(function (nation) {
            nation.point.update(index);
        });
        $yearLabel.text(index + startYear);
        // $slider.val(index); //will this cause endless loop?
    }
    function addAttr(attr, getName, setName, isNew) {
        attr.forEach(function (ob) {
            var name = ob[getName];
            if (map[name] == undefined) {
                if (isNew) {
                    map[name] = {};
                }
                else
                    return;
            }
            delete ob[getName];
            map[name][setName] = toArray(ob);
        });
    }
    function toArray(ob) {
        var arr = [], count = 0;
        for (var attr in ob) {
            var year = parseInt(attr);
            if (year >= startYear && year <= endYear) {
                var value = parseFloat(ob[attr]);
                if (!isNaN(value)) {
                    count++;
                }
                arr[year - startYear] = value;
            }
        }
        if (count >= threshold)
            return arr;
        else
            return null;
    }
    function getMin(attr) {
        var min = Infinity;
        nations.forEach(function (nation) {
            var locMin = nation[attr].reduce(function (min, cur) { return Math.min(min, cur); }, Infinity);
            if (locMin < min) {
                min = locMin;
            }
        });
        return min;
    }
    function getMax(attr) {
        var max = -Infinity;
        nations.forEach(function (nation) {
            var locMax = nation[attr].reduce(function (max, cur) { return Math.max(max, cur); }, -Infinity);
            if (locMax > max) {
                max = locMax;
            }
        });
        return max;
    }
}
function create$SVGElement(tag) {
    return $(document.createElementNS("http://www.w3.org/2000/svg", tag));
}
var Interpolator = /** @class */ (function () {
    function Interpolator(array) {
        this.array = array;
        for (var index = 0; index < array.length; index++) {
            var element = array[index];
            if (!isNaN(element)) {
                if (this.index1 == undefined) {
                    this.index1 = index;
                }
                else if (this.index2 == undefined) {
                    this.index2 = index;
                }
                else {
                    break;
                }
            }
        }
        this.scale = new Scale([this.index1, this.index2], [array[this.index1], array[this.index2]], "linear");
        for (var index = 0; index < array.length; index++) {
            var element = array[index];
            if (!isNaN(element)) {
                this.indexFirst = index;
                break;
            }
        }
        for (var index = 0; index < array.length; index++) {
            var element = array[array.length - 1 - index];
            if (!isNaN(element)) {
                this.indexLast = index;
                break;
            }
        }
    }
    Interpolator.prototype.interpolate = function (index) {
        if (index > this.indexLast) {
            return this.array[this.indexLast];
        }
        if (index < this.indexFirst) {
            return this.array[this.indexFirst];
        }
        if (index > this.index2) {
            var next = undefined;
            for (var index_1 = this.index2 + 1; index_1 < this.array.length; index_1++) {
                var element = this.array[index_1];
                if (!isNaN(element)) {
                    next = index_1;
                    break;
                }
            }
            if (next != undefined) {
                this.index1 = this.index2;
                this.index2 = next;
            }
            this.scale = new Scale([this.index1, this.index2], [this.array[this.index1], this.array[this.index2]], "linear");
        }
        return this.scale.cal(index);
    };
    return Interpolator;
}());
var Scale = /** @class */ (function () {
    function Scale(domain, range, fun) {
        this.f = Scale.funs[fun];
        this.k = (range[1] - range[0]) / (this.f(domain[1]) - this.f(domain[0]));
        this.b = range[1] - this.k * this.f(domain[1]);
    }
    Scale.prototype.cal = function (x) {
        return this.k * this.f(x) + this.b;
    };
    Scale.funs = {
        linear: function (x) { return x; },
        log: function (x) { return Math.log(x); },
        sqrt: function (x) { return Math.sqrt(x); }
    };
    return Scale;
}());
var Point = /** @class */ (function () {
    function Point(x, y) {
        this.x = x;
        this.y = y;
    }
    Point.prototype.getDistance = function (p) {
        var dx = p.x - this.x, dy = p.y - this.y;
        return Math.sqrt(dx * dx + dy * dy);
    };
    Point.prototype.toString = function () {
        return this.x + ", " + this.y;
    };
    return Point;
}());
var Data = /** @class */ (function () {
    function Data(name, group, attr1, attr2, attr3) {
        this.name = name;
        this.group = group;
        this.data = [];
        for (var index = 0; index < attr1.length; index++) {
            this.data.push([attr1[index], attr2[index], attr3[index]]);
        }
    }
    return Data;
}());
var Circle = /** @class */ (function () {
    function Circle(data, scaleX, scaleY, scaleR) {
        this.color = Circle.colors.get(data.group);
        this.points = data.data.map(function (datum) { return new Point(scaleX.cal(datum[0]), scaleY.cal(datum[1])); });
        this.radii = data.data.map(function (datum) { return scaleR.cal(datum[2]); });
        this.$circle = create$SVGElement("circle").css("fill", this.color);
        create$SVGElement("title").text(data.name).appendTo(this.$circle);
    }
    Circle.setColors = function (colors) {
        this.colors = colors;
    };
    Circle.prototype.appendTo = function (parent) {
        this.$circle.appendTo(parent);
    };
    Circle.prototype.update = function (index) {
        var point = this.points[index], radius = this.radii[index];
        this.$circle
            .attr("cx", point.x)
            .attr("cy", point.y)
            .attr("r", radius < 0 ? 0 : radius);
    };
    Circle.prototype.getTrail = function () {
        var len = this.points.length;
        var path = "M " + this.points[0].toString();
        for (var i = 1; i < len; i++) {
            var point = this.points[i];
            path += "L " + point.toString();
        }
        return path;
    };
    Circle.prototype.getPoints = function () {
        var points = this.points; //?
        return points;
    };
    Circle.prototype.deemphasize = function () {
        // this.$circle.attr("class", "notHovered");
        this.$circle[0].classList.add("notHovered");
    };
    Circle.prototype.reemphasize = function () {
        // this.$circle.attr("class", "");
        this.$circle[0].classList.remove("notHovered");
    };
    return Circle;
}());
