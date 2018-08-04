let content = document.querySelector('#core');
const vscode = acquireVsCodeApi();
setLoadLogsListener();
setTableSorter();
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

function setLoadLogsListener() {
    let item = document.querySelector("#loadBtn");
    item.addEventListener('click', function () {
        vscode.postMessage({
            loadMore: true
        });
    });
}

function sortTable(n) {
    var table, rows, switching, i, x, y, shouldSwitch, dir, switchcount = 0;
    table = document.getElementById("core");
    switching = true;
    //Set the sorting direction to ascending:
    dir = "asc";
    /*Make a loop that will continue until
    no switching has been done:*/
    while (switching) {
        //start by saying: no switching is done:
        switching = false;
        rows = table.getElementsByClassName("accordion");
        for (i = 0; i < rows.length - 1; i++) {
            //start by saying there should be no switching:
            shouldSwitch = false;
            /*Get the two elements you want to compare, one from current row and one from the next:*/
            x = rows[i].getElementsByTagName("TD")[n];
            y = rows[i + 1].getElementsByTagName("TD")[n];
            /*check if the two rows should switch place,
            based on the direction, asc or desc:*/
            if (dir == "asc") {
                if (x.innerHTML.toLowerCase() > y.innerHTML.toLowerCase()) {
                    //if so, mark as a switch and break the loop:
                    shouldSwitch = true;
                    break;
                }
            } else if (dir == "desc") {
                if (x.innerHTML.toLowerCase() < y.innerHTML.toLowerCase()) {
                    //if so, mark as a switch and break the loop:
                    shouldSwitch = true;
                    break;
                }
            }
        }
        if (shouldSwitch) {
            /*If a switch has been marked, make the switch
            and mark that a switch has been done:*/
            rows[i].parentNode.insertBefore(rows[i + 1], rows[i]);
            switching = true;
            //Each time a switch is done, increase this count by 1:
            switchcount++;
        } else {
            /*If no switching has been done AND the direction is "asc",
            set the direction to "desc" and run the while loop again.*/
            if (switchcount == 0 && dir == "asc") {
                dir = "desc";
                switching = true;
            }
        }
    }
}

function setTableSorter() {
    let items = document.getElementsByTagName('TH');
    for (let i = 0; i < 6; i++) {
        items[i].addEventListener('click', () => {
            sortTable(i)
        });
    }
}
