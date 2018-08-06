let content = document.querySelector('#core');
const vscode = acquireVsCodeApi();
setLoadLogsListener();
setTableSorter();

const status = {
    'Succeeded': 4,
    'Queued': 3,
    'Error': 2,
    'Failed': 1
}

var currentN = 0;

window.addEventListener('message', event => {
    const message = event.data; // The JSON data our extension sent
    if (message.type === 'populate') {
        content.insertAdjacentHTML('beforeend', message.logComponent);

        let item = content.querySelector(`#btn${message.id}`);
        setSingleAccordion(item);

        const logButton = content.querySelector(`#log${message.id}`);
        setLogListener(logButton);

    } else if (message.type === 'endContinued') {
        sortTable(currentN);
    }

});

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
    currentN = n;
    let table, rows, switching, i, x, y, shouldSwitch, dir, switchcount = 0;
    let cmpFunc = acquireCompareFunction(n);
    table = document.getElementById("core");
    switching = true;
    //Set the sorting direction to ascending:
    dir = "asc";
    /*Make a loop that will continue until no switching has been done:*/
    while (switching) {
        //start by saying: no switching is done:
        switching = false;
        rows = table.getElementsByClassName("accordion");
        for (i = 0; i < rows.length - 1; i++) {
            shouldSwitch = false;
            /*Get the two elements you want to compare, one from current row and one from the next:*/
            x = rows[i].getElementsByTagName("TD")[n];
            y = rows[i + 1].getElementsByTagName("TD")[n];
            /*check if the two rows should switch place, based on the direction, asc or desc:*/
            if (dir == "asc") {
                if (cmpFunc(x, y)) {
                    //if so, mark as a switch and break the loop:
                    shouldSwitch = true;
                    break;
                }
            } else if (dir == "desc") {
                if (cmpFunc(y, x)) {
                    //if so, mark as a switch and break the loop:
                    shouldSwitch = true;
                    break;
                }
            }
        }
        if (shouldSwitch) {
            /*If a switch has been marked, make the switch and mark that a switch has been done:*/
            rows[i].parentNode.insertBefore(rows[i + 1], rows[i]);
            switching = true;
            //Each time a switch is done, increase this count by 1:
            switchcount++;
        } else {
            /*If no switching has been done AND the direction is "asc", set the direction to "desc" and run the while loop again.*/
            if (switchcount == 0 && dir == "asc") {
                dir = "desc";
                switching = true;
            }
        }
    }
}

function acquireCompareFunction(n) {
    switch (n) {
        case 0: //Name
        case 1: //Build Task
            return (x, y) => {
                return x.innerHTML.toLowerCase() > y.innerHTML.toLowerCase()
            }
        case 2: //Status
            return (x, y) => {
                return status[x.innerHTML] > status[y.innerHTML];;
            }
        case 3: //Start time
        case 4: // Finish time
            return (x, y) => {
                if (x.innerHTML === '?') return true;
                if (y.innerHTML === '?') return false;
                let dateX = new Date(x.innerHTML);
                let dateY = new Date(y.innerHTML);
                return dateX > dateY;
            }
        case 5: //OS Type
            return (x, y) => {
                return x.innerHTML.toLowerCase() > y.innerHTML.toLowerCase()
            }
        default:
            throw 'Could not acquire Compare function, invalid n';
    }
}

function setTableSorter() {
    let items = document.getElementsByTagName('TH');
    for (let i = 0; i < items.length; i++) {
        items[i].addEventListener('click', () => {
            sortTable(i)
        });
    }
}
