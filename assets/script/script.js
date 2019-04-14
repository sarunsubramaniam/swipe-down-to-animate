'use strict';

window.requestAnimFrame = (function() {
    return window.requestAnimationFrame ||
        window.webkitRequestAnimationFrame ||
        window.mozRequestAnimationFrame ||
        window.oRequestAnimationFrame ||
        window.msRequestAnimationFrame ||
        function(callback) {
            window.setTimeout(callback, 1000 / 60);
        };
})();

$(document).ready(function() {

    var $top = $(".application-top");
    var $body = $(".application-body");
    var $bg1 = $(".svg-bg--1");
    var $bg2 = $(".svg-bg--2");
    var $bg3 = $(".svg-bg--3");

    var $trees = [].slice.call(document.querySelectorAll(".svg-tree"));
    var $treeParts = [].slice.call(document.querySelectorAll(".svg-tree--part"));
    var $leftTrees = $(".svg-tree.pos-left");
    var $rightTrees = $(".svg-tree.pos-right");
    var $planeRotater = $(".plane-rotater");
    var $plane = $(".plane");
    var isDesktop = window.matchMedia("(min-width: 769px)").matches;
    var topH = (isDesktop) ? 186 : 246;
    var bg1change, bg2change, bg3change;
    var bg1max = (isDesktop) ? 10 : 8;
    var bg2max = (isDesktop) ? 22 : 18;
    var bg3max = (isDesktop) ? 44 : 35;
    var pullDeltaY;
    var maxPullDeltaY = (isDesktop) ? 70 : 56;
    var treesData = {};
    var treeMaxX = (isDesktop) ? 18 : 14;
    var treeMaxCoef = treeMaxX / maxPullDeltaY;
    var treeChange;
    var planeMaxDeg = -45;
    var planeMaxCoef = planeMaxDeg / maxPullDeltaY;
    var planeChange;
    var frame = 1000 / 60;

    var releaseTime = 900;
    var animating = false;
    var planeAnimTime = 3500;

    /* Easing */

    var easings = {
        elastic: function(t,b,c,d) {
            var ts = (t/=d)*t;
            var tc = ts*t;
            return b+c*(33*tc*ts + -106*ts*ts + 126*tc + -67*ts + 15*t);
        },
        elasticBig: function(t,b,c,d) {
            var ts = (t/=d)*t;
            var tc = ts*t;
            return b+c*(21*tc*ts + -150*ts*ts + 250*tc + -150*ts + 30*t);
        },
        inCubic: function(t,b,c,d) {
            var tc = (t/=d)*t*t;
            return b+c*(tc);
        }
    };


    function treeCoords() {
        var treeId, treeObj, trunkTop, leafsTop;

        $trees.forEach(function($tree) {
            treeId = $tree.getAttribute("data-id");
            treesData["tree"+treeId] = {};
            treeObj = treesData["tree"+treeId];
            treeObj.isRight = $tree.classList.contains("pos-right");
            treeObj.$treeTrunk = $tree.querySelector(".svg-tree--trunk");
            treeObj.$treeLeafs = $tree.querySelector(".svg-tree--leafs");
            treeObj.trunkInitArrD = treeObj.$treeTrunk.getAttribute("d").split(" ");
            treeObj.leafsInitArrD = treeObj.$treeLeafs.getAttribute("d").split(" ");
            trunkTop = treeObj.trunkInitArrD[2];
            leafsTop = treeObj.leafsInitArrD[3];
            treeObj.trunkInitX = +trunkTop.split(",")[0];
            treeObj.leafsInitX = +leafsTop.split(",")[0];
            treeObj.trunkInitY = +trunkTop.split(",")[1];
            treeObj.leafsInitY = +leafsTop.split(",")[1];
        });
    };

    treeCoords();


    function tiltTrees(x) {
        var treeId, treeObj, trunkArr, leafsArr, changeX;

        $trees.forEach(function($tree) {
            treeId = $tree.getAttribute("data-id");
            treeObj = treesData["tree"+treeId];
            trunkArr = treeObj.trunkInitArrD.slice();
            leafsArr = treeObj.leafsInitArrD.slice();
            changeX = (treeObj.isRight) ? x : -x;

            trunkArr[2] = (treeObj.trunkInitX + changeX/2) + "," + treeObj.trunkInitY;
            leafsArr[3] = (treeObj.leafsInitX + changeX) + "," + treeObj.leafsInitY;

            treeObj.$treeTrunk.setAttribute("d", trunkArr.join(" "));
            treeObj.$treeLeafs.setAttribute("d", leafsArr.join(" "));
        });
    };


    function moveBgs() {
        $bg1.css({"-webkit-transform": "translate3d(0,"+bg1change+"px, 0)",
            "transform": "translate3d(0,"+bg1change+"px, 0)"});
        $bg2.css({"-webkit-transform": "translate3d(0,"+bg2change+"px, 0)",
            "transform": "translate3d(0,"+bg2change+"px, 0)"});
        $bg3.css({"-webkit-transform": "translate3d(0,"+bg3change+"px, 0)",
            "transform": "translate3d(0,"+bg3change+"px, 0)"});
        $leftTrees.css({"-webkit-transform": "translate3d(0,"+bg2change+"px, 0)",
            "transform": "translate3d(0,"+bg2change+"px, 0)"});
        $rightTrees.css({"-webkit-transform": "translate3d(0,"+bg3change+"px, 0)",
            "transform": "translate3d(0,"+bg3change+"px, 0)"});
    };

    function checkMaxBgValues() {
        if (bg1change > bg1max) bg1change = bg1max;
        if (bg2change > bg2max) bg2change = bg2max;
        if (bg3change > bg3max) bg3change = bg3max;
    };

    function applyChanges(topY) {
        $top.css("height", topH + topY + "px");
        moveBgs();
        tiltTrees(treeChange);
        $planeRotater.css({"-webkit-transform": "rotate("+planeChange+"deg)",
            "transform": "rotate("+planeChange+"deg)"});
    };

    function pullChange(y) {
        if (y < 0) y = 0;
        if (y > maxPullDeltaY) y = maxPullDeltaY;
        bg1change = bg2change = bg3change = y;
        checkMaxBgValues();
        treeChange = y * treeMaxCoef;
        planeChange = y * planeMaxCoef;

        applyChanges(y);
    };

    function releaseChange(props) {
        bg1change = bg2change = bg3change = props.bgY;
        checkMaxBgValues();
        treeChange = props.treeVal * treeMaxCoef;
        planeChange = props.planeDeg * planeMaxCoef;

        applyChanges(props.topY);
    };

    function release() {
        var steps = Math.floor(releaseTime / frame);
        var curStep = 0;
        var topY, bgY, treeVal, planeDeg;
        var y = pullDeltaY;
        if (y > maxPullDeltaY) y = maxPullDeltaY;
        var releasePlane = y >= maxPullDeltaY/2;
        animating = true;
        if (releasePlane) {
            $plane.addClass("fly");
            setTimeout(function() {
                animating = false;
                $plane.removeClass("fly");
            }, planeAnimTime);
        }

        function animate() {
            curStep++;
            topY = easings.elastic(curStep, y, 0 - y, steps);
            bgY = easings.elastic(curStep, y, 0 - y, steps);
            treeVal = easings.elasticBig(curStep, y, 0 - y, steps);
            planeDeg = easings.inCubic(curStep, y, 0 - y, steps);

            releaseChange({topY: topY, bgY: bgY, treeVal: treeVal, planeDeg: planeDeg});

            if (curStep > steps) {
                pullDeltaY = 0;
                if (!releasePlane) animating = false;
                return;
            }
            requestAnimFrame(animate);
        }
        animate();
    };

    $(document).on("mousedown touchstart", ".application-body", function(e) {
        if (animating) return;
        var startY =  e.pageY || e.originalEvent.touches[0].pageY;

        $(document).on("mousemove touchmove", function(e) {
            var y = e.pageY || e.originalEvent.touches[0].pageY;
            pullDeltaY = (y - startY) / 1.5;
            if (!pullDeltaY) return;
            pullChange(pullDeltaY);
        });

        $(document).on("mouseup touchend", function() {
            $(document).off("mousemove touchmove mouseup touchend");
            if (!pullDeltaY) return;
            release();
        });
    });

    function debounce(func, wait, immediate) {
        var timeout;
        return function() {
            var context = this, args = arguments;
            var later = function() {
                timeout = null;
                if (!immediate) func.apply(context, args);
            };
            var callNow = immediate && !timeout;
            clearTimeout(timeout);
            timeout = setTimeout(later, wait);
            if (callNow) func.apply(context, args);
        };
    };

    var resizeFn = debounce(function() {
        isDesktop = window.matchMedia("(min-width: 769px)").matches;
        topH = (isDesktop) ? 186 : 246;
        bg1max = (isDesktop) ? 10 : 8;
        bg2max = (isDesktop) ? 22 : 18;
        bg3max = (isDesktop) ? 44 : 35;
        maxPullDeltaY = (isDesktop) ? 70 : 56;
        treeMaxX = (isDesktop) ? 18 : 14;
    }, 100);

    $(window).on("resize", resizeFn);

});
