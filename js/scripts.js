$(window).scroll(function () {
    if ($(document).scrollTop() > 50) {
        $('.nav').addClass('affix');
        $('.nav div.logo a').css("color", "#ababab");
        $('.nav div.main_list ul li a').css("color", "#ababab");
    } else {
        $('.nav').removeClass('affix');
        $('.nav div.logo a').css("color", "black");
        $('.nav div.main_list ul li a').css("color", "black");

    }
});

$('.navTrigger').click(function () {
    $(this).toggleClass('active');
    console.log("Clicked menu");
    $("#mainListDiv").toggleClass("show_list");
    $("#mainListDiv").fadeIn();
    $('.nav div.main_list ul li a').css("color", "#ababab");

});

textSequence(0);

function textSequence(i) {
    var example = ['Curious', 'Easy-going', 'Honest', 'Industrial Engineer'];
    if (example.length > i) {
        setTimeout(function () {
            document.getElementById("sequence").innerHTML = example[i];
            textSequence(++i);
        }, 1500); // 1 second (in milliseconds)

    } else if (example.length == i) { // Loop
        textSequence(0);
    }
};

var scroll = new SmoothScroll('a[href*="#"]', {
    speed: 800
});