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
    console.log("Clicked option");
    $(".navTrigger").toggleClass('active');
    $("#mainListDiv").toggleClass("show_list");
    $("#mainListDiv").fadeIn();
});

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



textSequence2(0);

function textSequence2(i) {
    var example2 = ['Soon.  ', 'Soon.. ', 'Soon...', 'Soon   '];
    if (example2.length > i) {
        setTimeout(function () {
            document.getElementById("sequence2").innerHTML = example2[i];
            textSequence2(++i);
        }, 500); // 1 second (in milliseconds)

    } else if (example2.length == i) { // Loop
        textSequence2(0);
    }
};

var scroll = new SmoothScroll('a[href*="#"]', {
    speed: 800
});