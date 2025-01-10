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
            this.settings = {...this.defaults};
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
        this.settings = {...this.defaults};
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
                    <button id="quality">Quality</button>
                    <button id="captions">${player_icons.captions}</button>
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

    const captionsUrl = "/static/subtitles/BREAKINGBAD/S01/E01.vtt"

    function showAction(icon){
        const actionElement = $(`<div class='action'>${player_icons[icon]}</div>`)
        playerElement.append(actionElement)
        setTimeout(() => {
            actionElement.remove()
        }, 1000);
    }

    // Add the video tracks
    const videoElement = $("#video-element");
    const video = videoElement.get(0);

    // Loading element
    $(video).on('waiting', function() {
        $('.loading').show();
    });
    
    $(video).on('playing', function() {
        $('.loading').hide();
    });
    
    $(video).on('canplay', function() {
        $('.loading').hide();
    });

    // Add the video source and captions track
    videoElement.append(`
        <source src='/static/E01.mp4' type="video/mp4">
        <track label="English" kind="subtitles" srclang="en" src="${captionsUrl}">
    `);
    // <track label="English" kind="subtitles" srclang="en" src="${watching_data.captions}">
    const captionsTrack = video.textTracks[0];

    // Captions controls
    function toggleCaptions(enabled = null, hideAction = false){
        if (enabled == null) {
            enabled = settings.get("captions") == false
        }

        if (enabled) {
            captionsTrack.mode = 'showing';
        } else {
            captionsTrack.mode = 'hidden';
        }
        settings.set("captions", enabled)
        if (!hideAction){
            showAction("captions")
        }
    }
    toggleCaptions(settings.get("captions"), true)
    
    playerElement.find("#captions").on("click", function(){toggleCaptions()})
    Mousetrap.bind('c', function(){toggleCaptions()})

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
    }
    video.play()
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
        playerElement.find("#time-display").text(`${formatTime(video.currentTime)} / ${formatTime(video.duration)}`)
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
    progressBar.on('mouseenter', function () {
        toggleActive(true)
    });

    progressBar.on('mouseleave', function () {
        if (!isDragging) {  // Only remove active class if not dragging
            toggleActive(false)
            updateHoverProgress(0);  // Reset hover progress
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
        }
    }

    // Keep existing hover functionality
    progressBar.mousemove(function (event) {
        if (!isDragging) {
            const percentage = calculatePercentage(event);
            updateHoverProgress(percentage);
            progressBarUserInput = percentage / 100;
        }
    });

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
    $(document).mousemove(function(event) {
        const playerBottom = playerElement.find(".player-bottom");
        const playerBottomArea = playerBottom[0];
    
        playerBottom.removeClass("hidden");
        $("body").css("cursor", "auto"); // Show cursor when moving
    
        clearTimeout(hiddenOnIdleDebounce);
    
        // If the mouse is over the player controls, do not hide the controls
        if (!playerBottomArea.contains(event.target)) {
            hiddenOnIdleDebounce = setTimeout(() => {
                playerBottom.addClass("hidden");
                $("body").css("cursor", "none"); // Hide the cursor after inactivity
            }, 2000);
        }
    });
}