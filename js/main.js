;(function () {
	
	'use strict';

	var isMobile = {
		Android: function() {
			return navigator.userAgent.match(/Android/i);
		},
			BlackBerry: function() {
			return navigator.userAgent.match(/BlackBerry/i);
		},
			iOS: function() {
			return navigator.userAgent.match(/iPhone|iPad|iPod/i);
		},
			Opera: function() {
			return navigator.userAgent.match(/Opera Mini/i);
		},
			Windows: function() {
			return navigator.userAgent.match(/IEMobile/i);
		},
			any: function() {
			return (isMobile.Android() || isMobile.BlackBerry() || isMobile.iOS() || isMobile.Opera() || isMobile.Windows());
		}
	};

	var mobileMenuOutsideClick = function() {

		$(document).click(function (e) {
	    var container = $("#fh5co-offcanvas, .js-fh5co-nav-toggle");
	    if (!container.is(e.target) && container.has(e.target).length === 0) {

	    	if ( $('body').hasClass('offcanvas') ) {

    			$('body').removeClass('offcanvas');
    			$('.js-fh5co-nav-toggle').removeClass('active');
				
	    	}
	    
	    	
	    }
		});

	};


	var offcanvasMenu = function() {

		$('#page').prepend('<div id="fh5co-offcanvas" />');
		$('#page').prepend('<a href="#" class="js-fh5co-nav-toggle fh5co-nav-toggle fh5co-nav-white"><i></i></a>');
		var clone1 = $('.menu-1 > ul').clone();
		$('#fh5co-offcanvas').append(clone1);
		var clone2 = $('.menu-2 > ul').clone();
		$('#fh5co-offcanvas').append(clone2);

		$('#fh5co-offcanvas .has-dropdown').addClass('offcanvas-has-dropdown');
		$('#fh5co-offcanvas')
			.find('li')
			.removeClass('has-dropdown');

		// Hover dropdown menu on mobile
		$('.offcanvas-has-dropdown').mouseenter(function(){
			var $this = $(this);

			$this
				.addClass('active')
				.find('ul')
				.slideDown(500, 'easeOutExpo');				
		}).mouseleave(function(){

			var $this = $(this);
			$this
				.removeClass('active')
				.find('ul')
				.slideUp(500, 'easeOutExpo');				
		});


		$(window).resize(function(){

			if ( $('body').hasClass('offcanvas') ) {

    			$('body').removeClass('offcanvas');
    			$('.js-fh5co-nav-toggle').removeClass('active');
				
	    	}
		});
	};


	var burgerMenu = function() {

		$('body').on('click', '.js-fh5co-nav-toggle', function(event){
			var $this = $(this);


			if ( $('body').hasClass('overflow offcanvas') ) {
				$('body').removeClass('overflow offcanvas');
			} else {
				$('body').addClass('overflow offcanvas');
			}
			$this.toggleClass('active');
			event.preventDefault();

		});
	};

	var fullHeight = function() {

		if ( !isMobile.any() ) {
			$('.js-fullheight').css('height', $(window).height());
			$(window).resize(function(){
				$('.js-fullheight').css('height', $(window).height());
			});
		}

	};



	var contentWayPoint = function() {
		var i = 0;
		$('.animate-box').waypoint( function( direction ) {

			if( direction === 'down' && !$(this.element).hasClass('animated-fast') ) {
				
				i++;

				$(this.element).addClass('item-animate');
				setTimeout(function(){

					$('body .animate-box.item-animate').each(function(k){
						var el = $(this);
						setTimeout( function () {
							var effect = el.data('animate-effect');
							if ( effect === 'fadeIn') {
								el.addClass('fadeIn animated-fast');
							} else if ( effect === 'fadeInLeft') {
								el.addClass('fadeInLeft animated-fast');
							} else if ( effect === 'fadeInRight') {
								el.addClass('fadeInRight animated-fast');
							} else {
								el.addClass('fadeInUp animated-fast');
							}

							el.removeClass('item-animate');
						},  k * 200, 'easeInOutExpo' );
					});
					
				}, 100);
				
			}

		} , { offset: '85%' } );
	};


	var dropdown = function() {

		$('.has-dropdown').mouseenter(function(){

			var $this = $(this);
			$this
				.find('.dropdown')
				.css('display', 'block')
				.addClass('animated-fast fadeInUpMenu');

		}).mouseleave(function(){
			var $this = $(this);

			$this
				.find('.dropdown')
				.css('display', 'none')
				.removeClass('animated-fast fadeInUpMenu');
		});

	};


	var goToTop = function() {

		$('.js-gotop').on('click', function(event){
			
			event.preventDefault();

			$('html, body').animate({
				scrollTop: $('html').offset().top
			}, 500, 'easeInOutExpo');
			
			return false;
		});

		$(window).scroll(function(){

			var $win = $(window);
			if ($win.scrollTop() > 200) {
				$('.js-top').addClass('active');
			} else {
				$('.js-top').removeClass('active');
			}

		});
	
	};


	// Loading page
	var loaderPage = function() {
		$(".fh5co-loader").fadeOut("slow");
	};


	var counterWayPoint = function() {
		if ($('#fh5co-counter').length > 0 ) {
			$('#fh5co-counter').waypoint( function( direction ) {
										
				if( direction === 'down' && !$(this.element).hasClass('animated') ) {
					setTimeout( counter , 400);					
					$(this.element).addClass('animated');
				}
			} , { offset: '90%' } );
		}
	};

	var sliderMain = function() {
		
	  	$('#fh5co-hero .flexslider').flexslider({
			animation: "fade",
			slideshowSpeed: 5000,
			directionNav: true,
			start: function(){
				setTimeout(function(){
					$('.slider-text').removeClass('animated fadeInUp');
					$('.flex-active-slide').find('.slider-text').addClass('animated fadeInUp');
				}, 500);
			},
			before: function(){
				setTimeout(function(){
					$('.slider-text').removeClass('animated fadeInUp');
					$('.flex-active-slide').find('.slider-text').addClass('animated fadeInUp');
				}, 500);
			}

	  	});

	  	$('#fh5co-hero .flexslider .slides > li').css('height', $(window).height());	
	  	$(window).resize(function(){
	  		$('#fh5co-hero .flexslider .slides > li').css('height', $(window).height());	
	  	});

	};

	
	$(function(){
		mobileMenuOutsideClick();
		offcanvasMenu();
		burgerMenu();
		contentWayPoint();
		sliderMain();
		dropdown();
		goToTop();
		loaderPage();
		counterWayPoint();
		fullHeight();
	});


	$(document).ready(function() {
		var colors = [
			'#54c772', // green
			'#f56438', // red
			'#4a81f0', // blue
			'#fff07a', // yellow
			'#efefef', // white
			'#f0c94a' // orange
		];
		var tileContainer = $('#tileContainer');
		var margin = 15;
		var side = 100;
		var tiles = [];
	
		var excludedLocations = [
			// [1,3], [1,4], [1,5], 
			// [2,10], [2,11], [2,12], [3,10], [3,11], [3,12], [4,10], [4,11], [4,12],
			// [1,8], [1,9], [2,8], [2,9]
			];
	
		function createGrid() {
			tileContainer.empty();  // clear the container
			tiles = [];  // clear the tiles array
			var numTilesWidth = Math.ceil(window.innerWidth / (margin + side));
			var numTilesHeight = Math.ceil(window.innerHeight / (margin + side));
			
			for (var i = 0; i < numTilesHeight; i++) {
				for (var j = 0; j < numTilesWidth; j++) {
					// Check if the current location is in the excluded locations
					if (excludedLocations.some(loc => loc[0] === i && loc[1] === j)) {
						continue;
					}
					var tile = $('<div class="tile"></div>');
					tile.css('top', (i * (margin + side)) + 'px');
					tile.css('left', (j * (margin + side)) + 'px');
					tile.css('background-color', colors[Math.floor(Math.random() * colors.length)]);
					tileContainer.append(tile);
					if (tile.prop('id') !== 'nameTile' && tile.prop('id') !== 'imageTile' && tile.prop('id') !== 'aboutTile') {
						tiles.push({element: tile, x: j * (margin + side), y: i * (margin + side)});
					}
				}
			}
		}
	
		$(document).mousemove(function(e) {
			var tileContainerOffset = tileContainer.offset();  // get the current offset of the tileContainer
			var cursorX = e.pageX - tileContainerOffset.left;  // adjust the cursor's X coordinate
			var cursorY = e.pageY - tileContainerOffset.top;   // adjust the cursor's Y coordinate
			var radius = 250;
	
			tiles.forEach(function(tile) {
				var dx = cursorX - (tile.x + 50); // center of tile
				var dy = cursorY - (tile.y + 50); // center of tile
				var dist = Math.sqrt(dx * dx + dy * dy);
				if(dist <= radius) {
					var opacity = 1 - dist / radius;
					tile.element.css('opacity', opacity);
				} else {
					tile.element.css('opacity', 0);
				}
			});
		});
	
		createGrid();  // create the grid when the document is ready
	
		$(window).resize(function() {
			createGrid();  // update the grid whenever the window is resized
		});
	});
	
	

	// Prevent page scroll to top when "Learn More" link is clicked
	var learnMoreLinks = document.querySelectorAll('.learn-more-link');
	for (var i = 0; i < learnMoreLinks.length; i++) {
		learnMoreLinks[i].addEventListener('click', function(event) {
			event.preventDefault();
		});
	}

	// Dynamically change the color of the background when highlighting text with cursor
	document.onmouseup = changeHighlightColor;
	let colors = ['red', 'orange', 'gray', 'blue', 'green'];
	let index = 0;

	function changeHighlightColor() {
		document.body.className = colors[index];
		index = (index + 1) % colors.length;  // Cycle through colors
	}

}());