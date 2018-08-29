// Global Variables
const status = {
    'Succeeded': 4,
    'Queued': 3,
    'Error': 2,
    'Failed': 1
}

var currentN = 4;
var currentDir = "asc"

var triangles = {
    'down': ' ▽',
    'up': ' △'
}

// Main
let content = document.querySelector('#core');
const vscode = acquireVsCodeApi();
setLoadMoreListener();
setTableSorter();

/* Sorting
 * PR note, while this does not use a particularly quick algorithm
 * it allows a low stuttering experience that allowed rapid testing.
 * I will improve it soon.*/
function sortTable(n, dir = "asc", holdDir = false) {
    currentDir = dir;
    currentN = n;
    let table, rows, switching, i, x, y, shouldSwitch, switchcount = 0;
    let cmpFunc = acquireCompareFunction(n);
    table = document.getElementById("core");
    switching = true;
    //Set the sorting direction to ascending:

    while (switching) {
        switching = false;
        rows = table.querySelectorAll(".holder");
        for (i = 0; i < rows.length - 1; i++) {
            shouldSwitch = false;
            x = rows[i].getElementsByTagName("TD")[n + 1];
            y = rows[i + 1].getElementsByTagName("TD")[n + 1];
            if (dir == "asc") {
                if (cmpFunc(x, y)) {
                    shouldSwitch = true;
                    break;
                }
            } else if (dir == "desc") {
                if (cmpFunc(y, x)) {
                    shouldSwitch = true;
                    break;
                }
            }
        }
        if (shouldSwitch) {
            rows[i].parentNode.insertBefore(rows[i + 1], rows[i]);
            switching = true;
            switchcount++;
        } else {
            /*If no switching has been done AND the direction is "asc", set the direction to "desc" and run the while loop again.*/
            if (switchcount == 0 && dir == "asc" && !holdDir) {
                dir = "desc";
                switching = true;
            }
        }
    }

    let sortColumns = document.querySelectorAll(".sort");
    if (sortColumns[n].innerHTML === triangles['down']) {
        sortColumns[n].innerHTML = triangles['up'];
    } else if (sortColumns[n].innerHTML === triangles['up']) {
        sortColumns[n].innerHTML = triangles['down'];
    } else {
        for (cell of sortColumns) {
            cell.innerHTML = '  ';
        }
        sortColumns[n].innerHTML = triangles['down'];
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
                return status[x.dataset.status] > status[y.dataset.status];;
            }
        case 3: //Created time
            return (x, y) => {
                if (x.dataset.createdtime === '') return true;
                if (y.dataset.createdtime === '') return false;
                let dateX = new Date(x.dataset.createdtime);
                let dateY = new Date(y.dataset.createdtime);
                return dateX > dateY;
            }
        case 4: //Elapsed time
            return (x, y) => {
                if (x.innerHTML === '') return true;
                if (y.innerHTML === '') return false;
                return Number(x.innerHTML.substring(0, x.innerHTML.length - 1)) > Number(y.innerHTML.substring(0, y.innerHTML.length - 1));
            }
        case 5: //OS Type
            return (x, y) => {
                return x.innerHTML.toLowerCase() > y.innerHTML.toLowerCase()
            }
        default:
            throw 'Could not acquire Compare function, invalid n';
    }
}

// Event Listener Setup
window.addEventListener('message', event => {
    const message = event.data; // The JSON data our extension sent
    if (message.type === 'populate') {
        content.insertAdjacentHTML('beforeend', message.logComponent);

        let item = content.querySelector(`#btn${message.id}`);
        setSingleAccordion(item);

        let panel = item.nextElementSibling;

        const logButton = panel.querySelector('.openLog');
        setLogBtnListener(logButton, false);
        const downloadlogButton = panel.querySelector('.downloadlog');
        setLogBtnListener(downloadlogButton, true);

        const digestClickables = panel.querySelectorAll('.copy');
        setDigestListener(digestClickables);

    } else if (message.type === 'endContinued') {
        sortTable(currentN, currentDir, true);
    } else if (message.type === 'end') {
        window.addEventListener("resize", manageWidth);
        manageWidth();
    }

});

function setSingleAccordion(item) {
    item.addEventListener('click', function () {
        this.classList.toggle('active');
        this.querySelector('.arrow').classList.toggle('activeArrow');
        let panel = this.nextElementSibling;
        if (panel.style.maxHeight) {
            panel.style.display = 'none';
            panel.style.maxHeight = null;
            let index = openAccordions.indexOf(panel);
            if (index > -1) {
                openAccordions.splice(index, 1);
            }
        } else {
            openAccordions.push(panel);
            setAccordionTableWidth();
            panel.style.display = 'table-row';
            let paddingTop = +panel.style.paddingTop.split('px')[0];
            let paddingBottom = +panel.style.paddingBottom.split('px')[0];
            panel.style.maxHeight = (panel.scrollHeight + paddingTop + paddingBottom) + 'px';
        }
    });
}

function setTableSorter() {
    let items = document.getElementsByTagName('TH');
    for (let i = 0; i < items.length; i++) {
        items[i].addEventListener('click', () => {
            sortTable(i);
        });
    }
}

function setLogBtnListener(item, download) {
    item.addEventListener('click', function () {
        vscode.postMessage({
            logRequest: {
                'id': this.dataset.id,
                'download': download
            }
        });
    });
}

function setLoadMoreListener() {
    let item = document.querySelector("#loadBtn");
    item.addEventListener('click', function () {
        vscode.postMessage({
            loadMore: true
        });
    });
}

function setDigestListener(digestClickables) {
    for (digest of digestClickables) {
        digest.addEventListener('click', function () {
            vscode.postMessage({
                copyRequest: {
                    'text': this.parentNode.dataset.digest,
                }
            });
        });
    }
}

function manageWidth() {
    // let headerCells = document.querySelectorAll("#headerTable th");
    // let topRow = document.querySelector("#core tr");
    // let topRowCells = topRow.querySelectorAll("td");
    // for (let i = 0; i < topRowCells.length; i++) {
    //     let width = parseInt(getComputedStyle(topRowCells[i]).width);
    //     headerCells[i].style.width = width + "px";
    // }
    setAccordionTableWidth();
}

let openAccordions = [];

function setAccordionTableWidth() {
    let headerCells = document.querySelectorAll("#core thead tr th");
    let topWidths = [];
    for (let cell of headerCells) {
        topWidths.push(parseInt(getComputedStyle(cell).width));
    }
    for (acc of openAccordions) {
        let cells = acc.querySelectorAll(".innerTable th, .innerTable td"); // 4 items
        const cols = acc.querySelectorAll(".innerTable th").length + 1; //Account for arrowHolder
        const rows = cells.length / cols;
        //cells[0].style.width = topWidths[0];
        for (let row = 0; row < rows; row++) {
            for (let col = 1; col < cols - 1; col++) {
                let cell = cells[row * cols + col];
                cell.style.width = topWidths[col - 1] + "px"
            }
        }
    }
}
