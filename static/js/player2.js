function formatTime(seconds) {
    const minutes = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return minutes + ':' + (secs < 10 ? '0' + secs : secs);
}

class Settings {
    constructor(settingsConfig) {
        this.storageKey = 'playerSettings';
        this.settings = {};
        this.defaults = settingsConfig;

        // Initialize settings
        this.load();
    }

    load() {
        const stored = localStorage.getItem(this.storageKey);
        if (stored) {
            this.settings = JSON.parse(stored);
        } else {
            // Use defaults if no stored settings exist
            this.settings = { ...this.defaults };
            this.save();
        }
    }

    save() {
        localStorage.setItem(this.storageKey, JSON.stringify(this.settings));
    }

    get(key) {
        return this.settings[key] ?? this.defaults[key];
    }

    set(key, value) {
        this.settings[key] = value;
        this.save();
    }

    reset() {
        this.settings = { ...this.defaults };
        this.save();
    }
}

function initPlayer(tracks, title_data, timestamp, watching_data, next_episode) {
    console.log(tracks, title_data, timestamp, watching_data, next_episode)
    console.log("///////////////")

    // Initialise the keyframes data
    let keyframesEnabled = false
    let keyframeData
    let currentKeyframe
    if (watching_data.keyframes && watching_data.keyframe_data && watching_data.keyframe_data.frames) {
        keyframesEnabled = true
        keyframeData = watching_data.keyframe_data.frames

        for (let keyframe of watching_data.keyframe_data.frames) {
            const img = new Image();
            img.src = `${watching_data.keyframes}?type=${keyframe.filename}`;
        }
    }
    const findClosestTimestamp = (target) => {
        return keyframeData.reduce((closest, current) => {
            return Math.abs(current.timestamp - target) < Math.abs(closest.timestamp - target)
                ? current
                : closest;
        });
    };

    // Create the player element
    const playerElement = $(`#video-container`)
    playerElement.html(`
        <div class="player">
            <div class='loading'>${player_icons.loading} ${player_icons.loading}</div>
            <video id="video-element" preload="metadata"></video>
            <div class="player-top">
                <div class="back-arrow">${player_icons.back_arrow}</div>
                <div class="title-information"><p class="title"></p><p class="subtitle"></p></div>
            </div>

            <div class="player-bottom">
                
                <div class="hover-information">
                    <div class="hover-display">
                        <div class="keyframe-holder"></div>
                        <p id="hover-timestamp"></p>
                    </div>
                </div>
                <div class="progress-bar">
                    <div class="buffer-progress"></div>
                    <div class="hover-progress"></div>
                    <div class="scrubber-container"><div class="scrubber"></div></div>
                </div>
                
                <div class="left">
                    <button id="play">${player_icons.play}</button>
                    <button id="episodes">${player_icons.episodes}</button>
                    <span id="time-display">00:00 / 00:00</span>
                </div>

                <div class="right">
                    <div class="speed">
                        <input type="range" id="speedSlider" min="0.5" max="2" step="0.1" value="1">
                        <span id="speedValue">1.0x</span>
                    </div>
                    <button id="captions">${player_icons.subtitles_on}</button>
                    <button id="settings">${player_icons.settings}</button>
                    <button id="fullscreen">${player_icons.fullscreen}</button>
                </div>

            </div>
        </div>
        `)

    const settings = new Settings({
        captions: false,
        volume: 1,
        speed: 1,
    });

    function showAction(icon) {
        const actionElement = $(`<div class='action'>${player_icons[icon]}</div>`)
        playerElement.append(actionElement)
        setTimeout(() => {
            actionElement.remove()
        }, 1000);
    }

    // Add information to the player top, and define title related data. also do episodes while we're at it
    const playerTop = playerElement.find(".player-top")
    playerTop.on("click",function(){window.location.href="/"})
    const topTitle = playerTop.find(".title")
    const topSubtitle = playerTop.find(".subtitle")
    let seasonData
    let episodeData
    if (watching_data.season) { // it is a series
        seasonData = title_data.seasons[parseInt(watching_data.season.slice(1))]
        episodeData = seasonData[parseInt(watching_data.episode.slice(1)) - 1]
        topTitle.text(`${episodeData.name}`)
        topSubtitle.text(`${title_data.data.name} (${watching_data.season} ${watching_data.episode})`)
    } else { // not a series
        topTitle.text(`${title_data.data.name}`)
    }
    // If it is a series, create and populate an episodes modal
    if (seasonData) {
        var episodeModal = $(`<div class='episode-modal container noglow hidden'></div>`)
        for (let episodeNumber in seasonData) {
            const episode = seasonData[episodeNumber]
            episodeNumber = parseInt(episodeNumber)
            episodeNumber += 1
            console.log(episode)
            const episodeElement = $(`<div class='episode'>
                <p class='episode-number'>#${episodeNumber}</p>
                <div class='img' style='--background-image: url("${episode.image}")'><div class='hover'>${player_icons.play}</div></div>
                <div class='metadata'>
                <p class='title'>${episode.name}</p>
                <p class='description'>${episode.description}</p>
                </div>
                
                </div>`)
            episodeElement.on("click", function(){
                window.location.href = `/watch/${watching_data.title.toLowerCase()}/${watching_data.season}/E${episodeNumber.toString().padStart(2, '0')}`
            })
            episodeModal.append(episodeElement)
        }
        playerElement.append(episodeModal)


        let hovertimeout;

        // Function to show the modal
        function showModal() {
            clearTimeout(hovertimeout);
            if (!episodeModal.hasClass("active")) {
                episodeModal.removeClass("hidden");
                setTimeout(() => {
                    episodeModal.addClass("active");
                }, 100);
            }
        }
        
        // Function to hide the modal
        function hideModal() {
            clearTimeout(hovertimeout);
            hovertimeout = setTimeout(() => {
                if (episodeModal.hasClass("active")) {
                    episodeModal.removeClass("active");
                    // Delay adding the "hidden" class only after confirming no re-hover
                    hovertimeout = setTimeout(() => {
                        if (!episodeModal.hasClass("active")) {
                            episodeModal.addClass("hidden");
                        }
                    }, 500);
                }
            }, 500);
        }
        
        // Attach hover event handlers
        $("#episodes").on("mouseenter", showModal);
        $("#episodes").on("mouseleave", hideModal);
        episodeModal.on("mouseenter", showModal);
        episodeModal.on("mouseleave", hideModal);
        
    }

    // Add the video tracks
    const videoElement = $("#video-element");
    const video = videoElement.get(0);

    // Loading element
    $(video).on('waiting', function () {
        $('.loading').show();
    });

    $(video).on('playing', function () {
        $('.loading').hide();
    });

    $(video).on('canplay', function () {
        $('.loading').hide();
    });

    // Add the video source and captions track
    let tracks_elements = ""
    for (let track of tracks) {
        tracks_elements += `<source src='${track.src}' type="video/mp4">`
    }

    const captionsUrl = watching_data.captions
    console.log(captionsUrl)
    videoElement.append(`
        ${tracks_elements}
        <track label="English" kind="subtitles" srclang="en" src="${captionsUrl}">
    `);
    // <track label="English" kind="subtitles" srclang="en" src="${watching_data.captions}">
    const captionsTrack = video.textTracks[0];

    // Speed controls
    const speedSlider = $("#speedSlider")
    function updateSpeed(){
        const newSpeed = speedSlider.val()
        video.playbackRate = newSpeed
        settings.set("speed", newSpeed)
        $("#speedValue").text(`${parseFloat(newSpeed).toFixed(2)}x speed`)
    }

    speedSlider.on('input change', updateSpeed);
    speedSlider.val(settings.get("speed"))
    updateSpeed()

    // Captions controls
    function toggleCaptions(enabled = null, hideAction = false) {
        if (enabled == null) {
            enabled = settings.get("captions") == false
        }

        if (enabled) {
            captionsTrack.mode = 'showing';
            $("#captions").html(player_icons.subtitles_on)

            if (!hideAction) {
                showAction("subtitles_on")
            }
        } else {
            captionsTrack.mode = 'hidden';
            $("#captions").html(player_icons.subtitles_off)

            if (!hideAction) {
                showAction("subtitles_off")
            }
        }
        settings.set("captions", enabled)
    }
    toggleCaptions(settings.get("captions"), true)

    playerElement.find("#captions").on("click", function () { toggleCaptions() })
    Mousetrap.bind('c', function () { toggleCaptions() })
    
    // Timestamp and watch history
    function updateWatchHistory(){
        $.ajax({
            url: '/watchhistory',
            method: 'POST',
            data: {
                url: window.location.pathname,
                timestamp: video.currentTime
            }
        });
    }
    
    let lastUpdate = 0;
    const updateInterval = 5000;
    videoElement.on('timeupdate', () => {
        const now = Date.now();
        if (!video.loading && now - lastUpdate >= updateInterval) {
            lastUpdate = now;
            updateWatchHistory()
        }
    });

    let hasPlayerInit = false
    videoElement.bind("canplay", function(){
        if (hasPlayerInit) {return}
        hasPlayerInit = true

        if (timestamp && video.duration - timestamp > 120) {
            video.currentTime = timestamp
        }
        video.play()
    })

    // Fullscreen
    function toggleFullscreen(e) {
        if (e && e.preventDefault) {
            e.preventDefault();
        }

        var elem = playerElement.get(0)

        function enterFullscreen() {
            if (elem.requestFullscreen) {
                elem.requestFullscreen();
            } else if (elem.webkitRequestFullscreen) {
                elem.webkitRequestFullscreen();
            } else if (elem.msRequestFullscreen) {
                elem.msRequestFullscreen();
            } else if (elem.mozRequestFullScreen) {
                elem.mozRequestFullScreen();
            }
        }

        function exitFullscreen() {
            if (document.exitFullscreen) {
                document.exitFullscreen();
            } else if (document.webkitExitFullscreen) {
                document.webkitExitFullscreen();
            } else if (document.msExitFullscreen) {
                document.msExitFullscreen();
            } else if (document.mozCancelFullScreen) {
                document.mozCancelFullScreen();
            }
        }

        if (!document.fullscreenElement &&
            !document.webkitFullscreenElement &&
            !document.msFullscreenElement &&
            !document.mozFullScreenElement) {
            console.log("Attempting to go fullscreen");
            enterFullscreen();
            $("#fullscreen").html(player_icons.fullscreen_exit);
            showAction("fullscreen");
        } else {
            console.log("Attempting to exit fullscreen");
            exitFullscreen();
            $("#fullscreen").html(player_icons.fullscreen);
            showAction("fullscreen_exit");
        }
    }

    // Bind click event
    $("#fullscreen").on("click", function (e) {
        toggleFullscreen(e);
    });

    // Bind keyboard shortcuts using Mousetrap
    Mousetrap.bind('f', function (e) {
        toggleFullscreen(e);
    });

    // 'Escape' should only exit fullscreen
    Mousetrap.bind('escape', function (e) {
        if (document.fullscreenElement || document.webkitFullscreenElement || document.msFullscreenElement || document.mozFullScreenElement) {
            toggleFullscreen(e);
        }
    });


    // Class framework
    const hoverInformation = playerElement.find(".hover-information")
    function toggleActive(active) {
        if (active) {
            progressBar.addClass('active');
            hoverInformation.addClass('active');
        } else {
            progressBar.removeClass('active');
            hoverInformation.removeClass('active');
        }
    }

    // Play/pause
    function togglePlaying() {
        if (video.paused) {
            video.play()
            $("#play").html(player_icons.pause)
            showAction("play")
        } else {
            video.pause()
            $("#play").html(player_icons.play)
            showAction("pause")
        }
        updateWatchHistory()
    }
    $("#play").html(player_icons.pause)
    videoElement.on("click", togglePlaying)
    playerElement.find("#play").on("click", togglePlaying)
    Mousetrap.bind('space', togglePlaying)
    Mousetrap.bind('k', togglePlaying)

    // Progress bars, seeking, buffering
    playerElement.find(".hover-display").css({ "margin-left": `${100}%` })
    function updatePlayProgress(percentage = (video.currentTime / video.duration) * 100) {
        // playerElement.find(".play-progress").css({"width": `${percentage}%`})
        // playerElement.find(".scrubber-container").css({"margin-left": `${percentage}%`})
        playerElement.find(".scrubber-container").css({ "width": `${percentage}%` })
    }

    videoElement.on('timeupdate', function () {
        if (!isDragging) {  // Only update if not currently dragging
            updatePlayProgress()
        }
        const duration = isNaN(video.duration) ? 0 : video.duration
        playerElement.find("#time-display").text(`${formatTime(video.currentTime)} / ${formatTime(duration)}`)
    });

    function updateBufferProgress(width) {
        playerElement.find(".buffer-progress").css({ "width": `${width}%` })
    }

    $(videoElement).on('progress', function () {
        if (video.buffered.length > 0) {
            const bufferedEnd = video.buffered.end(video.buffered.length - 1);
            const bufferPercent = (bufferedEnd / video.duration) * 100;
            updateBufferProgress(bufferPercent)
        }
    });

    let lastUpdateTime = 0;
    let lastMousePosition;

    function updateHoverProgress(width) {
        const currentTimestamp = (width / 100) * video.duration;
        const now = Date.now();

        playerElement.find(".hover-progress").css({ "width": `${width}%` });
        playerElement.find(".hover-display").css({ "margin-left": `min(max(0px, calc(${width}% - 100px)), calc(100% - 200px))` });
        playerElement.find("#hover-timestamp").text(formatTime(currentTimestamp));

        if (lastMousePosition === width && now - lastUpdateTime < 300) {
            return;
        }

        lastMousePosition = width;

        if (now - lastUpdateTime >= 300) {
            lastUpdateTime = now;

            if (keyframesEnabled) {
                const closestTimestamp = findClosestTimestamp(currentTimestamp);
                if (closestTimestamp) {
                    const newKeyframeElement = $(`<img src="${watching_data.keyframes}?type=${closestTimestamp.filename}"></img>`);
                    if (currentKeyframe != newKeyframeElement.attr("src")) {
                        currentKeyframe = newKeyframeElement.attr("src");
                        const keyframeHolder = playerElement.find(".keyframe-holder");

                        keyframeHolder.append(newKeyframeElement);

                        setTimeout(() => {
                            newKeyframeElement.addClass("active");

                            keyframeHolder.children().not(newKeyframeElement).each(function () {
                                setTimeout(() => {
                                    $(this).remove();
                                }, 300);
                            });
                        }, 100);
                    } else {
                        newKeyframeElement.remove();
                    }
                }
            }
        }
    }


    // Scrubber dragging functionality
    let isDragging = false;
    let progressBarUserInput = 0;
    const progressBar = playerElement.find(".progress-bar");
    const scrubber = playerElement.find(".scrubber-container");

    // Calculate percentage based on mouse position
    function calculatePercentage(event) {
        const elementOffset = progressBar.offset();
        const elementWidth = progressBar.width();
        const mouseX = event.pageX;
        let relativeX = mouseX - elementOffset.left;
        relativeX = Math.max(0, Math.min(elementWidth, relativeX));
        return (relativeX / elementWidth) * 100;
    }

    // Add active state on hover
    let progressBarBounds = progressBar[0].getBoundingClientRect();

    $(window).on('resize', () => {
        progressBarBounds = progressBar[0].getBoundingClientRect();
    });

    $(document).on('mousemove', function (event) {
        const mouseX = event.clientX;
        const mouseY = event.clientY;

        const withinVerticalRange =
            mouseY >= progressBarBounds.top - 10 &&
            mouseY <= progressBarBounds.bottom + 10;
        const withinHorizontalRange =
            mouseX >= progressBarBounds.left &&
            mouseX <= progressBarBounds.right;

        if (withinVerticalRange && withinHorizontalRange) {
            toggleActive(true);

            if (!isDragging) {
                const percentage = calculatePercentage(event);
                updateHoverProgress(percentage);
                progressBarUserInput = percentage / 100;
            }
        } else if (!isDragging) {
            toggleActive(false);
            updateHoverProgress(0);
        }
    });

    progressBar.on('mouseenter', function () {
        toggleActive(true);
    });

    progressBar.on('mouseleave', function () {
        if (!isDragging) {
            toggleActive(false);
            updateHoverProgress(0);
        }
    });



    // Start dragging from anywhere on progress bar
    progressBar.on('mousedown', function (event) {
        isDragging = true;
        toggleActive(true)
        video.pause(); // Optional: pause while dragging

        // Immediately update position to where user clicked
        const percentage = calculatePercentage(event);
        progressBarUserInput = percentage / 100;
        updatePlayProgress(percentage);
        updateHoverProgress(percentage);

        $(document).on('mousemove.scrubber', handleDrag);
        $(document).on('mouseup.scrubber', stopDragging);
        event.preventDefault(); // Prevent text selection
    });

    // Handle drag
    function handleDrag(event) {
        if (isDragging) {
            const percentage = calculatePercentage(event);
            progressBarUserInput = percentage / 100;
            updatePlayProgress(percentage);
            updateHoverProgress(percentage);
        }
    }

    // Stop dragging
    function stopDragging() {
        if (isDragging) {
            isDragging = false;
            toggleActive(false)
            video.currentTime = video.duration * progressBarUserInput;
            video.play(); // Optional: resume playback
            $(document).off('mousemove.scrubber');
            $(document).off('mouseup.scrubber');
            updateWatchHistory()
        }
    }

    // Keyboard controls
    function adjustCurrentTime(difference) {
        video.currentTime = Math.max(Math.min(video.currentTime + difference, video.duration), 0)
        updatePlayProgress()
        if (difference > 0) {
            showAction("forward")
        } else {
            showAction("backward")
        }
    }
    Mousetrap.bind('left', function () { adjustCurrentTime(-5) })
    Mousetrap.bind('right', function () { adjustCurrentTime(5) })

    // Hide the player if the mouse isn't moving
    let hiddenOnIdleDebounce;
    $(document).mousemove(function (event) {
        const playerBottom = playerElement.find(".player-bottom");
        const playerBottomArea = playerBottom[0];

        playerBottom.removeClass("hidden");
        playerTop.removeClass("hidden");
        $("body").css("cursor", "auto"); // Show cursor when moving

        clearTimeout(hiddenOnIdleDebounce);

        // If the mouse is over the player controls, do not hide the controls
        if (!playerBottomArea.contains(event.target)) {
            hiddenOnIdleDebounce = setTimeout(() => {
                playerBottom.addClass("hidden");
                playerTop.addClass("hidden");
                $("body").css("cursor", "none"); // Hide the cursor after inactivity
            }, 3000);
        }
    });
}