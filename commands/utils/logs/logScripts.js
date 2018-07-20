// window.addEventListener('message', event => {

//     const message = event.data; // The JSON data our extension sent

//     if (message.logsHtml) {
//         let location = document.querySelector("#content");
//         location.insertAdjacentHTML('beforeend', message.logsHtml);
//         setAccordionBehaviour();
//     }
// });
const vscode = acquireVsCodeApi();
let count = 0;
setAccordionBehaviour();

function openLog(id) {
    vscode.postMessage({
        logRequest: {
            'id': id
        }
    });
}

function setAccordionBehaviour() {
    let acc = document.getElementsByClassName("accordion");
    for (let i = 0; i < acc.length; i++) {
        acc[i].addEventListener("click", function () {
            this.classList.toggle("active");
            var panel = this.nextElementSibling;
            if (panel.style.maxHeight) {
                panel.style.maxHeight = null;
            } else {
                panel.style.maxHeight = panel.scrollHeight + "px";
                openLog(this.id);
            }
        });
    }
}
