//NavBar

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
    $("#mainListDiv").toggleClass("show_list");
    $("#mainListDiv").fadeIn();
    $('.nav div.main_list ul li a').css("color", "#ababab");
    $('.nav div.logo a').css("color", "#ababab");
    if ($(document).scrollTop() < 50) {
        $('.nav').removeClass('affix');
        $('.nav div.logo a').css("color", "black");
        $('.nav div.main_list ul li a').css("color", "#ababab");
    } else {
        $('.nav').addClass('affix');
        $('.nav div.logo a').css("color", "#ababab");
        $('.nav div.main_list ul li a').css("color", "#ababab");
    }
});

$('.navlinks').click(function () {
    $(".navTrigger").toggleClass('active');
    $("#mainListDiv").toggleClass("show_list");
    $("#mainListDiv").fadeIn();
});


//Home Changing Text (I am)

function shuffle(array) {
    var currentIndex = array.length,
        temporaryValue, randomIndex;

    // While there remain elements to shuffle...
    while (0 !== currentIndex) {

        // Pick a remaining element...
        randomIndex = Math.floor(Math.random() * currentIndex);
        currentIndex -= 1;

        // And swap it with the current element.
        temporaryValue = array[currentIndex];
        array[currentIndex] = array[randomIndex];
        array[randomIndex] = temporaryValue;
    }

    return array;
}

textSequence(0);

function textSequence(i) {
    var example = ['Curious', 'Honest', 'Industrial Engineer', 'Proactive', 'Data driven', 'Professional', 'Patient', 'Consistent', 'Reliable', 'Innovative', 'Resourceful', 'Commited', 'Respectful', 'Confident', 'Analytical', 'Observant', 'Passionate', 'Organised', 'Perceptive'];
    example = shuffle(example)
    if (example.length > i) {
        setTimeout(function () {
            document.getElementById("sequence").innerHTML = example[i];
            textSequence(++i);
        }, 1500); // 1 second (in milliseconds)

    } else if (example.length == i) { // Loop
        textSequence(0);
    }
};


//Smooth Scroll
var scroll = new SmoothScroll('a[href*="#"]', {
    speed: 800,
    speedAsDuration: true,
    easing: 'easeOutQuad',
    updateURL: false,


});


//Loader
$(window).on("load", function () {
    $(".loader-wrapper").fadeOut("slow");
});

//Skill selector
$('#sp').click(function () {
    $(".l-skills").css("display", "none");
    $(".s-skills").css("display", "none");
    $(".t-skills").css("display", "none");
    $(".p-skills").fadeIn(1000)
});
$('#sl').click(function () {
    $(".p-skills").css("display", "none");
    $(".s-skills").css("display", "none");
    $(".t-skills").css("display", "none");
    $(".l-skills").fadeIn(1000)
});
$('#ss').click(function () {
    $(".l-skills").css("display", "none");
    $(".p-skills").css("display", "none");
    $(".t-skills").css("display", "none");
    $(".s-skills").fadeIn(1000)
});
$('#st').click(function () {
    $(".l-skills").css("display", "none");
    $(".s-skills").css("display", "none");
    $(".p-skills").css("display", "none");
    $(".t-skills").fadeIn(1000)
});


//Add to languages
$("#eng-item").hover(function () {
    $("#eng-list").append('<li>CAE certified</li><li>Stays abroad since 8 years old (Ireland, UK and USA)</li>');
}, function () {
    $("#eng-list").empty();
    $("#eng-list").append('<li>Level C2</li>');
});

$("#fra-item").hover(function () {
    $("#fra-list").append('<li>Practiced for 5 years</li>');
}, function () {
    $("#fra-list").empty();
    $("#fra-list").append(' <li>Level B2</li>');
});