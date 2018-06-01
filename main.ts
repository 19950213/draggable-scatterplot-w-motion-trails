$(document).ready(function () {
    // $.get("./data/gdp_per_capita_ppp.csv", function (gdpcsv) {
    $.get("https://raw.githubusercontent.com/RandomEtc/mind-gapper-js/master/data/gdp_per_capita_ppp.csv", function (gdpcsv) {
        let gdp = $.csv.toObjects(gdpcsv);
        // $.get("./data/indicator_gapminder_population.csv", function (popcsv) {
        $.get("https://raw.githubusercontent.com/RandomEtc/mind-gapper-js/master/data/indicator_gapminder_population.csv", function (popcsv) {
            let pop = $.csv.toObjects(popcsv);
            // $.get("./data/life_expectancy_at_birth.csv", function (lifecsv) {
            $.get("https://raw.githubusercontent.com/RandomEtc/mind-gapper-js/master~/data/life_expectancy_at_birth.csv", function (lifecsv) {
                let life = $.csv.toObjects(lifecsv);
                // $.get("./data/color_regions.csv", function (colorcsv) {
                $.get("https://raw.githubusercontent.com/RandomEtc/mind-gapper-js/master/data/color_regions.csv", function (colorcsv) {
                    let color = $.csv.toObjects(colorcsv);
                    start(gdp, life, pop, color);
                });
            });
        });
    });
});

