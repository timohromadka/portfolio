window.onload = function() {
    let buttons = Array.from(document.getElementsByClassName("accordion-button"));
    let panels = Array.from(document.getElementsByClassName("accordion-content"));
    let i;

    for (i = 0; i < buttons.length; i++) {
        buttons[i].addEventListener("click", function() {
            /* Close all panels */
            for(let panel of panels) {
                panel.style.display = "none";
            }

            /* Open the clicked panel */
            let index = buttons.indexOf(this);
            panels[index].style.display = "block";
        });
    }
}
