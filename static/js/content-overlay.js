function showContentOverlay(titleData){
    const contentOverlay = $("#content-overlay")
    contentOverlay.empty()
    
    contentOverlay.html(`
        <div class="organiser">
        
        <div class="left">
        <div class="img header" style="--background-image: url('${titleData.metadata.backdrop}')"></div>
        
        <div class="title-wrapper">
        
        <img src="${titleData.metadata.logo}" alt=${titleData.metadata.name} draggable="false"></img>
        <p>${titleData.metadata.rating.toFixed(1)}⭐</p>

        </div>

        <p>${titleData.metadata.description}</p>

        </div>

        <div class="right"></div>


        </div>
        `)

    const closeButton = $("<button class='close'><p>&times;</p></button>")
    contentOverlay.append(closeButton)

    const right = contentOverlay.find(".right")
    
    const episodesContainer = $("<div class='episodes-container'></div>")

    function updateSeason(season, episodes, seasonNavigation) {
        // show which season is active
        for (let button of seasonNavigation.find("button")) {
            button = $(button)
            if (button.attr("id") == season) {
                button.addClass("active")
            } else {
                button.removeClass("active")
            }
        }

        // update the episodes that are displayed
        episodesContainer.empty()

        for (let episode of episodes) {
            const description = episode.description.length > 200 ? episode.description.substring(0, 200) + '...' : episode.description;
            const episodeNumber = episode.episode_number
            const seasonString = String(season).padStart(2, '0')
            const episodeString = String(episode.episode_number).padStart(2, '0')
            function onClick(){
                window.location.href = `/watch/${titleData.data._id}/s${seasonString}/e${episodeString}`
            }
            const episodeElement = $(`<div class='episode'>
                <p class="number">#${episodeNumber}</p>
                <div class='img' style='--background-image: url("${episode.image}")'><div class='play-wrapper'>${playHTML}</div></div>
                <div class='info'>
                <p class='title'>${episode.name} <b class="rating">${episode.rating.toFixed(1)} ⭐  ${episode.time.s}</b></p>
                <p class='description'>${description}</p>
                </div>
                </div>`)
            
            episodesContainer.append(episodeElement)
            
            const watchData = watchHistory[`${titleData.data._id}_S${seasonString}_E${episodeString}`]
            if (watchData) {
                console.log(watchData)
                episodeElement.find(".img").append(`<div class="progress-bar">
                <div class="progress" style="width: ${(((parseInt(watchData.timestamp)/60)/episode.time.m)+.1)*100}%"></div>
            </div>`)
            }

            episodeElement.on("click", onClick)
        }
    }

    if (titleData.metadata.type == "movie") {
        right.append(`<a class='play-main' href='/watch/${titleData.data._id}'>PLAY⠀${playHTML}</a>`)
        contentOverlay.find(".title-wrapper").append(titleData.metadata.time.s)
    } else {
        const title_continue_watching = continueWatching[titleData.data._id] || {id: titleData.data._id, season: 'S01', episode: 'E01'}
        right.append(`<a class='play-main' href='/watch/${title_continue_watching.id}/${title_continue_watching.season.toLowerCase()}/${title_continue_watching.episode.toLowerCase()}'>PLAY ${title_continue_watching.season} ${title_continue_watching.episode}⠀${playHTML}</a>`)
        const seasonNavigation = $("<div class='season-nav'></div>")
        right.append(seasonNavigation)
        right.append(episodesContainer)
        Object.entries(titleData.seasons).forEach(([season, episodes]) => {
            const seasonButton = $(`<button id="${season}">Season ${season}</button>`)
            seasonNavigation.append(seasonButton)
            if (season == "1") {
                updateSeason(season, episodes, seasonNavigation)
            }
            seasonButton.on("click", function(){
                updateSeason(season, episodes, seasonNavigation)
            })
          });
    }

    function close(){
        $(".content-overlay-wrapper").removeClass("active")
        $(".content-overlay-wrapper").addClass("nooverflow")
        $(".content-overlay").addClass("nooverflow")
        setTimeout(() => {
            $(".content-overlay-wrapper").addClass("displaynone")
            $("body").removeClass("nooverflow")
            $(".content-overlay-wrapper").removeClass("nooverflow")
            $(".content-overlay").removeClass("nooverflow")
        }, 0);
    }
    
    closeButton.on("click", close)
    $('.content-overlay-wrapper').on('click', function(event) {
        if (!$(event.target).closest('.content-overlay').length) {
            close()
        }
    });

    $(document).on('keydown', function(event) {
        if (event.key === "Escape" || event.keyCode === 27) {
            close()
        }
    });

    $(".content-overlay-wrapper").addClass("active")
    $(".content-overlay-wrapper").removeClass("displaynone")
    $("body").addClass("nooverflow")
    setTimeout(() => {
        
    }, 100);
}

function initTitle(element, titleData){
    element = $(element)
    element.on("click", function(){
        showContentOverlay(titleData)
    })
}















const playHTML = `<svg xmlns="http://www.w3.org/2000/svg" class='play' width="800px" height="800px" viewBox="0 0 24 24" fill="none">
<path d="M21.4086 9.35258C23.5305 10.5065 23.5305 13.4935 21.4086 14.6474L8.59662 21.6145C6.53435 22.736 4 21.2763 4 18.9671L4 5.0329C4 2.72368 6.53435 1.26402 8.59661 2.38548L21.4086 9.35258Z" fill="#1C274C"/>
</svg>`