function start(gdp, life, pop, group) {
    let $svg = $("svg"),
        width = +$svg.attr("width"),
        height = +$svg.attr("height"),
        left = 40,
        top = 20;

    let startYear = 1800,
        endYear = 2008,
        span = endYear - startYear + 1,
        threshold = 20;

    let selected: SVGCircleElement = null;
    let mouseDownEvent: MouseEvent = null;
    let isSelected: boolean = false;

    $svg
        .mouseup((evt: MouseEvent) => {
            selected = null;
            // if (evt.target === $svg[0]) {
            nations.forEach(n => {
                n.point.reemphasize();
            });
            $nationLabel.text("");
            // }
        })
        .mousemove((evt) => {
            if (selected) {
                evt.preventDefault();
                let offset = $gRoot.offset(),
                    p = new Point(evt.pageX - offset.left, evt.pageY - offset.top);
                //the index of the nearest point on the trail of the selected
                let points = map[$("title", selected).text()].point.getPoints();
                let indexDistMin = 0;
                let distMin = Infinity;
                points.forEach(function (point, index) {
                    let distTemp = p.getDistance(point);
                    if (distTemp < distMin) {
                        distMin = distTemp;
                        indexDistMin = index;
                    }
                });
                update(indexDistMin);
            }
        });

    //preprocess data
    //to map
    let map = {};
    addAttr(gdp, "", "gdp", true);
    addAttr(life, "Life expectancy at brith", "life", false);
    addAttr(pop, "Population", "pop", false);
    group.forEach(function (ob: object) {
        let name: string = ob["Entity"];
        if (map[name]) {
            map[name]["group"] = ob["Group"];
            map[name]["name"] = name;
        }
    });

    for (let name in map) {
        let nation = map[name],
            gdp = nation["gdp"],
            life = nation["life"],
            pop = nation["pop"],
            group = nation["group"];
        if (!gdp || !life || !pop || !group) { //delete nations with incomplete data
            delete map[name];
            continue;
        }
        //interpolate
        let InterpolatorGdp = new Interpolator(gdp);
        let InterpolatorLife = new Interpolator(life);
        let InterpolatorPop = new Interpolator(pop);
        for (let i = 0; i < span; i++) {
            if (isNaN(gdp[i])) {
                gdp[i] = InterpolatorGdp.interpolate(i);
            }
            if (isNaN(life[i])) {
                life[i] = InterpolatorLife.interpolate(i);
            }
            if (isNaN(pop[i])) {
                pop[i] = InterpolatorPop.interpolate(i);
            }
        }
    }
    //order: nations of large population painted beneath
    let nations: Array<Nation> = [];
    for (let name in map) {
        nations.push(map[name]);
    }
    nations.sort((a, b) => {
        return b.pop[span - 1] - a.pop[span - 1];
    });

    //produce image

    let $gRoot = create$SVGElement("g")
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
    let $nationLabel = create$SVGElement("text")
        .attr("class", "nation label")
        .attr("text-anchor", "start")
        .attr("x", 20)
        .attr("y", 80)
        .appendTo($gRoot);
    //year label
    let $gYearLabel = create$SVGElement("g").attr("transform", "translate(" + [500, 280] + ")").appendTo($gRoot);
    let scaleYear = new Scale([0, 450], [0, span], "linear");
    let $yearLabel = create$SVGElement("text")
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
                let x = evt.pageX - Math.round($(evt.target).offset().left);
                let index = Math.floor(scaleYear.cal(x));
                update(index);
            }
        })
        .appendTo($gYearLabel);

    //trails
    let $gTrail = create$SVGElement("g").appendTo($gRoot);
    let $gTrailSelected = create$SVGElement("g").appendTo($gRoot);

    //dots
    //scales
    let scaleX = new Scale([getMin("gdp"), getMax("gdp")], [0, width - left], "log"),
        scaleY = new Scale([getMin("life"), getMax("life")], [height - top, 0], "linear"),
        scaleR = new Scale([getMin("pop"), getMax("pop")], [0, 65], "sqrt");
    //colors
    let colors: Array<[string, string]> = [
        ["Sub-Saharan Africa", "blue"],
        ["South Asia", "skyblue"],
        ["Middle East & North Africa", "lightgreen"],
        ["America", "yellow"],
        ["Europe & Central Asia", "orange"],
        ["East Asia & Pacific", "red"]
    ];
    Circle.setColors(new Map(colors));

    let $gDots = create$SVGElement("g")
        .attr("class", "dots")
        .appendTo($gRoot);

    nations.forEach(nation => {
        let d = new Data(nation.name, nation.group, nation.gdp, nation.life, nation.pop),
            c = new Circle(d, scaleX, scaleY, scaleR);
        nation.point = c;

        let trail = c.getTrail();
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
                nations.forEach(n => {
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
                    nations.forEach(n => {
                        if (n !== nation)
                            n.point.deemphasize();
                    });
                    //show nation name
                    $nationLabel.text(nation.name);
                    //draw trail
                    nation.$hoverTrail.prependTo($gTrail);
                    //animate color change of trail
                    let points = c.getPoints(),
                        i = 0,
                        len = points.length;
                    nation.intervalNumber = setInterval(drawSegment, 16);
                    function drawSegment() {
                        let $trailSegment = create$SVGElement("path")
                            .attr("class", "trailSegment")
                            .attr("d", "M " + points[i].toString() + " L " + points[i + 1].toString())
                            .appendTo($gTrail);
                        if (++i >= len - 1) {
                            clearInterval(nation.intervalNumber);
                        }
                    }
                }
            })
            .mouseleave(function () {
                if (!selected) {
                    nations.forEach(n => {
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
            })
    })

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

    function addAttr(attr: Array<object>, getName: string, setName: string, isNew: boolean): void {
        attr.forEach(function (ob: object): void {
            let name: string = ob[getName];
            if (map[name] == undefined) {
                if (isNew) { map[name] = {}; }
                else return;
            }
            delete ob[getName];
            map[name][setName] = toArray(ob);
        });
    }

    function toArray(ob: object): Array<number> {
        let arr: Array<number> = [],
            count: number = 0;
        for (let attr in ob) {
            let year: number = parseInt(attr);
            if (year >= startYear && year <= endYear) {
                let value: number = parseFloat(ob[attr]);
                if (!isNaN(value)) { count++; }
                arr[year - startYear] = value;
            }
        }
        if (count >= threshold)
            return arr;
        else return null;
    }

    function getMin(attr: string): number {
        let min = Infinity;
        nations.forEach(function (nation) {
            let locMin = nation[attr].reduce((min, cur) => Math.min(min, cur), Infinity);
            if (locMin < min) {
                min = locMin;
            }
        });
        return min;
    }
    function getMax(attr: string): number {
        let max = -Infinity;
        nations.forEach(function (nation) {
            let locMax = nation[attr].reduce((max, cur) => Math.max(max, cur), -Infinity);
            if (locMax > max) {
                max = locMax;
            }
        });
        return max;
    }
}

function create$SVGElement(tag: string) {
    return $(document.createElementNS("http://www.w3.org/2000/svg", tag));
}

interface Nation {
    name: string;
    group: string;
    gdp: Array<number>;
    life: Array<number>;
    pop: Array<number>;
    point: Circle;
    $hoverTrail;
    $selectTrail;
    intervalNumber;
}

class Interpolator {
    index1: number;
    index2: number;
    indexFirst: number;
    indexLast: number;
    array: Array<number>;
    scale: Scale;
    constructor(array: Array<number>) {
        this.array = array;
        for (let index = 0; index < array.length; index++) {
            const element = array[index];
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
        this.scale = new Scale([this.index1, this.index2],
            [array[this.index1], array[this.index2]], "linear");

        for (let index = 0; index < array.length; index++) {
            const element = array[index];
            if (!isNaN(element)) {
                this.indexFirst = index;
                break;
            }
        }
        for (let index = 0; index < array.length; index++) {
            const element = array[array.length - 1 - index];
            if (!isNaN(element)) {
                this.indexLast = index;
                break;
            }
        }
    }
    interpolate(index: number): number {
        if (index > this.indexLast) {
            return this.array[this.indexLast];
        }
        if (index < this.indexFirst) {
            return this.array[this.indexFirst];
        }

        if (index > this.index2) {
            let next: number = undefined;
            for (let index = this.index2 + 1; index < this.array.length; index++) {
                const element = this.array[index];
                if (!isNaN(element)) {
                    next = index;
                    break;
                }
            }
            if (next != undefined) {
                this.index1 = this.index2;
                this.index2 = next;
            }
            this.scale = new Scale([this.index1, this.index2],
                [this.array[this.index1], this.array[this.index2]], "linear");
        }
        return this.scale.cal(index);
    }
}

class Scale {
    private static funs = {
        linear: (x: number): number => x,
        log: (x: number): number => Math.log(x),
        sqrt: (x: number): number => Math.sqrt(x)
    }
    private f: (x: number) => number;
    private k: number;
    private b: number;
    constructor(domain: Array<number>, range: Array<number>, fun: string) {
        this.f = Scale.funs[fun];
        this.k = (range[1] - range[0]) / (this.f(domain[1]) - this.f(domain[0]));
        this.b = range[1] - this.k * this.f(domain[1]);
    }
    cal(x: number): number {
        return this.k * this.f(x) + this.b;
    }
}

class Point {
    x: number;
    y: number;
    constructor(x: number, y: number) {
        this.x = x;
        this.y = y;
    }
    getDistance(p: Point): number {
        let dx = p.x - this.x,
            dy = p.y - this.y;
        return Math.sqrt(dx * dx + dy * dy);
    }
    toString(): string {
        return this.x + ", " + this.y;
    }
}

class Data {
    name: string;
    group: string;
    data: Array<Array<number>>;
    constructor(name: string, group: string, attr1: number[], attr2: number[], attr3: number[]) {
        this.name = name;
        this.group = group;
        this.data = [];
        for (let index = 0; index < attr1.length; index++) {
            this.data.push([attr1[index], attr2[index], attr3[index]])
        }
    }
}

class Circle {
    private static colors: Map<string, string>;
    private color: string;
    private points: Array<Point>;
    private radii: Array<number>;
    $circle;

    constructor(data: Data, scaleX: Scale, scaleY: Scale, scaleR: Scale) {
        this.color = Circle.colors.get(data.group);
        this.points = data.data.map(datum => new Point(scaleX.cal(datum[0]), scaleY.cal(datum[1])));
        this.radii = data.data.map(datum => scaleR.cal(datum[2]));
        this.$circle = create$SVGElement("circle").css("fill", this.color);
        create$SVGElement("title").text(data.name).appendTo(this.$circle);
    }

    static setColors(colors: Map<string, string>): void {
        this.colors = colors;
    }
    appendTo(parent) {
        this.$circle.appendTo(parent);
    }

    update(index: number) {
        let point = this.points[index],
            radius = this.radii[index];
        this.$circle
            .attr("cx", point.x)
            .attr("cy", point.y)
            .attr("r", radius < 0 ? 0 : radius);
    }
    getTrail(): string {
        let len = this.points.length;
        let path = "M " + this.points[0].toString();

        for (let i = 1; i < len; i++) {
            const point = this.points[i];
            path += "L " + point.toString();
        }
        return path;
    }
    getPoints(): Array<Point> {
        const points = this.points;//?
        return points;
    }
    deemphasize(): void {
        // this.$circle.attr("class", "notHovered");
        this.$circle[0].classList.add("notHovered");
    }
    reemphasize(): void {
        // this.$circle.attr("class", "");
        this.$circle[0].classList.remove("notHovered");
    }
}