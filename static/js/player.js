let player

function initPlayer(timestamp) {
    const sources = Array.from(document.querySelectorAll('#player source'));
    const qualityOptions = sources.map(source => parseInt(source.getAttribute('data-quality'))).filter(Boolean);

    const castOptions = {
        receiverApplicationId: chrome.cast.media.DEFAULT_MEDIA_RECEIVER_APP_ID,
        autoJoinPolicy: chrome.cast.AutoJoinPolicy.ORIGIN_SCOPED
      };
    
    const castContext = cast.framework.CastContext.getInstance();
    castContext.setOptions(castOptions);

    const chromecastControl = {
        name: 'chromecast',
        icon: 'cast',
        title: 'Cast to Chromecast',
        click: () => {
          if (castContext.getCastState() !== chrome.cast.CastState.NO_CASTERS_AVAILABLE) {
            castContext.requestSession().then(session => {
              session.setMediaSession(new chrome.cast.media.MediaSession('Video Player'));
              const mediaInfo = new chrome.cast.media.MediaInfo(player.source, 'video/mp4');
              session.loadMedia(mediaInfo, {
                autoplay: true,
                currentTime: player.currentTime
              });
            });
          }
        }
      };      

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
        },
        controls: [
            'play-large',
            'play',
            'progress',
            'current-time',
            'duration',
            'mute',
            'volume',
            'captions',
            'settings',
            'airplay',
            'fullscreen',
          ],
    });



    castContext.addEventListener(cast.framework.CastContextEventType.SESSION_STATE_CHANGED, event => {
        console.log(event.sessionState)
        // if (event.sessionState == "SESSION_START_FAILED") {
        //   player.pause();
        // } else if (event.sessionState == chrome.cast.SessionState.SESSION_START_FAILED) {
        //   player.play();
        // }
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
        console.log('Cast State:', castContext.getCastState());

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

$(document).ready(function() {
    const player = new Plyr('#player');
    const customButton = $('<button class="plyr__control cast" type="button">Cast</button>');

    customButton.on('click', function() {
        const castContext = cast.framework.CastContext.getInstance();

        if (castContext.getCastState() !== cast.framework.CastState.NO_CASTERS_AVAILABLE) {
            castContext.requestSession().then(session => {
                const mediaInfo = new chrome.cast.media.MediaInfo(player.source, 'video/mp4');
                const request = new chrome.cast.media.LoadRequest(mediaInfo);
                session.loadMedia(request).catch(console.error);
            }).catch(console.error);
        } else {
            alert('No cast devices available.');
        }
    });

    $('.plyr__controls').append(customButton);
});