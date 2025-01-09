function formatTime(seconds) {
    const minutes = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return minutes + ':' + (secs < 10 ? '0' + secs : secs);
}

function initPlayer(tracks, title_data, timestamp, subtitles, next_episode){
    console.log(tracks, title_data, timestamp, subtitles, next_episode)

    const playerElement = $(`#video-container`)
    playerElement.html(`
        <div class="player">
            <video id="video-element" preload="metadata"></video>
            <div class="player-bottom">
                
                <div class="hover-information">
                    <div class="hover-display">
                        <img src="/static/images/frame_0000.webp"></img>
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

    // Add the video tracks
    const videoElement = $("#video-element")
    const video = videoElement.get(0)

    videoElement.append(`<source src='${"/static/E01.mp4"}' type="video/mp4">`)

    // Class framework
    const hoverInformation = playerElement.find(".hover-information")
    function toggleActive(active){
        if (active) {
            progressBar.addClass('active');
            hoverInformation.addClass('active');
        } else{
            progressBar.removeClass('active');
            hoverInformation.removeClass('active');
        }
    }

    // Play/pause
    function togglePlaying(){
        if (video.paused){
            video.play()
            $("#play").html(player_icons.pause)
        } else {
            video.pause()
            $("#play").html(player_icons.play)
        }
    }
    video.play()
    $("#play").html(player_icons.pause)
    videoElement.on("click", togglePlaying)
    playerElement.find("#play").on("click", togglePlaying)
    Mousetrap.bind('space', togglePlaying)
    Mousetrap.bind('k', togglePlaying)

    // Progress bars, seeking, buffering
    playerElement.find(".hover-display").css({"margin-left": `${100}%`})
    function updatePlayProgress(percentage = (video.currentTime/video.duration)*100){
        // playerElement.find(".play-progress").css({"width": `${percentage}%`})
        // playerElement.find(".scrubber-container").css({"margin-left": `${percentage}%`})
        playerElement.find(".scrubber-container").css({"width": `${percentage}%`})
    }

    videoElement.on('timeupdate', function(){
        if (!isDragging) {  // Only update if not currently dragging
            updatePlayProgress()
        }
        playerElement.find("#time-display").text(`${formatTime(video.currentTime)} / ${formatTime(video.duration)}`)
    });

    function updateBufferProgress(width){
        playerElement.find(".buffer-progress").css({"width": `${width}%`})
    }
    
    $(videoElement).on('progress', function () {
        if (video.buffered.length > 0) {
            const bufferedEnd = video.buffered.end(video.buffered.length - 1);
            const bufferPercent = (bufferedEnd / video.duration) * 100;
            updateBufferProgress(bufferPercent)
        }
    });

    function updateHoverProgress(width){
        playerElement.find(".hover-progress").css({"width": `${width}%`})
        
        playerElement.find(".hover-display").css({"margin-left": `min(max(0px, calc(${width}% - 100px)), calc(100% - 200px))`})
        playerElement.find("#hover-timestamp").text(formatTime((width/100)*video.duration))

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
    progressBar.on('mouseenter', function() {
        toggleActive(true)
    });

    progressBar.on('mouseleave', function() {
        if (!isDragging) {  // Only remove active class if not dragging
            toggleActive(false)
            updateHoverProgress(0);  // Reset hover progress
        }
    });

    // Start dragging from anywhere on progress bar
    progressBar.on('mousedown', function(event) {
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
    progressBar.mousemove(function(event){
        if (!isDragging) {
            const percentage = calculatePercentage(event);
            updateHoverProgress(percentage);
            progressBarUserInput = percentage / 100;
        }
    });

    // Remove separate click handler since it's now handled by mousedown
    // progressBar.click() handler removed as it's redundant

    // Keyboard controls
    function adjustCurrentTime(difference){
        video.currentTime = Math.max(Math.min(video.currentTime + difference, video.duration), 0)
        updatePlayProgress()
    }
    Mousetrap.bind('left', function(){adjustCurrentTime(-5)})
    Mousetrap.bind('right', function(){adjustCurrentTime(5)})
}