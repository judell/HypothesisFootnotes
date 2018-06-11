"use strict";
function HypothesisFootnotes() {
    installFootnotesContainer();
    var hypDotIsUrls = findAndDecorateHypDotIsUrls();
    var hypIsResults = getHypIsResults(hypDotIsUrls);
    settle(hypIsResults.promises)
        .then(function () {
        for (var i = 0; i < hypDotIsUrls.length; i++) {
            var hypIsUrl = hypDotIsUrls[i];
            var footnoteObject = hypIsResults.footnoteObjects[hypIsUrl];
            makeFootnoteFromObject(i, footnoteObject);
        }
    });
}
/*
Scan for hyp.is urls
Decorate with superscripts pointing to (yet-to-be-generated) footnotes
Return array of hyp.is urls
*/
function findAndDecorateHypDotIsUrls() {
    var hypDotIsUrls = [];
    var directLinks = document.querySelectorAll('a[href^="https://hyp.is"]');
    for (var i = 0; i < directLinks.length; i++) {
        var directLink = directLinks[i];
        var href = directLink.href;
        var url = "https://" + href.match(/(hyp.is\/[^\/]+)/)[1];
        var id = href.match(/hyp.is\/([^\/]+)/)[1];
        hypDotIsUrls.push(url);
        var num = i + 1;
        directLink.outerHTML += "\n      <a name=\"_fn_" + id + "\"></a> \n      <sup>(<a title=\"visit footnote\" href=\"#fn_" + id + "\">" + num + "</a>)</sup>";
    }
    return hypDotIsUrls;
}
/*
Retrieve annotations from hyp_is urls
Construct footnote objects from them
Return an array of promises, and an object whose keys are hyp.is links and values are footnote objects
created when the promise to fetch each hyp.is link is resolved.

*/
function getHypIsResults(hypDotIsUrls) {
    var promises = [];
    var footnoteObjects = {};
    for (var i = 0; i < hypDotIsUrls.length; i++) {
        var url = hypDotIsUrls[i];
        var id = url.match(/hyp.is\/([^\/]+)/)[1];
        var options = {
            method: "GET",
            url: "https://hypothes.is/api/annotations/" + id
        };
        promises.push(hlib.httpRequest(options)
            .then(function (data) {
            var row = hlib.parseAnnotation(JSON.parse(data.response));
            var dl = "https://hyp.is/" + row.id;
            var footnoteObject = {
                id: row.id,
                quote: row.quote,
                url: row.url,
                title: row.title,
                dl: dl
            };
            footnoteObjects[dl] = footnoteObject;
        }));
    }
    return {
        promises: promises,
        footnoteObjects: footnoteObjects
    };
}
/*
Construct a footnote from a footnote object
Add it to the page
*/
function makeFootnoteFromObject(num, obj) {
    num += 1;
    var div = document.createElement("div");
    //  div.style['font-size'] = 'smaller';
    div.id = "fn_" + obj.id;
    div.innerHTML = "\n    <a name=\"fn_{$obj.id}\">\n    <p class=\"footnote\" style=\"font-size:smaller\">" + num + "\n    <a target=\"_blank\" href=\"" + obj.dl + "\">" + obj.title + "</a> \n    <a title=\"see in context\" href=\"#_fn_" + obj.id + "\">&#9166</a>\n    </p>\n    <blockquote style=\"font-family:italic\">\n    " + obj.quote + "\n    </blockquote>";
    var body = document.querySelector('body');
    body.appendChild(div);
}
function installFootnotesContainer() {
    var footnotesContainer = document.createElement('div');
    footnotesContainer.setAttribute("id", "footnotesContainer");
    var footnotesHeader = document.createElement("h2");
    footnotesHeader.innerHTML = "Footnotes";
    footnotesContainer.appendChild(footnotesHeader);
    footnotesElement().appendChild(footnotesContainer);
}
function footnotesElement() {
    var element = document.querySelector('#HypothesisFootnotes');
    if (element) {
        return element;
    }
    else {
        return document.querySelector('body');
    }
}
/*
A page may include many hyp.is urls. The script makes a corresponding number
of Hypothesis API requests. Without this wrapper, if any request should fail,
Promise.all will immediately reject. This ensures that such a rejection won't
prevent a full set of responses.
*/
function settle(promises) {
    var alwaysFulfilled = promises.map(function (p) {
        return p.then(function onFulfilled(value) {
            return { state: "fulfilled", value: value };
        }, function onRejected(reason) {
            console.log("settle: rejected promise", reason);
            return { state: "rejected", reason: reason };
        });
    });
    return Promise.all(alwaysFulfilled);
}
HypothesisFootnotes();
