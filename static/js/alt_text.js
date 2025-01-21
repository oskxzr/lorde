$(document).ready(function(){
    console.log("erm")
    $('.alt').each(function() {
        console.log($(this))
    });
    Array.from(document.getElementsByClassName("alt")).forEach(function(element) {
        console.log(element)
    });    
})