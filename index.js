function gridCellDimensions() {
  const element = document.createElement("div");
  element.style.position = "fixed";
  element.style.height = "var(--line-height)";
  element.style.width = "1ch";
  document.body.appendChild(element);
  const rect = element.getBoundingClientRect();
  document.body.removeChild(element);
  return { width: rect.width, height: rect.height };
}

// Add padding to each media to maintain grid.
function adjustMediaPadding() {
  const cell = gridCellDimensions();

  function setHeightFromRatio(media, ratio) {
      const rect = media.getBoundingClientRect();
      const realHeight = rect.width / ratio;
      const diff = cell.height - (realHeight % cell.height);
      media.style.setProperty("padding-bottom", `${diff}px`);
  }

  function setFallbackHeight(media) {
      const rect = media.getBoundingClientRect();
      const height = Math.round((rect.width / 2) / cell.height) * cell.height;
      media.style.setProperty("height", `${height}px`);
  }

  function onMediaLoaded(media) {
    var width, height;
    switch (media.tagName) {
      case "IMG":
        width = media.naturalWidth;
        height = media.naturalHeight;
        break;
      case "VIDEO":
        width = media.videoWidth;
        height = media.videoHeight;
        break;
    }
    if (width > 0 && height > 0) {
      setHeightFromRatio(media, width / height);
    } else {
      setFallbackHeight(media);
    }
  }

  const medias = document.querySelectorAll("img, video");
  for (media of medias) {
    switch (media.tagName) {
      case "IMG":
        if (media.complete) {
          onMediaLoaded(media);
        } else {
          media.addEventListener("load", () => onMediaLoaded(media));
          media.addEventListener("error", function() {
              setFallbackHeight(media);
          });
        }
        break;
      case "VIDEO":
        switch (media.readyState) {
          case HTMLMediaElement.HAVE_CURRENT_DATA:
          case HTMLMediaElement.HAVE_FUTURE_DATA:
          case HTMLMediaElement.HAVE_ENOUGH_DATA:
            onMediaLoaded(media);
            break;
          default:
            media.addEventListener("loadeddata", () => onMediaLoaded(media));
            media.addEventListener("error", function() {
              setFallbackHeight(media);
            });
            break;
        }
        break;
    }
  }
}

adjustMediaPadding();
window.addEventListener("load", adjustMediaPadding);
window.addEventListener("resize", adjustMediaPadding);

function checkOffsets() {
  const ignoredTagNames = new Set([
    "THEAD",
    "TBODY",
    "TFOOT",
    "TR",
    "TD",
    "TH",
  ]);
  const cell = gridCellDimensions();
  const elements = document.querySelectorAll("body :not(.debug-grid, .debug-toggle)");
  for (const element of elements) {
    if (ignoredTagNames.has(element.tagName)) {
      continue;
    }
    const rect = element.getBoundingClientRect();
    if (rect.width === 0 && rect.height === 0) {
      continue;
    }
    const top = rect.top + window.scrollY;
    const left = rect.left + window.scrollX;
    const offset = top % (cell.height / 2);
    if(offset > 0) {
      element.classList.add("off-grid");
      console.error("Incorrect vertical offset for", element, "with remainder", top % cell.height, "when expecting divisible by", cell.height / 2);
    } else {
      element.classList.remove("off-grid");
    }
  }
}

const debugToggle = document.querySelector(".debug-toggle");
function onDebugToggle() {
  document.body.classList.toggle("debug", debugToggle.checked);
}
if (debugToggle) {
  debugToggle.addEventListener("change", onDebugToggle);
  onDebugToggle();
}

// ==========================================
// NAVIGATION ENHANCEMENTS
// ==========================================

