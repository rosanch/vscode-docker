// //JL July 2018
// import vscode = require('vscode');

// var fail = `--- FAIL`;

// if (myTestLog.search(fail) === -1) {
//     console.log('No failures found');
// } else {
//     console.log('Found error messages!');
//     let i = myTestLog.search(`error msg=`);
//     let temp = myTestLog.substr(i - 34, myTestLog.length); //there were 34 characters between the line beginning and 'error msg='
//     var allerrors = temp.split(`\n`);
//     var unique_errors: string[] = [];
//     // errors are often repeated in the log. This is undesirable information, so we run a quick filter to ensure each individual error
//     // is only displayed to the user once
//     for (let j = 0; j < allerrors.length; j++) {
//         //all failed logs begin with '--- FAIL' and end with 'FAIL'. This is how we know when to break
//         if (allerrors[j].includes('FAIL')) {
//             break;
//         }
//         // trim whitespace before adding to array to make it readable
//         if (!unique_errors.includes(allerrors[j].trim())) {
//             unique_errors.push(allerrors[j].trim());

//         }
//     }
//     console.log('Final array found: ');
//     console.log(unique_errors);

//}
