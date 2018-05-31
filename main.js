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
    var $svg = $("svg"), svg = $svg[0], width = +$svg.attr("width"), height = +$svg.attr("height"), left = 40, top = 20;
    var startYear = 1800, endYear = 2008, span = endYear - startYear + 1, threshold = 20;
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
    //produce image
    var gRoot = document.createElementNS("http://www.w3.org/2000/svg", "g");
    var $gRoot = $(gRoot);
    $(svg).append(gRoot);
    $gRoot.attr("transform", "translate(" + [left, top] + ")");
    var xLabel = document.createElementNS("http://www.w3.org/2000/svg", "text");
    $gRoot.append(xLabel);
    $(xLabel)
        .attr("class", "x label")
        .attr("text-anchor", "end")
        .attr("x", 940)
        .attr("y", 455)
        .text("income per capita, inflation-adjusted (dollars)");
    var yLabel = document.createElementNS("http://www.w3.org/2000/svg", "text");
    $gRoot.append(yLabel);
    $(yLabel)
        .attr("class", "y label")
        .attr("text-anchor", "end")
        .attr("y", 6)
        .attr("dy", ".75em")
        .attr("transform", "rotate(-90)")
        .text("life expectancy (years)");
    //nation label
    var nationLabel = document.createElementNS("http://www.w3.org/2000/svg", "text");
    $gRoot.append(nationLabel);
    var $nationLabel = $(nationLabel);
    $nationLabel
        .attr("class", "nation label")
        .attr("text-anchor", "start")
        .attr("x", 20)
        .attr("y", 80);
    //year label
    var yearLabelScale = new Scale([0, 460], [0, span], "linear");
    var yearLabel = document.createElementNS("http://www.w3.org/2000/svg", "text");
    $gRoot.append(yearLabel);
    $(yearLabel)
        .attr("class", "year label")
        .attr("text-anchor", "end")
        .attr("x", 940)
        .attr("y", 440)
        .text(1800)
        .mousemove(function (evt) {
        var x = evt.pageX - Math.round($(evt.target).offset().left);
        var index = Math.floor(yearLabelScale.cal(x));
        update(index);
    });
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
    //dots
    var gDots = document.createElementNS("http://www.w3.org/2000/svg", "g");
    $gRoot.append(gDots);
    $(gDots).attr("class", "dots");
    var _loop_1 = function (name_2) {
        var nation = map[name_2];
        var d = new Data(name_2, nation.group, nation.gdp, nation.life, nation.pop), c = new Circle(d, scaleX, scaleY, scaleR);
        nation.circle = c;
        var path = createSVGElement("path");
        $(path)
            .attr("d", c.trail())
            .attr("class", "lineTrajectory");
        nation.trail = path;
        c.appendTo(gDots);
        c.update(0);
        $(c.circle)
            .mouseenter(function () {
            $nationLabel.text(name_2);
            //draw trail
            $(nation.path).appendTo($gRoot);
            //animate color change of trail
        })
            .mouseleave(function () {
            $nationLabel.text("");
            //remove trail
            $(nation.path).detach();
            //stop uncompleted animation if any
        });
    };
    for (var name_2 in map) {
        _loop_1(name_2);
    }
    //slider
    var $slider = $("#slider");
    $slider.change(function () {
        update(+$slider.val());
    });
    function update(index) {
        for (var name_3 in map) {
            var nation = map[name_3];
            nation.circle.update(index);
        }
        $(yearLabel).text(index + startYear);
        $slider.val(index); //will this cause endless loop?
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
        for (var name_4 in map) {
            var nation = map[name_4];
            var locMin = nation[attr].reduce(function (min, cur) { return Math.min(min, cur); }, Infinity);
            if (locMin < min) {
                min = locMin;
            }
        }
        return min;
    }
    function getMax(attr) {
        var max = -Infinity;
        for (var name_5 in map) {
            var nation = map[name_5];
            var locMax = nation[attr].reduce(function (max, cur) { return Math.max(max, cur); }, -Infinity);
            if (locMax > max) {
                max = locMax;
            }
        }
        return max;
    }
    function createSVGElement(tag) {
        return document.createElementNS("http://www.w3.org/2000/svg", tag);
    }
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
        this.data = data.data.map(function (datum) {
            return [new Point(scaleX.cal(datum[0]), scaleY.cal(datum[1])),
                scaleR.cal(datum[2])];
        });
        var title = document.createElementNS("http://www.w3.org/2000/svg", "title");
        $(title).text(data.name);
        this.circle = document.createElementNS("http://www.w3.org/2000/svg", "circle");
        $(this.circle)
            .css("fill", this.color)
            //events?
            .append(title);
    }
    Circle.setColors = function (colors) {
        this.colors = colors;
    };
    Circle.prototype.appendTo = function (parent) {
        $(parent).append(this.circle);
    };
    Circle.prototype.update = function (index) {
        var datum = this.data[index];
        $(this.circle)
            .attr("cx", datum[0].x)
            .attr("cy", datum[0].y)
            .attr("r", datum[1]);
    };
    Circle.prototype.trail = function () {
        var len = this.data.length;
        var path = "M " + this.data[0][0].toString();
        for (var i = 1; i < len; i++) {
            var datum = this.data[i];
            path += "L " + datum[0].toString();
        }
        return path;
    };
    return Circle;
}());