// Reading Progress Bar
function updateReadingProgress() {
  const progressBar = document.querySelector('.reading-progress');
  if (!progressBar) return;
  
  const windowHeight = window.innerHeight;
  const documentHeight = document.documentElement.scrollHeight - windowHeight;
  const scrollTop = window.scrollY;
  const progress = (scrollTop / documentHeight) * 100;
  
  progressBar.style.width = progress + '%';
}

// Sticky TOC State
function updateStickyTOC() {
  const toc = document.getElementById('TOC');
  if (!toc) return;
  
  const scrolled = window.scrollY > 100;
  toc.classList.toggle('scrolled', scrolled);
}

// Back to Top Button
function updateBackToTop() {
  const button = document.querySelector('.back-to-top');
  if (!button) return;
  
  const shouldShow = window.scrollY > window.innerHeight;
  button.classList.toggle('visible', shouldShow);
}

function scrollToTop(e) {
  e.preventDefault();
  window.scrollTo({
    top: 0,
    behavior: 'smooth'
  });
}

// Active Section Highlighting
let currentActiveLink = null;

function updateActiveSection() {
  const sections = document.querySelectorAll('main h2[id]');
  const tocLinks = document.querySelectorAll('#TOC a');
  
  let currentSection = null;
  const scrollPosition = window.scrollY + 100; // offset for sticky header
  
  sections.forEach(section => {
    const sectionTop = section.offsetTop;
    if (scrollPosition >= sectionTop) {
      currentSection = section;
    }
  });
  
  if (currentSection) {
    const targetId = currentSection.getAttribute('id');
    const targetLink = document.querySelector(`#TOC a[href="#${targetId}"]`);
    
    if (targetLink !== currentActiveLink) {
      if (currentActiveLink) {
        currentActiveLink.classList.remove('active');
      }
      if (targetLink) {
        targetLink.classList.add('active');
        currentActiveLink = targetLink;
      }
    }
  }
}

// Smooth Scroll with Offset for TOC Links
function setupSmoothScroll() {
  const tocLinks = document.querySelectorAll('#TOC a[href^="#"]');
  
  tocLinks.forEach(link => {
    link.addEventListener('click', function(e) {
      e.preventDefault();
      const targetId = this.getAttribute('href').substring(1);
      const targetElement = document.getElementById(targetId);
      
      if (targetElement) {
        const offset = 80; // account for sticky header
        const targetPosition = targetElement.offsetTop - offset;
        
        window.scrollTo({
          top: targetPosition,
          behavior: 'smooth'
        });
      }
    });
  });
}

// Subtle Fade In for Sections
function setupFadeInSections() {
  const sections = document.querySelectorAll('main > h2, main > details, main > nav');
  
  // Don't apply fade-in if user prefers reduced motion
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
    return;
  }
  
  const observerOptions = {
    threshold: 0.1,
    rootMargin: '0px 0px -50px 0px'
  };
  
  const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        entry.target.classList.add('visible');
        // Only animate once
        observer.unobserve(entry.target);
      }
    });
  }, observerOptions);
  
  sections.forEach(section => {
    section.classList.add('fade-in-section');
    observer.observe(section);
  });
}

// Consolidated Scroll Handler
function handleScroll() {
  requestAnimationFrame(() => {
    updateReadingProgress();
    updateStickyTOC();
    updateBackToTop();
    updateActiveSection();
  });
}

// Initialize Navigation Enhancements
function initNavigationEnhancements() {
  // Set up event listeners
  window.addEventListener('scroll', handleScroll, { passive: true });
  window.addEventListener('resize', handleScroll, { passive: true });
  
  // Back to top button
  const backToTopButton = document.querySelector('.back-to-top');
  if (backToTopButton) {
    backToTopButton.addEventListener('click', scrollToTop);
  }
  
  // Set up smooth scrolling for TOC
  setupSmoothScroll();
  
  // Set up fade-in animations
  setupFadeInSections();
  
  // Initial update
  handleScroll();
}

// Initialize when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initNavigationEnhancements);
} else {
  initNavigationEnhancements();
}
