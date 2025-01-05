function initNextEpisode(nextEpisode) {
    const nextEpisodeUrl = `/watch/${nextEpisode.title}/${nextEpisode.season}/${nextEpisode.episode}`;
    const popup = $('#next-episode-popup');
    const countdownElement = $('#countdown');
    const cancelButton = $('#cancel-btn');
    let popupDisplayed = false;
    const POPUP_THRESHOLD = 45; // Show popup when 45 seconds remain

    // Function to format time remaining (converts seconds to MM:SS)
    function formatTimeRemaining(seconds) {
        const mins = Math.floor(seconds / 60);
        const secs = Math.floor(seconds % 60);
        return `${mins}:${secs.toString().padStart(2, '0')}`;
    }

    // Function to handle the next episode transition
    function goToNextEpisode() {
        // Exit fullscreen before navigation if needed
        if (document.fullscreenElement) {
            document.exitFullscreen().then(() => {
                window.location.href = nextEpisodeUrl;
            });
        } else {
            window.location.href = nextEpisodeUrl;
        }
    }

    // Function to handle popup display and countdown
    function handlePopup(timeRemaining) {
        if (!popupDisplayed) {
            popupDisplayed = true;
            
            // If in fullscreen, append popup to the fullscreen element
            if (document.fullscreenElement) {
                const fullscreenElement = document.fullscreenElement;
                fullscreenElement.appendChild(popup[0]);
            }
            
            popup.addClass("active");
        }
        countdownElement.text(formatTimeRemaining(timeRemaining));
    }

    // Handle fullscreen changes
    function handleFullscreenChange() {
        if (document.fullscreenElement && popupDisplayed) {
            // Move popup into fullscreen element
            document.fullscreenElement.appendChild(popup[0]);
        } else if (!document.fullscreenElement && popupDisplayed) {
            // Move popup back to original container
            document.body.appendChild(popup[0]);
        }
    }

    // Add fullscreen change event listeners
    document.addEventListener('fullscreenchange', handleFullscreenChange);
    document.addEventListener('webkitfullscreenchange', handleFullscreenChange);
    document.addEventListener('mozfullscreenchange', handleFullscreenChange);
    document.addEventListener('MSFullscreenChange', handleFullscreenChange);

    // Main player event listeners
    player.on('timeupdate', () => {
        const timeRemaining = player.duration - player.currentTime;

        if (timeRemaining <= POPUP_THRESHOLD) {
            handlePopup(timeRemaining);
        }

        // If video ends naturally, go to next episode
        if (timeRemaining <= 0) {
            goToNextEpisode();
        }
    });

    // Reset handler if video is seeked
    player.on('seeked', () => {
        const timeRemaining = player.duration - player.currentTime;
        if (timeRemaining > POPUP_THRESHOLD && popupDisplayed) {
            popupDisplayed = false;
            popup.removeClass("active");
        }
    });

    // Handle manual cancel
    cancelButton.on('click', () => {
        if (document.fullscreenElement) {
            document.exitFullscreen().then(() => {
                window.location.href = '/';
            });
        } else {
            window.location.href = '/';
        }
    });

    // Handle click to play next episode
    $(".clicktoplay").on("click", goToNextEpisode);

    // Handle video end event as a backup
    player.on('ended', goToNextEpisode);

    // Cleanup function
    function cleanup() {
        document.removeEventListener('fullscreenchange', handleFullscreenChange);
        document.removeEventListener('webkitfullscreenchange', handleFullscreenChange);
        document.removeEventListener('mozfullscreenchange', handleFullscreenChange);
        document.removeEventListener('MSFullscreenChange', handleFullscreenChange);
    }

    // Return cleanup function for component unmounting
    return cleanup;
}