let game = (function() {
    let gamePlaces;
    let compGeometry;
    let userMarker1LatLong;
    let userMarker2LatLong;
    let removeMarkers = [];
    let round = 1;
    let totalPoints = 0;
    let addPoints = 0;
    let checkingRound = false;
    let userMoved = false;
    let onPreGame = true;
    let cardBounds;
    const $cTime = $("#time");
    const $status = $("#checkmark");
    const $chance = $("#chance");
    const $state = $("#state");
    const $tap = $("#total_availablePoints");
    const $tapp = $("#percentPoints");
    const $timeS = $("#timeS");
    const $round = $("#round");
    const $toast = $(".toast");
    const $totalPoints = $("#totalPoints");
    const $retryMatch = $("#retryMatch");
    const $compRoundRouteTime = $("#compRoundRouteTime");
    const $userRoundRouteTime = $("#userRoundRouteTime");
    const $userRoundRouteDist = $("#userRoundRouteDist");
    const $curPoints = $("#curPoints");
    const $roundBox = $("#roundBox");
    const $endGame = $("#endGame");
    const $imgCard = $("#imgCard");
    const $card = $('.card')[0];
    mapboxgl.accessToken = "YOUR TOKEN";
    let timer = new easytimer.Timer();
    let map = new mapboxgl.Map({logoPosition: 'bottom-right', container: "map", style: "mapbox://styles/mapbox/navigation-day-v1", center: [7.5, 20], zoom: 1.45, minZoom: 1.45});
    let backgroundMap = new mapboxgl.Map({container: "background", style: 'mapbox://styles/mapbox/satellite-v9', projection: 'globe', center: [-40, 30], zoom: -0.00161764705 * $(document).height() + 5.276470581, interactive: false});
    map.on('load', () => {
        map.dragRotate.disable();
        map.touchZoomRotate.disableRotation();
        map.addControl(new mapboxgl.ScaleControl({unit: 'imperial'}), 'bottom-right');
        map.addControl(new mapboxgl.NavigationControl({showCompass: false}), 'bottom-right');
    });
    backgroundMap.on('load', () => {
        backgroundMap.on('moveend', () => {if (onPreGame) {spinGlobe();}});
        spinGlobe();
    });
    function spinGlobe() {
        if (onPreGame) {
            const zoom = backgroundMap.getZoom();
            let distancePerSecond = 360 / 20;
            if (zoom > 3) {const zoomDif = (5 - zoom) / (5 - 3); distancePerSecond *= zoomDif;}
            const center = backgroundMap.getCenter();
            center.lng -= distancePerSecond;
            backgroundMap.easeTo({center, duration: 1000, easing: (n) => n});
        }
    }
    function slide1() {
        $("#start button").prop('disabled', true);
        $(".slideLogo").addClass("small").attr("onclick", "location.reload()");
        $("#start").fadeOut(400, function() {
            $("#countries").fadeIn(400);
        });
    }
    function startGame() {
        $("#countries button").prop('disabled', true);
        newRound($('#countries .mainContainer div').index($('#countries .mainContainer').find('.active')));
        $("#preGame").fadeOut(400, function() {
            onPreGame = false;
            $("#gameContainer").fadeIn(400);
            map.resize();
            $toast.html("Loading first round...");
            $toast.addClass("on");
        });
    }
    function toastHide() {
        setTimeout(() => {$toast.removeClass("on");}, 2000);
    }
    function zoomToBounds(bounds, distance) {
        let promise = $.Deferred();
        $toast.html("Flying to generated route...");
        $toast.addClass("on");
        map.once("moveend", function () {
            setTimeout(function () {
                promise.resolve();
            }, 20);
        });
        map.fitBounds(bounds, {padding: 50, duration: distance * 0.0003});
        return promise;
    }
    function newRound(places) {
        $timeS.html("15");
        map.setMinZoom(1.45);
        checkingRound = false;
        userMoved = false;
        if (!gamePlaces) {gamePlaces = places;}
        $.getJSON({url: `/random/?places=${gamePlaces}`, success: (dataPoints) => {
            $.getJSON(`https://router.project-osrm.org/route/v1/driving/${dataPoints.lon1},${dataPoints.lat1};${dataPoints.lon2},${dataPoints.lat2}?overview=full&geometries=geojson`, (data) => {
                if (data.code === "NoRoute") {
                    $toast.html("Whoops! Something bad happened on our end... Please reload site to continue!");
                    $toast.addClass("on");
                } else {
                    toggleInteraction(false);
                    $toast.removeClass("on");
                    let {geometry, duration, distance} = data.routes[0];
                    let kmRoute = Math.round(distance / 1000);
                    compGeometry = geometry;
                    let bounds = new mapboxgl.LngLatBounds();
                    let start = new mapboxgl.LngLat(map.getCenter().lng, map.getCenter().lat);
                    let end = new mapboxgl.LngLat(((dataPoints.lon1 + dataPoints.lon2) / 2), ((dataPoints.lat1 + dataPoints.lat2) / 2));
                    bounds.extend([dataPoints.lon1, dataPoints.lat1]);
                    bounds.extend([dataPoints.lon2, dataPoints.lat2]);
                    zoomToBounds(bounds, start.distanceTo(end)).then(function () {
                        timer.start({countdown: true, startValues: {seconds: 15}});
                        map.setMinZoom(4.75);
                        toggleInteraction(true);
                        $toast.html("Start!");
                        toastHide();
                    });
                    let userMarker1 = new mapboxgl.Marker({draggable: true}).setLngLat([((dataPoints.lon1 + dataPoints.lon2) / 2) + 0.01, ((dataPoints.lat1 + dataPoints.lat2) / 2) + 0.01]).addTo(map);
                    let userMarker2 = new mapboxgl.Marker({draggable: true}).setLngLat([((dataPoints.lon1 + dataPoints.lon2) / 2) - 0.01, ((dataPoints.lat1 + dataPoints.lat2) / 2) - 0.01]).addTo(map);
                    removeMarkers.push(userMarker1, userMarker2);
                    userMarker1LatLong = [((dataPoints.lon1 + dataPoints.lon2) / 2) + 0.01, ((dataPoints.lat1 + dataPoints.lat2) / 2) + 0.01];
                    userMarker2LatLong = [((dataPoints.lon1 + dataPoints.lon2) / 2) - 0.01, ((dataPoints.lat1 + dataPoints.lat2) / 2) - 0.01];
                    userMarker1.on('dragend', function (e) {
                        let lngLat = e.target.getLngLat();
                        userMarker1LatLong = [lngLat.lng, lngLat.lat];
                        userMoved = true;
                    });
                    userMarker2.on('dragend', function (e) {
                        let lngLat = e.target.getLngLat();
                        userMarker2LatLong = [lngLat.lng, lngLat.lat];
                        userMoved = true;
                    });
                    let durHours = Math.floor(duration / 3600);
                    let durMinutes = Math.floor((duration % 3600) / 60);
                    if (durHours > 0) {
                        if (durMinutes !== 0) {
                            $cTime.html(durHours + " Hours and " + durMinutes + " Minutes");
                        } else {
                            $cTime.html(durHours + " Hours");
                        }
                    } else {
                        $cTime.html(durMinutes + " Minutes");
                    }
                    $status.removeClass("disabled");
                    timer.addEventListener('targetAchieved', function () {
                        $toast.html("Times over! Checking round...");
                        $toast.addClass("on");
                        userMarker1.setDraggable(false);
                        userMarker2.setDraggable(false);
                        timer.stop();
                        checkRound(true);
                    });
                }
            });
        }});
    }
    function calculateSeconds(timeString) {
        let stringArr = timeString.replace("and ", "").split(" ");
        let hours = 0;
        let minutes = 0;
        for (let i = 0; i < stringArr.length; i++) {
            if (!isNaN(stringArr[i])) {
                if (stringArr[i + 1] === "Hours") {
                    hours = stringArr[i];
                }
                if (stringArr[i + 1] === "Minutes") {
                    minutes = stringArr[i];
                }
            }
        }
        return hours * 3600 + minutes * 60;
    }
    function checkRound(isTimeOver) {
        if (!checkingRound) {
            checkingRound = true;
            timer.stop();
            if (!isTimeOver) {$toast.html("Checking round..."); $toast.addClass("on")}
            $status.addClass("disabled");
            const getNearestRoad1 = $.getJSON(`https://router.project-osrm.org/nearest/v1/driving/${userMarker1LatLong[0]},${userMarker1LatLong[1]}`);
            const getNearestRoad2 = $.getJSON(`https://router.project-osrm.org/nearest/v1/driving/${userMarker2LatLong[0]},${userMarker2LatLong[1]}`);
            Promise.all([getNearestRoad1, getNearestRoad2]).then(([dataMarker1, dataMarker2]) => {
                const nearestRoad1 = [dataMarker1.waypoints[0].location[0], dataMarker1.waypoints[0].location[1]];
                const nearestRoad2 = [dataMarker2.waypoints[0].location[0], dataMarker2.waypoints[0].location[1]];
                return $.getJSON(`https://router.project-osrm.org/route/v1/driving/${nearestRoad1[0]},${nearestRoad1[1]};${nearestRoad2[0]},${nearestRoad2[1]}?overview=full&geometries=geojson`);
            }).then((data) => {
                $status.removeClass("disabled");
                if (data.code === "NoRoute") {
                    $toast.html("No possible route... Pick another point!");
                    $toast.addClass("on");
                    timer.start({countdown: true, startValues: {seconds: 15}});
                    checkingRound = false;
                } else {
                    timer.removeEventListener('targetAchieved');
                    $toast.removeClass("on");
                    removeMarkers[0].setDraggable(false);
                    removeMarkers[1].setDraggable(false);
                    if (map.getLayer("userRoute")) map.removeLayer("userRoute");
                    if (map.getSource("userRoute")) map.removeSource("userRoute");
                    const {geometry, duration, distance} = data.routes[0];
                    map.addLayer({id: "userRoute", type: "line", source: {type: "geojson", data: {type: "Feature", properties: {}, geometry: geometry}}, layout: {"line-join": "round", "line-cap": "round"}, paint: { "line-color": "#3fb1ce", "line-width": 6, "line-opacity": 2 / 3 }});
                    userMarker1LatLong = geometry["coordinates"][0];
                    userMarker2LatLong = geometry["coordinates"][geometry["coordinates"].length - 1];
                    if (removeMarkers.length) {removeMarkers.forEach((marker) => marker.remove());removeMarkers = [];}
                    let userMarker1 = new mapboxgl.Marker({draggable: true}).setLngLat(userMarker1LatLong).addTo(map);
                    let userMarker2 = new mapboxgl.Marker({draggable: true}).setLngLat(userMarker2LatLong).addTo(map);
                    removeMarkers.push(userMarker1, userMarker2);
                    let compTime = $cTime.html();
                    $compRoundRouteTime.html(compTime);
                    let durHours = Math.floor(duration / 3600);
                    let durMinutes = Math.floor((duration % 3600) / 60);
                    if (durHours > 0) {
                        if (durMinutes !== 0) {
                            $userRoundRouteTime.html(durHours + " Hours and " + durMinutes + " Minutes");
                        } else {
                            $userRoundRouteTime.html(durHours + " Hours");
                        }
                    } else {
                        $userRoundRouteTime.html(durMinutes + " Minutes");
                    }
                    $userRoundRouteDist.html(Math.round(distance / 1000 / 1.609344));
                    $round.html(round);
                    map.addLayer({id: "compRoute", type: "line", source: {type: "geojson", data: {type: "Feature", properties: {}, geometry: compGeometry}}, layout: {"line-join": "round", "line-cap": "round"}, paint: {"line-color": "#888", "line-width": 6, "line-opacity": 2/3}});
                    let compMarker1 = new mapboxgl.Marker({"color": "#888"}).setLngLat(compGeometry["coordinates"][0]).addTo(map);
                    let compMarker2 = new mapboxgl.Marker({"color": "#888"}).setLngLat(compGeometry["coordinates"][compGeometry["coordinates"].length - 1]).addTo(map);
                    removeMarkers.push(compMarker1, compMarker2);
                    if (parseInt($chance.html()) === 2) {
                        $retryMatch.show();
                        $chance.html("1");
                    } else {
                        $chance.html("0");
                        $retryMatch.hide();
                    }
                    let calcCompTime = calculateSeconds(compTime);
                    let absTime = Math.abs(calcCompTime - duration);
                    if (absTime >= calcCompTime) {
                        addPoints = 0;
                    } else {
                        addPoints = Math.ceil((10000 * (1 - (absTime / calcCompTime))) / 10) * 10;
                    }
                    totalPoints = totalPoints + addPoints;
                    $curPoints.html(addPoints);
                    $totalPoints.html(totalPoints);
                    $tap.html(round * 10000);
                    $tapp.html(Math.round((totalPoints / (round * 10000)) * 100));
                    $roundBox.show();
                    $state.removeClass("fa-check").addClass("fa-angles-right");
                    $status.attr("onclick", "game.nextRound()");
                    map.setMinZoom(1.45);
                    round++;
                }
            }).catch((e) => {console.log(e); $status.removeClass("disabled");$toast.html("Error something bad happened :("); $toast.addClass("on"); timer.start({countdown: true, startValues: {seconds: 15}});checkingRound = false;});
        }
    }
    function toggleInteraction(mode) {
        if (!mode) {
            map.boxZoom.disable();
            map.scrollZoom.disable();
            map.dragPan.disable();
            map.keyboard.disable();
            map.doubleClickZoom.disable();
        } else {
            map.boxZoom.enable();
            map.scrollZoom.enable();
            map.dragPan.enable();
            map.keyboard.enable();
            map.doubleClickZoom.enable();
        }
    }
    function nextRound() {
        if (round > 5) {
            $endGame.show();
            const imageUrl = new URL(window.location.protocol + "//" + window.location.hostname + ":" + window.location.port + "/image/");
            imageUrl.searchParams.append("points", totalPoints);
            imageUrl.searchParams.append("country", gamePlaces);
            $.ajax({url: imageUrl.toString(), method: "GET", xhrFields: {responseType: "blob"}, success: (data) => {
                const urlCreator = window.URL || window.webkitURL;
                const imageUrl = urlCreator.createObjectURL(data);
                $imgCard.attr("src", imageUrl);
            }});
            $status.addClass("disabled");
            toggleInteraction(false);
        } else {
            $status.addClass("disabled");
            $roundBox.hide();
            $cTime.html("Loading...");
            timer.reset();
            timer.stop();
            if (map.getLayer("compRoute")) map.removeLayer("compRoute");
            if (map.getSource("compRoute")) map.removeSource("compRoute");
            if (map.getLayer("userRoute")) map.removeLayer("userRoute");
            if (map.getSource("userRoute")) map.removeSource("userRoute");
            if (removeMarkers.length) {removeMarkers.forEach((marker) => marker.remove());removeMarkers = [];}
            $state.removeClass("fa-angles-right").addClass("fa-check");
            $status.attr("onclick", "game.checkRound(false)");
            newRound(gamePlaces);
            $toast.html("Loading next round...");
            $toast.addClass("on");
        }
    }
    function rotateToMouse(e) {
        const mouseX = e.clientX;
        const mouseY = e.clientY;
        const leftX = mouseX - cardBounds.x;
        const topY = mouseY - cardBounds.y;
        const center = {x: leftX - cardBounds.width / 2, y: topY - cardBounds.height / 2}
        const distance = Math.sqrt(center.x ** 2 + center.y ** 2);
        $card.style.transform = `scale3d(1.07, 1.07, 1.07) rotate3d(${center.y / 100}, ${-center.x / 100}, 0, ${Math.log(distance) * 2}deg)`;
        $card.querySelector('.glow').style.backgroundImage = `radial-gradient(circle at ${center.x * 2 + cardBounds.width / 2}px ${center.y * 2 + cardBounds.height / 2}px, #ffffff55, #0000000f)`;
    }
    document.body.onkeyup = function(e) {
        if (e.key === " " || e.code === "Space" || e.key === "Enter" || e.code === "Enter") {
            if (!$status.hasClass("disabled")) {
                if (checkingRound) {
                    nextRound();
                } else {
                    if (userMoved) {
                        checkRound(false);
                    } else {
                        $toast.html("Have to move a point before checking!");
                        $toast.addClass("on");
                        toastHide();
                    }
                }
            } else {
                if ($("#preGame").is(":visible")) {
                    if ($("#start").is(":visible")) {
                        slide1();
                        mainTippy[0].disable();
                    } else if ($("#countries").is(":visible")) {
                        startGame();
                    }
                }
            }
        }
    };
    $card.addEventListener('mouseenter', () => {
        cardBounds = $card.getBoundingClientRect();
        document.addEventListener('mousemove', rotateToMouse);
    });
    $card.addEventListener('mouseleave', () => {
        document.removeEventListener('mousemove', rotateToMouse);
        $card.style.transform = '';
        $card.style.background = '';
    });
    timer.addEventListener('secondsUpdated', function () {
        if (timer.getTimeValues().seconds > 9) {
            $timeS.html(timer.getTimeValues().seconds);
        } else {
            $timeS.html("0" + timer.getTimeValues().seconds);
        }
    });
    return {checkRound: checkRound, nextRound: nextRound, slide1: slide1, startGame: startGame};
})();