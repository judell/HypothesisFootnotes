type footnoteObject = {
  id: string,
  quote: string,
  url: string,
  title: string,
  dl: string,
  }

function HypothesisFootnotes() {
  installFootnotesContainer();

  let hypDotIsUrls = findAndDecorateHypDotIsUrls()

  let hypIsResults = getHypIsResults(hypDotIsUrls)

  settle(hypIsResults.promises)
    .then( () => {
      for (let i = 0; i < hypDotIsUrls.length; i++ ) {
        let hypIsUrl = hypDotIsUrls[i]
        let footnoteObject = hypIsResults.footnoteObjects[hypIsUrl] as footnoteObject
        makeFootnoteFromObject(i, footnoteObject)
      }
    })
}

/*
Scan for hyp.is urls
Decorate with superscripts pointing to (yet-to-be-generated) footnotes
Return array of hyp.is urls
*/
function findAndDecorateHypDotIsUrls() {
  let hypDotIsUrls:string[] = [];
  let directLinks:NodeListOf<HTMLLinkElement> = document.querySelectorAll('a[href^="https://hyp.is"]')
  for (let i = 0; i < directLinks.length; i++) {
    let directLink = directLinks[i]
    let href = directLink.href as string
    let url = "https://" + href.match(/(hyp.is\/[^\/]+)/)[1]
    let id = href.match(/hyp.is\/([^\/]+)/)[1]
    hypDotIsUrls.push(url)
    var num = i + 1
    directLink.outerHTML += `
      <a name="_fn_${id}"></a> 
      <sup>(<a title="visit footnote" href="#fn_${id}">${num}</a>)</sup>`
  }
  return hypDotIsUrls;
}

/*
Retrieve annotations from hyp_is urls
Construct footnote objects from them
Return an array of promises, and an object whose keys are hyp.is links and values are footnote objects 
created when the promise to fetch each hyp.is link is resolved.

*/
function getHypIsResults(hypDotIsUrls:string[]) {
  let promises:Promise<any>[] = []
  let footnoteObjects:any = {}
  for (let i = 0; i < hypDotIsUrls.length; i++) {
    let url = hypDotIsUrls[i]
    let id = url.match(/hyp.is\/([^\/]+)/)[1]
    let options = {
      method: "GET",
      url: "https://hypothes.is/api/annotations/" + id
    }
    promises.push(
      hlib.httpRequest(options)
        .then(function(data:any) {
          let row = hlib.parseAnnotation(JSON.parse(data.response))
          let dl = "https://hyp.is/" + row.id
          let footnoteObject:footnoteObject = {
            id: row.id,
            quote: row.quote,
            url: row.url,
            title: row.title,
            dl: dl
          }
          footnoteObjects[dl] = footnoteObject
        })
    )
  }
  return {
    promises: promises, 
    footnoteObjects: footnoteObjects
  }
}

/*
Construct a footnote from a footnote object
Add it to the page
*/
function makeFootnoteFromObject(num:number, obj:footnoteObject) {
  num += 1
  var div = document.createElement("div")
//  div.style['font-size'] = 'smaller';
  div.id = "fn_" + obj.id
  div.innerHTML = `
    <a name="fn_{$obj.id}">
    <p class="footnote" style="font-size:smaller">${num}
    <a target="_blank" href="${obj.dl}">${obj.title}</a> 
    <a title="see in context" href="#_fn_${obj.id}">&#9166</a>
    </p>
    <blockquote style="font-family:italic">
    ${obj.quote}
    </blockquote>`

  let body = document.querySelector('body') as HTMLElement    
  body.appendChild(div)
}

function installFootnotesContainer() {
  let footnotesContainer = document.createElement('div')
  footnotesContainer.setAttribute("id", "footnotesContainer")
  let footnotesHeader = document.createElement("h2")
  footnotesHeader.innerHTML = "Footnotes"
  footnotesContainer.appendChild(footnotesHeader)
  footnotesElement().appendChild(footnotesContainer)
}

function footnotesElement() : HTMLElement {
  let element = document.querySelector('#HypothesisFootnotes') as HTMLElement
  if (element) {
    return element
  }
  else {
    return document.querySelector('body') as HTMLElement
  }
}

/*
A page may include many hyp.is urls. The script makes a corresponding number
of Hypothesis API requests. Without this wrapper, if any request should fail,
Promise.all will immediately reject. This ensures that such a rejection won't
prevent a full set of responses.
*/
function settle(promises:Promise<any>[]) {
  let alwaysFulfilled = promises.map(function(p) {
    return p.then(
      function onFulfilled(value) {
        return { state: "fulfilled", value: value };
      },
      function onRejected(reason) {
        console.log("settle: rejected promise", reason);
        return { state: "rejected", reason: reason };
      }
    );
  });
  return Promise.all(alwaysFulfilled);
}

HypothesisFootnotes();