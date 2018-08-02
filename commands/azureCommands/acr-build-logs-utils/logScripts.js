let content = document.querySelector('#core');
const vscode = acquireVsCodeApi();


window.addEventListener('message', event => {
    const message = event.data; // The JSON data our extension sent
    if (message.type === 'populate') {
        content.insertAdjacentHTML('beforeend', message.logComponent);

        let item = content.querySelector(`#btn${message.id}`);
        setSingleAccordion(item);

        const logButton = content.querySelector(`#log${message.id}`);
        setLogListener(logButton);

    } else if (message.type === 'end') {
        console.log('COMPLETED');
    }

});

function setAccordionBehaviour() {
    let acc = document.getElementsByClassName('accordion');
    for (let i = 0; i < acc.length; i++) {
        setSingleAccordion(acc[i]);
    }
}

function setLogListener(item) {
    item.addEventListener('click', function () {
        const id = this.id.substring('Log'.length);
        vscode.postMessage({
            logRequest: {
                'id': id
            }
        });
    });
}

function setSingleAccordion(item) {
    item.addEventListener('click', function () {
        this.classList.toggle('active');
        var panel = this.nextElementSibling;
        if (panel.style.maxHeight) {
            panel.style.maxHeight = null;
        } else {
            panel.style.maxHeight = panel.scrollHeight + 'px';
            console.log('clicked');
        }
    });
}
