//JL July 2018
import vscode = require('vscode');

var fail = `--- FAIL`;

// for now, myTestLog is a sample of a failed log. This will be replaced with a Blob!
var myTestLog = `time="2018-03-23T22:01:26Z" level=info msg="Running command docker login -u 00000000-0000-0000-0000-000000000000 --password-stdin ankhemaneus.azurecr.io"
    Login Succeeded
    time="2018-03-23T22:01:32Z" level=info msg="Running command git clone https://x-access-token:*************@github.com/ankurkhemani/acr-builder /root/acr-builder/src"
    Cloning into '/root/acr-builder/src'...
    time="2018-03-23T22:01:34Z" level=info msg="Running command git checkout master"
    Already on 'master'
    Your branch is up to date with 'origin/master'.
    time="2018-03-23T22:01:34Z" level=info msg="Running command docker build -f Dockerfile -t ankhemaneus.azurecr.io/hello-world:v1 ."
    Sending build context to Docker daemon  6.508MB

    Step 1/10 : FROM golang:1.9.1-stretch as build
    1.9.1-stretch: Pulling from library/golang
    3e17c6eae66c: Pulling fs layer
    74d44b20f851: Pulling fs layer
    a156217f3fa4: Pulling fs layer
    4a1ed13b6faa: Pulling fs layer
    dc8a629d8a36: Pulling fs layer
    431925b1aca5: Pulling fs layer
    2ac2306b8d4c: Pulling fs layer
    84664a55d30a: Pulling fs layer
    4a1ed13b6faa: Waiting
    dc8a629d8a36: Waiting
    431925b1aca5: Waiting
    2ac2306b8d4c: Waiting
    84664a55d30a: Waiting
    a156217f3fa4: Verifying Checksum
    a156217f3fa4: Download complete
    3e17c6eae66c: Verifying Checksum
    3e17c6eae66c: Download complete
    74d44b20f851: Verifying Checksum
    74d44b20f851: Download complete
    3e17c6eae66c: Pull complete
    74d44b20f851: Pull complete
    a156217f3fa4: Pull complete
    4a1ed13b6faa: Verifying Checksum
    4a1ed13b6faa: Download complete
    dc8a629d8a36: Verifying Checksum
    dc8a629d8a36: Download complete
    84664a55d30a: Verifying Checksum
    84664a55d30a: Download complete
    2ac2306b8d4c: Verifying Checksum
    2ac2306b8d4c: Download complete
    431925b1aca5: Verifying Checksum
    431925b1aca5: Download complete
    4a1ed13b6faa: Pull complete
    dc8a629d8a36: Pull complete
    431925b1aca5: Pull complete
    2ac2306b8d4c: Pull complete
    84664a55d30a: Pull complete
    Digest: sha256:f070a46c4bbb1f8486a64d1529ffc24113a5605ccaf29855b5d1cf6ef03daae2
    Status: Downloaded newer image for golang:1.9.1-stretch
     ---> 99e596fc807e
    Step 2/10 : RUN go get -u github.com/kisielk/errcheck &&    go get -u honnef.co/go/tools/cmd/megacheck &&    go get -u github.com/golang/lint/golint
     ---> Running in 8f3074dc8efc
    Removing intermediate container 8f3074dc8efc
     ---> 55e2e16a17c5
    Step 3/10 : WORKDIR /go/src/github.com/Azure/acr-builder
    Removing intermediate container 064f4a4da9cf
     ---> efce542e104c
    Step 4/10 : COPY ./ /go/src/github.com/Azure/acr-builder
     ---> 4d9c0d0bf44d
    Step 5/10 : RUN echo "Running Static Analysis tools..." &&    echo "Running GoVet..." &&    go vet $(go list ./... | grep -v /vendor/) &&    echo "Running ErrCheck..." &&    errcheck $(go list ./... | grep -v /vendor/) &&    echo "Running MegaCheck..." &&    megacheck $(go list ./... | grep -v /vendor/) &&    echo "Running golint..." &&    golint -set_exit_status $(go list ./... | grep -v '/vendor/' | grep -v '/tests/') &&    echo "Running tests..." &&    go test -cover $(go list ./... | grep -v /vendor/ | grep -v '/tests/') &&    echo "Verification successful, building binaries..." &&    GOOS=linux GOARCH=amd64 go build
     ---> Running in f4a1d4a90d9c
    Running Static Analysis tools...
    Running GoVet...
    Running ErrCheck...
    Running MegaCheck...
    Running golint...
    Running tests...
    ?   	github.com/Azure/acr-builder	[no test files]
    ok  	github.com/Azure/acr-builder/pkg	0.007s	coverage: 98.1% of statements
    --- FAIL: TestObtainFromKnownLocation (0.00s)
        assertions.go:239:

        Error Trace:	archive_test.go:65


                archive_test.go:30

        Error:      	Expected nil, but got: &errors.errorString{s:"Failed to get archive file from http://localhost:32764, error: Get http://localhost:32764: dial tcp 127.0.0.1:32764: getsockopt: connection refused"}
        assertions.go:239:

        Error Trace:	archive_test.go:74


                archive_test.go:30

        Error:      	Expected nil, but got: &os.PathError{Op:"stat", Path:"/go/src/github.com/Azure/acr-builder/tests/workspace/docker-compose.yml", Err:0x2}
    time="2018-03-23T22:03:10Z" level=error msg="No password found, obfuscation not performed"
    time="2018-03-23T22:03:10Z" level=error msg="Error verifying Git version: Please consider using Git version 2.14.0 or higher"
    time="2018-03-23T22:03:10Z" level=error msg="Error verifying Git version: Please consider using Git version 2.14.0 or higher"
    time="2018-03-23T22:03:10Z" level=error msg="Error verifying Git version: Please consider using Git version 2.14.0 or higher"
    time="2018-03-23T22:03:10Z" level=error msg="Error verifying Git version: Please consider using Git version 2.14.0 or higher"
    time="2018-03-23T22:03:10Z" level=error msg="Error verifying Git version: Please consider using Git version 2.14.0 or higher"
    time="2018-03-23T22:03:10Z" level=error msg="Error verifying Git version: Please consider using Git version 2.14.0 or higher"
    time="2018-03-23T22:03:10Z" level=error msg="Error verifying Git version: Please consider using Git version 2.14.0 or higher"
    time="2018-03-23T22:03:10Z" level=error msg="Error verifying Git version: Please consider using Git version 2.14.0 or higher"
    time="2018-03-23T22:03:10Z" level=error msg="Error verifying Git version: Please consider using Git version 2.14.0 or higher"
    time="2018-03-23T22:03:10Z" level=error msg="Error verifying Git version: Please consider using Git version 2.14.0 or higher"
    time="2018-03-23T22:03:10Z" level=error msg="Error verifying Git version: Please consider using Git version 2.14.0 or higher"
    time="2018-03-23T22:03:10Z" level=error msg="Error verifying Git version: Please consider using Git version 2.14.0 or higher"
    time="2018-03-23T22:03:10Z" level=error msg="Unexpectedly unable to obfuscate git address"
    time="2018-03-23T22:03:10Z" level=error msg="Unexpectedly unable to obfuscate git address"
    FAIL
    coverage: 82.7% of statements
    FAIL	github.com/Azure/acr-builder/pkg/commands	0.038s
    ?   	github.com/Azure/acr-builder/pkg/constants	[no test files]
    ok  	github.com/Azure/acr-builder/pkg/driver	0.007s	coverage: 98.6% of statements
    ok  	github.com/Azure/acr-builder/pkg/grok	0.004s	coverage: 83.7% of statements
    ?   	github.com/Azure/acr-builder/pkg/shell	[no test files]
    ok  	github.com/Azure/acr-builder/pkg/workflow	0.004s	coverage: 100.0% of statements
    The command '/bin/sh -c echo "Running Static Analysis tools..." &&    echo "Running GoVet..." &&    go vet $(go list ./... | grep -v /vendor/) &&    echo "Running ErrCheck..." &&    errcheck $(go list ./... | grep -v /vendor/) &&    echo "Running MegaCheck..." &&    megacheck $(go list ./... | grep -v /vendor/) &&    echo "Running golint..." &&    golint -set_exit_status $(go list ./... | grep -v '/vendor/' | grep -v '/tests/') &&    echo "Running tests..." &&    go test -cover $(go list ./... | grep -v /vendor/ | grep -v '/tests/') &&    echo "Verification successful, building binaries..." &&    GOOS=linux GOARCH=amd64 go build' returned a non-zero code: 1
    time="2018-03-23T22:03:12Z" level=error msg="Failed to run command: exit status 1"`;



if (myTestLog.search(fail) === -1) {
    console.log('No failures found');
} else {
    console.log('Found error messages!');
    let i = myTestLog.search(`error msg=`);
    let temp = myTestLog.substr(i - 34, myTestLog.length); //there were 34 characters between the line beginning and 'error msg='
    var allerrors = temp.split(`\n`);
    var unique_errors: string[] = [];
    // errors are often repeated in the log. This is undesirable information, so we run a quick filter to ensure each individual error
    // is only displayed to the user once
    for (let j = 0; j < allerrors.length; j++) {
        //all failed logs begin with '--- FAIL' and end with 'FAIL'. This is how we know when to break
        if (allerrors[j].includes('FAIL')) {
            break;
        }
        // trim whitespace before adding to array to make it readable
        if (!unique_errors.includes(allerrors[j].trim())) {
            unique_errors.push(allerrors[j].trim());

        }
    }
    console.log('Final array found: ');
    console.log(unique_errors);

}
