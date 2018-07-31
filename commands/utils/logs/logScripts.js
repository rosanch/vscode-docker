let content = document.querySelector("#core");
const vscode = acquireVsCodeApi();


window.addEventListener('message', event => {
    const message = event.data; // The JSON data our extension sent
    console.log(message);
    if (message.type === 'populate') {
        content.insertAdjacentHTML('beforeend', message.logComponent);
        let addedItem = content.querySelector(`#${message.id}`);
        setSingleAccordion(addedItem);
    } else if (message.type === 'end') {
        console.log('COMPLETED');
    }

});

function openLog(id) {
    id = id.substring('Log'.length);
    vscode.postMessage({
        logRequest: {
            'id': id
        }
    });
}

function setAccordionBehaviour() {
    let acc = document.getElementsByClassName("accordion");
    for (let i = 0; i < acc.length; i++) {
        setSingleAccordion(acc[i]);
    }
}

function setSingleAccordion(item) {
    item.addEventListener("click", function () {
        this.classList.toggle("active");
        var panel = this.nextElementSibling;
        if (panel.style.maxHeight) {
            panel.style.maxHeight = null;
        } else {
            panel.style.maxHeight = panel.scrollHeight + "px";
            console.log(this.id);
            openLog(this.id);
        }
    });
}
