let player

function initPlayer(timestamp) {
    const sources = Array.from(document.querySelectorAll('#player source'));
    const qualityOptions = sources.map(source => parseInt(source.getAttribute('data-quality'))).filter(Boolean);
    console.log(qualityOptions)

    player = new Plyr('#player', {
        quality: {
            default: Math.max(...qualityOptions),
            options: qualityOptions.sort((a, b) => b - a)
        },
        captions: {
            active: true,
            language: 'en'
        },
        keyboard: {
            focused: true,
            global: true
        }
    });

    player.on('enterfullscreen', event => {
        try {
            screen.orientation.lock('landscape');
        } catch {}
    });

    if (timestamp) {
        let setTimestamp = false;
        player.on('canplay', () => {
            if (!setTimestamp && player.duration - timestamp > 120) {
                player.currentTime = timestamp;
                setTimestamp = true;
                player.play()
            }
            try {
                screen.orientation.lock('landscape');
            } catch {}
        })
    };

    // Function to update the watch history on the server
    function updateWatchHistory(){
        $.ajax({
            url: '/watchhistory',
            method: 'POST',
            data: {
                url: window.location.pathname,
                timestamp: player.currentTime
            }
        });
        try {
            screen.orientation.lock('landscape');
        } catch {}
    }
    
    // Update watch history on pause and seek
    player.on('pause', updateWatchHistory);
    player.on('seek', updateWatchHistory);

    // Send watch history updates every 5 seconds while playing
    let lastUpdate = 0;
    const updateInterval = 5000;
    player.on('timeupdate', () => {
        const now = Date.now();
        if (!player.loading && now - lastUpdate >= updateInterval) {
            lastUpdate = now;
            updateWatchHistory()
        }
    });
}
