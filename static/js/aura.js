let timeoutId

$(document).ready(function () {
    const aura = $("#aura")

    $(document).mousemove(function (e) {
        // values: e.clientX, e.clientY, e.pageX, e.pageY
        console.log(e.clientX, e.clientY)
        aura.css({"left": `calc(${e.clientX}px - 25vw)`, "top": `calc(${e.clientY}px - 25vw)`})
        aura.removeClass("inactive")

        if (timeoutId) {
            clearTimeout(timeoutId)
        }

        timeoutId = setTimeout(() => {
            aura.addClass("inactive")
        }, 1000);
    });
});