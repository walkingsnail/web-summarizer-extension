function getPageText() {
  let article = document.querySelector("article") || document.body;
  return article.innerText;
}

chrome.runtime.sendMessage({
  action: "summarize",
  content: getPageText()
});